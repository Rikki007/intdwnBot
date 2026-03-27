const { Telegraf, Markup } = require('telegraf');
const config = require('../config');
const logger = require('../utils/logger');

/**
 * Telegram Bot Service
 */
class BotService {
 constructor() {
 this.bot = null;
 this.channelId = config.telegram.channelId;
 }

 /**
 * Initialize bot
 */
 init() {
 this.bot = new Telegraf(config.telegram.token);
 this.setupCommands();
 this.setupErrorHandling();
 logger.info('Telegram bot initialized');
 return this.bot;
 }

 /**
 * Setup bot commands
 */
 setupCommands() {
 // /start command
 this.bot.command('start', async (ctx) => {
  const welcome = `👋 *Добро пожаловать в Autopost Bot!*

Я помогу автоматически публиковать контент из RSS и HTML источников.

📋 *Команды:*
/add_source — добавить источник
/list_sources — список источников
/post — создать пост
/poll — создать опрос
/status — статистика бота
/help — помощь`;

  await ctx.reply(welcome, { parse_mode: 'Markdown' });
});

// /help command
this.bot.command('help', async (ctx) => {
  const help = `📖 *Справка*

• /add_source — добавление RSS или HTML источника
• /list_sources — просмотр всех источников  
• /post — отправить пост в канал
• /poll — создать опрос
• /status — статистика бота

*Пример добавления RSS:*
/add_source rss https://example.com/feed.xml Название

*Пример добавления HTML:*
/add_source html https://example.com/blog Blog article`;

  await ctx.reply(help, { parse_mode: 'Markdown' });
});
 }

 /**
 * Send message to channel
 */
 async sendToChannel(text, options = {}) {
 try {
 const message = await this.bot.telegram.sendMessage(
 this.channelId,
 text,
 {
 parse_mode: options.parseMode || 'Markdown',
 reply_markup: options.replyMarkup,
 disable_web_page_preview: options.disablePreview || false,
 }
 );
 logger.info(`Message sent to channel: ${message.message_id}`);
 return message;
 } catch (error) {
 logger.error('Error sending to channel:', error.message);
 throw error;
 }
 }

 /**
 * Send photo to channel
 */
 async sendPhotoToChannel(photoUrl, caption = '', options = {}) {
 try {
 const message = await this.bot.telegram.sendPhoto(
 this.channelId,
 photoUrl,
 {
 caption,
 parse_mode: options.parseMode || 'Markdown',
 reply_markup: options.replyMarkup,
 }
 );
 logger.info(`Photo sent to channel: ${message.message_id}`);
 return message;
 } catch (error) {
 logger.error('Error sending photo to channel:', error.message);
 throw error;
 }
 }

 /**
 * Send poll to channel
 */
 async sendPollToChannel(question, options) {
 try {
 const message = await this.bot.telegram.sendPoll(
 this.channelId,
 question,
 options.options,
 {
 is_anonymous: options.isAnonymous !== false,
 allows_multiple_answers: options.multipleAnswers || false,
 }
 );
 logger.info(`Poll sent to channel: ${message.message_id}`);
 return message;
 } catch (error) {
 logger.error('Error sending poll to channel:', error.message);
 throw error;
 }
 }

 /**
 * Setup error handling
 */
 setupErrorHandling() {
 this.bot.catch((err, ctx) => {
 logger.error('Bot error:', err);
 ctx.reply('❌ Произошла ошибка').catch(() => {});
 });
 }

 /**
 * Start bot
 */
 async start() {
 await this.bot.launch();
 logger.info('Telegram bot started');
 }

 /**
 * Stop bot
 */
 stop() {
 this.bot.stop();
 logger.info('Telegram bot stopped');
 }

 /**
 * Get bot instance
 */
 getBot() {
 return this.bot;
 }
}

// Singleton
const botService = new BotService();

module.exports = botService;
