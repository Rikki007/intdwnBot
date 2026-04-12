const sourceService = require('../services/sourceService');
const postService = require('../services/postService');
const botService = require('../bot/botService');
const logger = require('../utils/logger');
const htmlEscape = require('../utils/htmlEscape');

/**
 * Setup additional bot commands and handlers
 */
function setupBotHandlers(bot) {
        // /add_source command
    // /add_source command
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
• <code>type</code> — rss или html
• Если в названии или селекторе есть пробелы — бери в кавычки
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
        await ctx.reply(
            `❌ <b>Ошибка:</b> ${htmlEscape(error.message)}`, 
            { parse_mode: 'HTML' }
        );
    }
});

    // /poll command
bot.command('poll', async (ctx) => {
    const fullText = ctx.message.text.trim();
    let textAfterCommand = fullText.replace(/^\/poll\s+/, '').trim();

    if (!textAfterCommand) {
        const usage = `
📝 <b>Использование команды /poll:</b>

<code>/poll "Вопрос?" Вариант1 Вариант2 Вариант3</code>

<b>Пример:</b>

<code>/poll "Как вам сегодня погода?" Отлично Нормально Плохо Ужасно</code>

<b>Правила:</b>
• Вопрос должен быть в кавычках <code>" "</code>
• Минимум 2 варианта ответа
• Максимум 10 вариантов
• Варианты разделяются пробелами
        `.trim();

        await ctx.reply(usage, { 
            parse_mode: 'HTML' 
        });
        return;
    }

    let question = '';
    let options = [];

    // Парсинг вопроса в кавычках
    if (textAfterCommand.startsWith('"')) {
        const match = textAfterCommand.match(/^"([^"]+)"\s*(.*)$/);
        if (match) {
            question = match[1].trim();
            const optionsPart = match[2].trim();
            if (optionsPart) {
                options = optionsPart.split(/\s+/).filter(opt => opt.length > 0);
            }
        }
    } else {
        // Если кавычек нет — берём первое слово как вопрос (fallback)
        const parts = textAfterCommand.split(/\s+/);
        question = parts[0];
        options = parts.slice(1);
    }

    if (!question) {
        await ctx.reply('❌ <b>Ошибка:</b> Не указан вопрос для опроса', { 
            parse_mode: 'HTML' 
        });
        return;
    }

    if (options.length < 2) {
        await ctx.reply('❌ <b>Ошибка:</b> Нужно минимум 2 варианта ответа', { 
            parse_mode: 'HTML' 
        });
        return;
    }

    if (options.length > 10) {
        await ctx.reply('❌ <b>Ошибка:</b> Максимум 10 вариантов ответа', { 
            parse_mode: 'HTML' 
        });
        return;
    }

    try {
        await botService.sendPollToChannel(question, {
            options: options,
            isAnonymous: true,
            multipleAnswers: false,
        });

        await ctx.reply('✅ <b>Опрос успешно опубликован в канал!</b>', { 
            parse_mode: 'HTML' 
        });

        logger.info(`Poll created: "${question}" with ${options.length} options`);
    } catch (error) {
        logger.error('Error publishing poll:', error);
        await ctx.reply(
            `❌ <b>Не удалось опубликовать опрос:</b> ${htmlEscape(error.message)}`, 
            { parse_mode: 'HTML' }
        );
    }
});

    // /list_sources command
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
        await ctx.reply(
            '❌ <b>Ошибка при получении списка источников.</b>', 
            { parse_mode: 'HTML' }
        );
    }
});

    // /remove_source command
bot.command('remove_source', async (ctx) => {
    const args = ctx.message.text.split(' ').slice(1);

    if (args.length < 1) {
        const usage = `
📝 <b>Использование:</b>

<code>/remove_source &lt;id источника&gt;</code>

ID источника можно узнать с помощью команды <code>/list_sources</code>
        `.trim();

        await ctx.reply(usage, { 
            parse_mode: 'HTML' 
        });
        return;
    }

    const sourceId = args[0];

    try {
        await sourceService.deleteSource(sourceId);
        await ctx.reply(
            '✅ <b>Источник успешно удалён!</b>', 
            { parse_mode: 'HTML' }
        );
    } catch (error) {
        await ctx.reply(
            `❌ <b>Ошибка:</b> ${htmlEscape(error.message)}`, 
            { parse_mode: 'HTML' }
        );
    }
});

    // /clear_all_sources command
