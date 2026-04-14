// src/services/queueService.js
const { sleep } = require('../utils/helpers');
const logger = require('../utils/logger');
const postDao = require('../db/postDao');

/**
 * Улучшенная очередь публикаций с умным rate limiting для Telegram
 * Решает проблему 429 Too Many Requests
 */
class SimpleQueue {
    constructor() {
        this.queue = [];
        this.processing = false;
        this.lastSendTime = 0;
        this.minDelayMs = 2200;
        this.consecutiveErrors = 0;
        this.baseDelayAfter429 = 3000;
    }

    /**
     * Добавить задачу в очередь
     */
    async add(jobName, data, options = {}) {
        const job = {
            id: Date.now().toString(36) + Math.random().toString(36).slice(2),
            name: jobName,
            data,
            attempts: 0,
            maxAttempts: options.retries || 3,
            createdAt: new Date(),
        };

        this.queue.push(job);
        logger.info(`[Queue] Добавлена задача: ${jobName} (${job.id})`);

        if (!this.processing) {
            this.process();
        }
        return job;
    }

    /**
     * Основной цикл обработки очереди
     */
    async process() {
        if (this.processing || this.queue.length === 0) return;
        this.processing = true;

        while (this.queue.length > 0) {
            const job = this.queue.shift();

            try {
                if (job.name === 'ai_process') {
                    await this.handleAiProcess(job);
                } else if (job.name === 'publish_post') {
                    await this.handlePublish(job);
                }
            } catch (error) {
                job.attempts++;

                if (
                    error.code === 429 ||
                    error.message?.includes('429') ||
                    error.description?.includes('Too Many Requests')
                ) {
                    const retryAfter = this.extractRetryAfter(error) * 1000 || 10000;
                    this.consecutiveErrors++;

                    logger.warn(
                        `[RateLimit] 429 от Telegram. Ждём ${Math.ceil(retryAfter / 1000)} сек (ошибка #${this.consecutiveErrors})`
                    );

                    await sleep(retryAfter + this.baseDelayAfter429);
                    this.queue.unshift(job);
                    continue;
                }

                logger.warn(
                    `[Queue] Задача ${job.name} (#${job.id}) упала. Попытка ${job.attempts}/${job.maxAttempts}`
                );

                if (job.attempts < job.maxAttempts) {
                    this.queue.push(job);
                    await sleep(3000 * job.attempts);
                } else {
                    logger.error(
                        `[Queue] Задача ${job.name} (#${job.id}) окончательно провалилась`,
                        error
                    );
                    if (job.data.postId) {
                        await postDao.updateStatus(
                            job.data.postId,
                            'publish_failed',
                            error.message
                        );
                    }
                }
            }

            // === УМНАЯ ПАУЗА ПОСЛЕ КАЖДОГО ПОСТА ===
            const now = Date.now();
            let delay = this.minDelayMs;

            // Если недавно были ошибки 429 — делаем паузу больше
            if (this.consecutiveErrors > 0) {
                delay = Math.max(delay, 2800);
            }

            if (now - this.lastSendTime < delay) {
                await sleep(delay - (now - this.lastSendTime));
            }

            this.lastSendTime = Date.now();
        }

        this.processing = false;
        this.consecutiveErrors = Math.max(0, this.consecutiveErrors - 1); // плавно снижаем счётчик
    }

    /**
     * Извлекаем время ожидания из ошибки 429
     */
    extractRetryAfter(error) {
        if (error.description) {
            const match = error.description.match(/retry after (\d+)/i);
            if (match) return parseInt(match[1]);
        }
        return 5; // по умолчанию 5 секунд
    }

    /**
     * Обработка AI
     */
    async handleAiProcess(job) {
        const { postId } = job.data;
        const postService = require('./postService');
        await postService.processAi(postId);
    }

    /**
     * Публикация поста
     */
    async handlePublish(job) {
        const { postId, post } = job.data;
        const botService = require('../bot/botService');
        const postService = require('./postService');

        const text = postService.formatForTelegram(post);

        if (post.image_url) {
            await botService.sendPhotoToChannel(post.image_url, text);
        } else {
            await botService.sendToChannel(text);
        }

        await postDao.updateStatus(postId, 'published');
        logger.info(`[Publish] Пост ${postId} успешно опубликован`);

        this.consecutiveErrors = 0; // сброс при успехе
    }

    getStatus() {
        return {
            pending: this.queue.length,
            processing: this.processing,
            consecutive429: this.consecutiveErrors,
        };
    }
}

// Singleton
const queue = new SimpleQueue();
module.exports = queue;
