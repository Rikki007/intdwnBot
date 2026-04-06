/**
 * Telegram Autopost Bot
 * Main entry point
 */

const config = require('./config');
const logger = require('./utils/logger');
const { initDatabase, closeDatabase } = require('./db/index');
const botService = require('./bot/botService');
const setupBotHandlers = require('./bot/handlers');
const queueService = require('./services/queueService');
const postService = require('./services/postService');
const schedulerService = require('./scheduler');
const aiService = require('./services/aiService');
const { Markup } = require('telegraf');

/**
 * Setup queue handlers
 */
function setupQueue() {
    queueService.handle('publish_post', async (job) => {
        const { sourceId, data } = job;

        try {
            const post = await Promise.race([
                postService.createPost(sourceId, data),
                new Promise(
                    (_, reject) =>
                        setTimeout(() => reject(new Error('AI processing timeout')), 240000)
                ),
            ]);

            if (!post) {
                logger.info('Duplicate post skipped');
                return;
            }

            const text = postService.formatForTelegram(post);

            if (post.image_url) {
                await botService.sendPhotoToChannel(post.image_url, text);
            } else {
                await botService.sendToChannel(text);
            }

            logger.info(
                `✅ Пост опубликован: ${post.title?.slice(0, 80)}... (${post.content?.length || 0} символов)`
            );
        } catch (error) {
            if (error.message.includes('timeout')) {
                logger.warn(`[Timeout] AI обработка поста превысила лимит времени. Пропускаем.`);
            } else {
                logger.error('Error publishing post:', error.message);
            }
        }
    });

    logger.info('Queue handlers registered (с увеличенным таймаутом для AI)');
}
/**
 * Main startup function
 */
async function main() {
    try {
        logger.info('='.repeat(50));
        logger.info('Starting Telegram Autopost Bot...');
        logger.info('='.repeat(50));

        // Validate config
        if (!config.telegram.token || config.telegram.token === 'your_bot_token_here') {
            throw new Error('TELEGRAM_TOKEN not configured in .env');
        }

        // Initialize database
        initDatabase();

        // Initialize bot
        const bot = botService.init();

        // Setup handlers
        setupBotHandlers(bot);

        // Setup queue
        setupQueue();

        // Initialize scheduler
        schedulerService.init();

        // Start bot
        await botService.start();

        logger.info('Bot is running!');
        logger.info(`Channel: ${config.telegram.channelId}`);
        logger.info(`Cron: ${config.scheduler.cron}`);

        // Graceful shutdown
        process.once('SIGINT', () => {
            logger.info('Shutting down...');
            schedulerService.stopAll();
            botService.stop();
            closeDatabase();
            process.exit(0);
        });

        process.once('SIGTERM', () => {
            logger.info('Shutting down...');
            schedulerService.stopAll();
            botService.stop();
            closeDatabase();
            process.exit(0);
        });
    } catch (error) {
        logger.error('Failed to start bot:', error);
        process.exit(1);
    }
}

main();
