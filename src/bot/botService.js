const { Telegraf, Markup } = require('telegraf');
const config = require('../config');
const logger = require('../utils/logger');
const { markdownV2Escape } = require('../utils/markdown');

/**
 * Telegram Bot Service
 */
class BotService {
    constructor() {
        this.bot = null;
        this.channelId = config.telegram.channelId;
        this.aiService = require('../services/aiService');
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
/poll — создать опрос
/status — статистика бота
/help — помощь`;

            const safeText = markdownV2Escape(welcome);

            await ctx.reply(safeText, { parse_mode: 'MarkdownV2' });
        });

        // /help command
        this.bot.command('help', async (ctx) => {
            const help = `📖 *Справка*

/add_source - добавление RSS или HTML источника
/list_sources - просмотр всех источников
/poll - создать опрос
/status - статистика бота
/parse - ручной парсинг
/toggle_source - приостановка/запуск постинга

*Примеры добавления:*

/add_source rss https://example.com/feed.xml Название

/add_source html https://example.com/blog Blog article`;

            const safeText = markdownV2Escape(help);

            await ctx.reply(safeText, { parse_mode: 'MarkdownV2' });
        });
    }

    /**
     * Send message to channel
     */
    async sendToChannel(text, options = {}) {
        try {
            const safeText = markdownV2Escape(text);

            const message = await this.bot.telegram.sendMessage(this.channelId, safeText, {
                parse_mode: options.parseMode || 'MarkdownV2',
                reply_markup: options.replyMarkup,
                disable_web_page_preview: options.disablePreview || false,
            });
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
            const safeCaption = markdownV2Escape(caption);

            const message = await this.bot.telegram.sendPhoto(this.channelId, photoUrl, {
                caption: safeCaption,
                parse_mode: options.parseMode || 'MarkdownV2', // ← поменяли дефолт
                reply_markup: options.replyMarkup,
            });
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
            // Вопрос в опросе не поддерживает форматирование, оставляем как есть
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
