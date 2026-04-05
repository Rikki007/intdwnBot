const cron = require('node-cron');
const config = require('../config');
const logger = require('../utils/logger');
const sourceService = require('../services/sourceService');
const parserService = require('../services/parserService');
const postService = require('../services/postService');
const queueService = require('../services/queueService');
const botService = require('../bot/botService');

/**
 * Scheduler Service - manages cron jobs
 */
class SchedulerService {
    constructor() {
        this.jobs = new Map();
    }

    /**
     * Initialize and start all scheduled jobs
     */
    init() {
        this.setupParseJob();
        this.setupPublishJob();
        logger.info('Scheduler initialized');
    }

    /**
     * Setup periodic parsing job
     */
    setupParseJob() {
        const cronExpr = config.scheduler.cron;

        const job = cron.schedule(
            cronExpr,
            async () => {
                logger.info('Starting scheduled parsing...');

                try {
                    const sources = await sourceService.getActiveSources();
                    logger.info(`Found ${sources.length} active sources`);

                    for (const source of sources) {
                        try {
                            const items = await parserService.parseSource(source);
                            logger.info(`Parsed ${items.length} items from ${source.url}`);

                            // Add new posts to queue
                            for (const item of items) {
                                await queueService.add('publish_post', {
                                    sourceId: source.id,
                                    data: item,
                                });
                            }
                        } catch (error) {
                            logger.error(`Error parsing source ${source.url}:`, error.message);
                        }
                    }
                } catch (error) {
                    logger.error('Error in parse job:', error);
                }
            },
            {
                scheduled: true,
            }
        );

        this.jobs.set('parse', job);
        logger.info(`Parse job scheduled: ${cronExpr}`);
    }

    /**
     * Setup publish job (processes queue)
     */
    setupPublishJob() {
        // Process queue every minute
        const job = cron.schedule(
            '* * * * *',
            async () => {
                const status = queueService.getStatus();
                if (status.pending > 0) {
                    logger.info(`Processing queue: ${status.pending} jobs`);
                }
            },
            {
                scheduled: true,
            }
        );

        this.jobs.set('publish', job);
        logger.info('Publish job scheduled: every minute');
    }

    /**
     * Stop all jobs
     */
    stopAll() {
        for (const [name, job] of this.jobs) {
            job.stop();
            logger.info(`Job stopped: ${name}`);
        }
    }

    /**
     * Manually trigger parsing
     */
    async triggerParse() {
        logger.info('Manual parse triggered');

        const sources = await sourceService.getActiveSources();

        for (const source of sources) {
            try {
                const items = await parserService.parseSource(source);
                logger.info(`Parsed ${items.length} items from ${source.url}`);

                for (const item of items) {
                    const post = await postService.createPost(source.id, item);

                    if (post) {
                        // Send to channel
                        const text = postService.formatForTelegram(post);
                        await botService.sendToChannel(text);
                    }
                }
            } catch (error) {
                logger.error(`Error parsing source ${source.url}:`, error.message);
            }
        }
    }
}

const schedulerService = new SchedulerService();

module.exports = schedulerService;
