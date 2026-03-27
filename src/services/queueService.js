const { sleep } = require('../utils/helpers');
const logger = require('../utils/logger');
const config = require('../config');

/**
 * Simple in-memory queue for post processing with rate limiting for Telegram
 */
class SimpleQueue {
  constructor() {
    this.queue = [];
    this.processing = false;
    this.handlers = new Map();
    this.lastSendTime = 0;           // для контроля скорости отправки
    this.minDelayMs = 1200;          // 1.2 секунды между сообщениями (безопасно для канала)
  }

  /**
   * Add job to queue
   */
  async add(jobName, data, options = {}) {
    const job = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2),
      name: jobName,
      data,
      attempts: 0,
      maxAttempts: options.retries || config.queue.retryAttempts || 3,
      createdAt: new Date(),
    };

    this.queue.push(job);
    logger.info(`Job added to queue: ${jobName} (${job.id})`);

    if (!this.processing) {
      this.process();
    }
    return job;
  }

  /**
   * Process queue with rate limiting
   */
  async process() {
    if (this.processing || this.queue.length === 0) return;

    this.processing = true;

    while (this.queue.length > 0) {
      const job = this.queue.shift();

      try {
        logger.info(`Processing job: ${job.name} (${job.id})`);

        const handler = this.handlers.get(job.name);
        if (!handler) {
          logger.warn(`No handler for job: ${job.name}`);
          continue;
        }

        // Ожидаем, чтобы не превысить лимит Telegram (~1 msg/sec)
        const now = Date.now();
        const timeSinceLastSend = now - this.lastSendTime;
        if (timeSinceLastSend < this.minDelayMs) {
          await sleep(this.minDelayMs - timeSinceLastSend);
        }

        await handler(job.data);

        this.lastSendTime = Date.now();
        logger.info(`Job completed: ${job.name} (${job.id})`);

      } catch (error) {
        if (error.response && error.response.error_code === 429) {
          const retryAfter = error.response.parameters?.retry_after || 5;
          logger.warn(`Rate limit hit. Waiting ${retryAfter} seconds...`);
          await sleep((retryAfter + 1) * 1000);   // +1 секунда на всякий случай
          // Возвращаем задачу в начало очереди для повтора
          this.queue.unshift(job);
          continue;
        }

        job.attempts++;
        if (job.attempts < job.maxAttempts) {
          logger.warn(`Job failed, retrying (${job.attempts}/${job.maxAttempts}): ${job.name}`);
          this.queue.push(job);
          await sleep(1000 * job.attempts);
        } else {
          logger.error(`Job failed after ${job.attempts} attempts: ${job.name}`, error);
        }
      }
    }

    this.processing = false;
  }

  /**
   * Register job handler
   */
  handle(jobName, handler) {
    this.handlers.set(jobName, handler);
    logger.info(`Handler registered for: ${jobName}`);
  }

  getStatus() {
    return {
      pending: this.queue.length,
      processing: this.processing,
    };
  }

  clear() {
    this.queue = [];
    logger.info('Queue cleared');
  }
}

const queue = new SimpleQueue();
module.exports = queue;