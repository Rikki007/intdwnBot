const { Telegraf } = require('telegraf');
const config = require('../config');
const logger = require('../utils/logger');

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
            const welcome = `
👋 <b>Добро пожаловать в Autopost Bot!</b>

Я автоматически публикую контент из RSS и HTML источников в ваш канал.

📋 <b>Доступные команды:</b>

<code>/add_source</code> — добавить новый источник
<code>/list_sources</code> — список всех источников
<code>/poll</code> — создать опрос в канале
<code>/status</code> — статистика бота
<code>/parse</code> — запустить парсинг вручную
<code>/toggle_source</code> — включить/выключить источник
<code>/remove_source</code> — удалить источник
<code>/clear_all_sources</code> — полная очистка всех данных
<code>/chatid</code> — показать ID текущего чата
<code>/help</code> — показать эту справку

Для начала работы добавьте источник командой <code>/add_source</code>
            `.trim();

            await ctx.reply(welcome, { parse_mode: 'HTML' });
        });

        // /help command
        this.bot.command('help', async (ctx) => {
            const help = `
📖 <b>Справка по командам Autopost Bot</b>

<b>Управление источниками:</b>
<code>/add_source &lt;type&gt; &lt;url&gt; [name]</code>
<code>/list_sources</code> — список источников
<code>/toggle_source &lt;id&gt;</code> — включить/выключить
<code>/remove_source &lt;id&gt;</code> — удалить источник
<code>/clear_all_sources</code> — очистить всё

<b>Публикация:</b>
<code>/poll "Вопрос?" Вариант1 Вариант2 ...</code>
<code>/parse</code> — запустить парсинг вручную

<b>Информация:</b>
<code>/status</code> — статистика
<code>/chatid</code> — ID чата

<b>Примеры:</b>

<code>/add_source rss https://example.com/feed.xml "Название"</code>

<code>/add_source html https://example.com/news "Название"</code>

<code>/poll "Как вам бот?" Отлично Хорошо Нормально</code>
            `.trim();

            await ctx.reply(help, { parse_mode: 'HTML' });
        });
    }

    /**
     * Send message to channel (HTML)
     */
    async sendToChannel(text, options = {}) {
        try {
            if (!text) {
                throw new Error('Cannot send empty message');
            }

            logger.info(`[Send] Пытаюсь отправить сообщение длиной ${text.length} символов`);

            const message = await this.bot.telegram.sendMessage(this.channelId, text, {
                parse_mode: options.parseMode || 'HTML',
                reply_markup: options.replyMarkup,
                disable_web_page_preview: options.disablePreview ?? false, // используем nullish coalescing
                link_preview_options: options.linkPreviewOptions || undefined, // на будущее
            });

            logger.info(`✅ Сообщение успешно отправлено в канал: ${message.message_id}`);
            // Логируем первые 500 символов для отладки (не весь текст)
            logger.debug(
                'Отправленный текст (начало):',
                text.substring(0, 500) + (text.length > 500 ? '...' : '')
            );

            return message;
        } catch (error) {
            logger.error('❌ Ошибка при отправке сообщения в канал:');
            logger.error(`   Текст ошибки: ${error.message}`);
            logger.error(`   Код ошибки: ${error.code || error.response?.error_code}`);
            logger.error(`   Описание: ${error.description || error.response?.description}`);

            // Логируем проблемный текст (без повторного экранирования)
            logger.error(`   Проблемный текст (начало): ${text.substring(0, 400)}...`);

            if (error.stack) {
                logger.error('   Stack:', error.stack);
            }

            throw error;
        }
    }

    /**
     * Send photo to channel with caption (HTML)
     */
    async sendPhotoToChannel(photoUrl, caption = '', options = {}) {
        if (!photoUrl) {
            throw new Error('Photo URL is required');
        }

        // Защита от слишком маленьких/невалидных изображений BBC
        if (
            photoUrl.includes('/240/') ||
            photoUrl.includes('width=240') ||
            photoUrl.includes('height=240')
        ) {
            logger.warn(`[Photo] Пропускаем слишком маленькое изображение: ${photoUrl}`);
            // Падаем обратно на обычный текст
            return this.sendToChannel(caption);
        }

        try {
            const message = await this.bot.telegram.sendPhoto(this.channelId, photoUrl, {
                caption: caption || undefined,
                parse_mode: options.parseMode || 'HTML',
                disable_notification: options.disableNotification ?? false,
            });

            logger.info(`📸 Фото успешно отправлено: ${message.message_id}`);
            return message;
        } catch (error) {
            logger.error('❌ Ошибка при отправке фото в канал:', error.message);
            logger.error(`   Photo URL: ${photoUrl}`);

            // Если ошибка связана с фото — отправляем только текст
            if (caption) {
                logger.info('[Photo] Пробуем отправить только текст из-за ошибки фото');
                return this.sendToChannel(caption);
            }

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
