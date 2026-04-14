/**
 * Telegram Autopost Bot - Main entry point
 */

const config = require('./config');
const logger = require('./utils/logger');
const { initDatabase, closeDatabase } = require('./db/index');
const botService = require('./bot/botService');
const setupBotHandlers = require('./bot/handlers');
const schedulerService = require('./scheduler');

/**
 * Setup queue (новая версия — обработчики больше не нужны)
 */
function setupQueue() {
    logger.info('Queue initialized with smart Telegram rate limiting');
}

/**
 * Main startup function
 */
async function main() {
    try {
        logger.info('='.repeat(60));
        logger.info('Starting Telegram Autopost Bot...');
        logger.info('='.repeat(60));

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

        // Initialize scheduler (parse only)
        schedulerService.init();

        // Start bot
        await botService.start();

        logger.info('Bot is running successfully!');
        logger.info(`Channel: ${config.telegram.channelId}`);
        logger.info(`Cron schedule: ${config.scheduler.cron}`);

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
