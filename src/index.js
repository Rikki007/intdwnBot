/**
 * Telegram Autopost Bot
 * Main entry point
 */

const config = require('./config');
const logger = require('./utils/logger');
const { initDatabase, closeDatabase } = require('./db');
const botService = require('./bot/botService');
const setupBotHandlers = require('./bot/handlers');
const queueService = require('./services/queueService');
const postService = require('./services/postService');
const schedulerService = require('./scheduler');

/**
 * Setup queue job handlers
 */
function setupQueue() {
 // Handle post publishing
 queueService.handle('publish_post', async (job) => {
 const { sourceId, data } = job;

 try {
 // Create post in DB
 const post = await postService.createPost(sourceId, data);

 if (!post) {
 logger.info('Duplicate post skipped');
 return;
 }

 // Format and send to channel
 const text = postService.formatForTelegram(post);

 if (post.image_url) {
 await botService.sendPhotoToChannel(post.image_url, text);
 } else {
 await botService.sendToChannel(text);
 }

 logger.info(`Post published: ${post.title}`);
 } catch (error) {
 logger.error('Error publishing post:', error);
 throw error;
 }
 });

 logger.info('Queue handlers registered');
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

// Start
main();