bot.command('clear_all_sources', async (ctx) => {
    await ctx.reply(
        '🗑️ <b>Выполняю полную очистку...</b>\n\n' +
        'Удаляются все источники и опубликованные посты.',
        { parse_mode: 'HTML' }
    );

    try {
        const result = await sourceService.clearAllSources();

        // Извлекаем количество удалённых источников
        const removedCount = result.message.split(': ')[1] || '0';

        const text = `
✅ <b>Очистка успешно завершена!</b>

Удалено источников: <b>${removedCount}</b>

Теперь вы можете добавлять новые источники с помощью команды <code>/add_source</code>
        `.trim();

        await ctx.reply(text, { 
            parse_mode: 'HTML' 
        });

        logger.info(`All sources cleared. Removed ${removedCount} sources.`);
    } catch (error) {
        logger.error('Clear all sources failed:', error);
        await ctx.reply(
            `❌ <b>Ошибка при очистке:</b> ${htmlEscape(error.message)}`, 
            { parse_mode: 'HTML' }
        );
    }
});

    // /toggle_source command
bot.command('toggle_source', async (ctx) => {
    const args = ctx.message.text.split(' ').slice(1);

    if (args.length < 1) {
        const usage = `
📝 <b>Использование:</b>

<code>/toggle_source &lt;id источника&gt;</code>

ID можно узнать через команду <code>/list_sources</code>
        `.trim();

        await ctx.reply(usage, { 
            parse_mode: 'HTML' 
        });
        return;
    }

    const sourceId = args[0];

    try {
        await sourceService.toggleSource(sourceId);
        await ctx.reply(
            '✅ <b>Статус источника успешно изменён!</b>', 
            { parse_mode: 'HTML' }
        );
    } catch (error) {
        await ctx.reply(
            `❌ <b>Ошибка:</b> ${htmlEscape(error.message)}`, 
            { parse_mode: 'HTML' }
        );
    }
});

    // /chatid command
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

    await ctx.reply(text, { 
        parse_mode: 'HTML' 
    });

    logger.info(`Chat ID requested: ${chatId} (${chatType})`);
});

    // /parse command
bot.command('parse', async (ctx) => {
    await ctx.reply(
        '🔄 <b>Запускаю парсинг источников...</b>', 
        { parse_mode: 'HTML' }
    );

    try {
        const scheduler = require('../scheduler/index');
        await scheduler.triggerParse();

        await ctx.reply(
            '✅ <b>Парсинг успешно завершён!</b>', 
            { parse_mode: 'HTML' }
        );
    } catch (error) {
        logger.error('Error in manual parse:', error);
        await ctx.reply(
            `❌ <b>Ошибка при парсинге:</b> ${htmlEscape(error.message)}`, 
            { parse_mode: 'HTML' }
        );
    }
});

    // /status command
bot.command('status', async (ctx) => {
    try {
        const [postCount, sources] = await Promise.all([
            postService.getPostCount(),
            sourceService.getSources(),
        ]);

        const activeSources = sources.filter(
            (s) => s.is_active === 1 || s.is_active === true
        ).length;

        const now = new Date().toLocaleString('ru-RU');

        const statusText = `
📊 <b>Статистика бота</b>

📰 Всего источников: <b>${sources.length}</b>
✅ Активных: <b>${activeSources}</b>
📝 Опубликовано постов: <b>${postCount}</b>

⏰ Сейчас: <code>${now}</code>
        `.trim();

        await ctx.reply(statusText, { 
            parse_mode: 'HTML' 
        });
    } catch (error) {
        logger.error('Error in /status command:', error);
        await ctx.reply(
            `❌ <b>Не удалось загрузить статистику:</b> ${htmlEscape(error.message)}`, 
            { parse_mode: 'HTML' }
        );
    }
});

    // Handle callback queries
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