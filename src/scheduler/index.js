// src/scheduler/index.js
const cron = require('node-cron');
const config = require('../config');
const logger = require('../utils/logger');
const sourceService = require('../services/sourceService');
const parserService = require('../services/parserService');
const postService = require('../services/postService');

/**
 * Scheduler Service — только парсинг и создание постов
 */
class SchedulerService {
    constructor() {
        this.jobs = new Map();
    }

    init() {
        this.setupParseJob();
        logger.info('Scheduler initialized (parse only)');
    }

    /**
     * Основной джоб парсинга (каждые 15 минут)
     */
    setupParseJob() {
        const cronExpr = config.scheduler.cron || '*/15 * * * *';

        const job = cron.schedule(
            cronExpr,
            async () => {
                logger.info('🔄 Запущен плановый парсинг источников...');

                try {
                    const sources = await sourceService.getActiveSources();
                    logger.info(`Найдено ${sources.length} активных источников`);

                    let totalNewPosts = 0;

                    for (const source of sources) {
                        try {
                            const items = await parserService.parseSource(source);
                            logger.info(
                                `Парсер ${source.type} → ${source.url} | найдено ${items.length} статей`
                            );

                            for (const item of items) {
                                const post = await postService.createPost(source.id, item);
                                if (post) {
                                    totalNewPosts++;
                                }
                            }
                        } catch (error) {
                            logger.error(`Ошибка парсинга источника ${source.url}:`, error.message);
                        }
                    }

                    logger.info(
                        `Плановый парсинг завершён. Создано новых постов: ${totalNewPosts}`
                    );
                } catch (error) {
                    logger.error('Ошибка в джобе парсинга:', error);
                }
            },
            {
                scheduled: true,
            }
        );

        this.jobs.set('parse', job);
        logger.info(`Парсинг запланирован: ${cronExpr}`);
    }

    /**
     * Ручной парсинг всех активных источников
     */
    async triggerParse() {
        logger.info('🔄 Запущен ручной парсинг всех источников');

        const sources = await sourceService.getActiveSources();
        let totalNewPosts = 0;

        for (const source of sources) {
            try {
                const items = await parserService.parseSource(source);

                for (const item of items) {
                    const post = await postService.createPost(source.id, item);
                    if (post) totalNewPosts++;
                }
            } catch (error) {
                logger.error(`Ошибка парсинга источника ${source.url}:`, error.message);
            }
        }

        return { newPosts: totalNewPosts };
    }

    /**
     * Ручной парсинг одного конкретного источника
     */
    async triggerParseSingle(sourceId) {
        const source = await sourceService.getSource(sourceId);
        if (!source) throw new Error(`Источник ${sourceId} не найден`);

        const items = await parserService.parseSource(source);
        let newPosts = 0;

        for (const item of items) {
            const post = await postService.createPost(source.id, item);
            if (post) newPosts++;
        }

        return { newPosts, sourceId };
    }

    stopAll() {
        for (const [name, job] of this.jobs) {
            job.stop();
            logger.info(`Job stopped: ${name}`);
        }
    }
}

const schedulerService = new SchedulerService();
module.exports = schedulerService;
