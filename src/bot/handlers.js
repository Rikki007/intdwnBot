// src/bot/handlers.js
const sourceService = require('../services/sourceService');
const postService = require('../services/postService');
const botService = require('../bot/botService');
const logger = require('../utils/logger');
const htmlEscape = require('../utils/htmlEscape');
const postDao = require('../db/postDao');

/**
 * Setup additional bot commands and handlers
 */
function setupBotHandlers(bot) {
    // ====================== /add_source ======================
    bot.command('add_source', async (ctx) => {
        const args = ctx.message.text.split(' ').slice(1);

        if (args.length < 2) {
            const usage = `
📝 <b>Использование:</b>

<code>/add_source &lt;type&gt; &lt;url&gt; [name]</code>

<b>Примеры:</b>
<code>/add_source rss https://example.com/feed.xml Мой RSS</code>
<code>/add_source html https://example.com/blog "Blog article"</code>

<b>Подсказка:</b>
<code>type</code> — rss или html
Если в названии есть пробелы — бери в кавычки
            `.trim();

            await ctx.reply(usage, { parse_mode: 'HTML' });
            return;
        }

        const [type, url, name, selector] = args;

        try {
            await sourceService.addSource(type, url, name, selector);

            const successText = `
✅ <b>Источник успешно добавлен!</b>

Имя: ${htmlEscape(name || '—')}
Тип: ${htmlEscape(type.toUpperCase())}
URL: ${htmlEscape(url)}
            `.trim();

            await ctx.reply(successText, { parse_mode: 'HTML' });
        } catch (error) {
            await ctx.reply(`❌ <b>Ошибка:</b> ${htmlEscape(error.message)}`, {
                parse_mode: 'HTML',
            });
        }
    });

    // ====================== /poll ======================

    bot.command('poll', async (ctx) => {
        const fullText = ctx.message.text.trim();
        let textAfterCommand = fullText.replace(/^\/poll\s+/, '').trim();

        if (!textAfterCommand) {
            const usage = `
📝 <b>Использование команды /poll:</b>

<code>/poll "Вопрос?" "Вариант 1" "Вариант 2" "Вариант с несколькими словами"</code>

<b>Примеры:</b>

<code>/poll "Как вам сегодня погода?" "Отлично" "Нормально" "Плохо" "Ужасно"</code>

<code>/poll "Какой ваш любимый язык программирования?" "JavaScript" "Python" "TypeScript" "Go" "Другой"</code>

<b>Правила:</b>
Вопрос и все варианты должны быть в кавычках <code>" "</code>
Минимум 2 варианта ответа
Максимум 10 вариантов
        `.trim();

            await ctx.reply(usage, { parse_mode: 'HTML' });
            return;
        }

        // Улучшенный парсер с поддержкой кавычек
        const tokens = [];
        let current = '';
        let inQuotes = false;
        let i = 0;

        while (i < textAfterCommand.length) {
            const char = textAfterCommand[i];

            if (char === '"' || char === "'") {
                // поддерживаем и двойные, и одинарные кавычки
                if (inQuotes && textAfterCommand[i - 1] !== '\\') {
                    // закрываем кавычки
                    inQuotes = false;
                    if (current.trim()) tokens.push(current.trim());
                    current = '';
                } else {
                    inQuotes = true; // открываем кавычки
                }
            } else if (char === ' ' && !inQuotes) {
                if (current.trim()) {
                    tokens.push(current.trim());
                    current = '';
                }
            } else {
                current += char;
            }
            i++;
        }

        // Добавляем последний токен, если он есть
        if (current.trim()) {
            tokens.push(current.trim());
        }

        if (tokens.length < 3) {
            // минимум: вопрос + 2 варианта
            await ctx.reply(
                '❌ <b>Ошибка:</b> Нужно указать вопрос и минимум 2 варианта ответа в кавычках',
                { parse_mode: 'HTML' }
            );
            return;
        }

        if (tokens.length > 11) {
            // 1 вопрос + 10 вариантов
            await ctx.reply('❌ <b>Ошибка:</b> Максимум 10 вариантов ответа', {
                parse_mode: 'HTML',
            });
            return;
        }

        const question = tokens[0];
        const options = tokens.slice(1);

        if (options.length < 2) {
            await ctx.reply('❌ <b>Ошибка:</b> Нужно минимум 2 варианта ответа', {
                parse_mode: 'HTML',
            });
            return;
        }

        try {
            await botService.sendPollToChannel(question, {
                options: options,
                isAnonymous: true,
                multipleAnswers: false,
            });

            await ctx.reply(
                `✅ <b>Опрос успешно опубликован в канал!</b>\n\nВопрос: "${htmlEscape(question)}"`,
                { parse_mode: 'HTML' }
            );

            logger.info(`Poll created: "${question}" with ${options.length} options`);
        } catch (error) {
            logger.error('Error publishing poll:', error);
            await ctx.reply(
                `❌ <b>Не удалось опубликовать опрос:</b> ${htmlEscape(error.message)}`,
                { parse_mode: 'HTML' }
            );
        }
    });

    // ====================== /list_sources ======================
    bot.command('list_sources', async (ctx) => {
        try {
            const sources = await sourceService.getSources();

            if (sources.length === 0) {
                await ctx.reply(
                    '📭 <b>Нет добавленных источников.</b>\n\n' +
                        'Добавьте первый источник командой <code>/add_source</code>',
                    { parse_mode: 'HTML' }
                );
                return;
            }

            let text = '📰 <b>Список источников:</b>\n\n';

            for (const source of sources) {
                const status = source.is_active ? '✅' : '❌';
                const name = htmlEscape(source.name || 'Без названия');
                const type = htmlEscape(source.type.toUpperCase());
                const url = htmlEscape(source.url);
                const id = htmlEscape(source.id);

                text += `${status} <b>${name}</b>\n`;
                text += `Тип: <code>${type}</code>\n`;
                text += `URL: ${url}\n`;
                text += `ID: <code>${id}</code>\n\n`;
            }

            await ctx.reply(text, { parse_mode: 'HTML' });
        } catch (error) {
            logger.error('Error in /list_sources:', error);
            await ctx.reply('❌ <b>Ошибка при получении списка источников.</b>', {
                parse_mode: 'HTML',
            });
        }
    });

    // ====================== /remove_source ======================
    bot.command('remove_source', async (ctx) => {
        const args = ctx.message.text.split(' ').slice(1);

        if (args.length < 1) {
            const usage = `
📝 <b>Использование:</b>

<code>/remove_source &lt;id источника&gt;</code>

ID можно узнать с помощью <code>/list_sources</code>
            `.trim();

            await ctx.reply(usage, { parse_mode: 'HTML' });
            return;
        }

        const sourceId = args[0];

        try {
            await sourceService.deleteSource(sourceId);
            await ctx.reply('✅ <b>Источник успешно удалён!</b>', { parse_mode: 'HTML' });
        } catch (error) {
            await ctx.reply(`❌ <b>Ошибка:</b> ${htmlEscape(error.message)}`, {
                parse_mode: 'HTML',
            });
        }
    });

    // ====================== /clear_all_sources ======================
    bot.command('clear_all_sources', async (ctx) => {
        await ctx.reply(
            '🗑️ <b>Выполняю полную очистку...</b>\n\n' +
                'Удаляются все источники и опубликованные посты.',
            { parse_mode: 'HTML' }
        );

        try {
            const result = await sourceService.clearAllSources();
            const removedCount = result.message?.split(': ')[1] || '0';

            const text = `
✅ <b>Очистка успешно завершена!</b>

Удалено источников: <b>${removedCount}</b>

Теперь вы можете добавлять новые источники с помощью команды <code>/add_source</code>
            `.trim();

            await ctx.reply(text, { parse_mode: 'HTML' });
            logger.info(`All sources cleared. Removed ${removedCount} sources.`);
        } catch (error) {
            logger.error('Clear all sources failed:', error);
            await ctx.reply(`❌ <b>Ошибка при очистке:</b> ${htmlEscape(error.message)}`, {
                parse_mode: 'HTML',
            });
        }
    });

    // ====================== /toggle_source ======================
    bot.command('toggle_source', async (ctx) => {
        const args = ctx.message.text.split(' ').slice(1);

        if (args.length < 1) {
            const usage = `
📝 <b>Использование:</b>

<code>/toggle_source &lt;id источника&gt;</code>

ID можно узнать через команду <code>/list_sources</code>
            `.trim();

            await ctx.reply(usage, { parse_mode: 'HTML' });
            return;
        }

        const sourceId = args[0];

        try {
            await sourceService.toggleSource(sourceId);
            await ctx.reply('✅ <b>Статус источника успешно изменён!</b>', { parse_mode: 'HTML' });
        } catch (error) {
            await ctx.reply(`❌ <b>Ошибка:</b> ${htmlEscape(error.message)}`, {
                parse_mode: 'HTML',
            });
        }
    });

    // ====================== /chatid ======================
    bot.command('chatid', async (ctx) => {
        const chatId = ctx.chat.id;
        const chatType = ctx.chat.type;
        const title = ctx.chat.title || 'Личный чат';

        const text = `
📍 <b>Информация о чате</b>

Chat ID: <code>${chatId}</code>
Тип: <code>${chatType}</code>
Название: ${htmlEscape(title)}
        `.trim();

        await ctx.reply(text, { parse_mode: 'HTML' });
        logger.info(`Chat ID requested: ${chatId} (${chatType})`);
    });

    // ====================== /parse ======================
    bot.command('parse', async (ctx) => {
        await ctx.reply('🔄 <b>Запускаю парсинг источников...</b>', { parse_mode: 'HTML' });

        try {
            const scheduler = require('../scheduler/index');
            await scheduler.triggerParse();

            await ctx.reply('✅ <b>Парсинг успешно завершён!</b>', { parse_mode: 'HTML' });
        } catch (error) {
            logger.error('Error in manual parse:', error);
            await ctx.reply(`❌ <b>Ошибка при парсинге:</b> ${htmlEscape(error.message)}`, {
                parse_mode: 'HTML',
            });
        }
    });

    // ====================== /status ======================
    bot.command('status', async (ctx) => {
        try {
            const [totalPosts, sources] = await Promise.all([
                postService.getPostCount(),
                sourceService.getSources(),
            ]);

            const activeSources = sources.filter(
                (s) => s.is_active === 1 || s.is_active === true
            ).length;

            const parsedCount = await postDao.getCountByStatus('parsed');
            const aiProcessingCount = await postDao.getCountByStatus('ai_processing');
            const aiProcessedCount = await postDao.getCountByStatus('ai_processed');
            const aiFailedCount = await postDao.getCountByStatus('ai_failed');
            const publishedCount = await postDao.getCountByStatus('published');
            const publishFailedCount = await postDao.getCountByStatus('publish_failed');

            const now = new Date().toLocaleString('ru-RU');

            const statusText = `
📊 <b>Статистика бота</b>

📰 <b>Источники:</b>
Всего: <b>${sources.length}</b>
Активных: <b>${activeSources}</b>

📝 <b>Посты по статусам:</b>
Ожидают AI: <b>${parsedCount}</b>
AI в процессе: <b>${aiProcessingCount}</b>
После AI: <b>${aiProcessedCount}</b>
Ошибки AI: <b>${aiFailedCount}</b>
Опубликовано: <b>${publishedCount}</b>
Ошибки публикации: <b>${publishFailedCount}</b>

📈 <b>Всего постов:</b> <b>${totalPosts}</b>

⏰ Сейчас: <code>${now}</code>
            `.trim();

            await ctx.reply(statusText, { parse_mode: 'HTML' });
        } catch (error) {
            logger.error('Error in /status command:', error);
            await ctx.reply(
                `❌ <b>Не удалось загрузить статистику:</b>\n${htmlEscape(error.message)}`,
                { parse_mode: 'HTML' }
            );
        }
    });

    // ====================== Callback Queries ======================
    bot.on('callback_query', async (ctx) => {
        const data = ctx.callbackQuery.data;

        if (data.startsWith('source_toggle_')) {
            const sourceId = data.replace('source_toggle_', '');
            await sourceService.toggleSource(sourceId);
            await ctx.answerCallbackQuery('Статус изменён!');
            await ctx.editMessageReplyMarkup(null);
        }
    });
}

module.exports = setupBotHandlers;
