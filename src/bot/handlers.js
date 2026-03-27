const { Markup } = require('telegraf');
const sourceService = require('../services/sourceService');
const postService = require('../services/postService');
const botService = require('../bot/botService');
const logger = require('../utils/logger');
const { markdownV2Escape } = require('../utils/markdown');

/**
 * Setup additional bot commands and handlers
 */
function setupBotHandlers(bot) {
 // State for conversation handling
 const userStates = new Map();

 // /add_source command
 bot.command('add_source', async (ctx) => {
 const args = ctx.message.text.split(' ').slice(1);

 if (args.length<2) {
 await ctx.reply(
 '📝 *Использование:*\n`/add_source<type><url> [name] [selector]`\n\n' +
 '*Примеры:*\n' +
 '/add\_source rss https://example.com/feed.xml Мой RSS\n' +
 '/add\_source html https://example.com/blog Blog article',
 { parse_mode: 'Markdown' }
 );
 return;
 }

 const [type, url, name, selector] = args;

 try {
 const source = await sourceService.addSource(type, url, name, selector);
 await ctx.reply(
 `✅ *Источник добавлен!*\n\nТип: ${type}\nURL: ${url}`,
 { parse_mode: 'Markdown' }
 );
 } catch (error) {
 await ctx.reply(`❌ Ошибка: ${error.message}`);
 }
 });

 // /post command
 bot.command('post', async (ctx) => {
 const text = ctx.message.text.split('/post ')[1];

 if (!text) {
 await ctx.reply(
 '📝 *Использование:*\n`/post<текст>`\n\n' +
 'Пример: /post Привет, мир!',
 { parse_mode: 'Markdown' }
 );
 return;
 }

 try {
 await botService.sendToChannel(generated);
 await ctx.reply('✅ Пост опубликован!');
 } catch (error) {
 logger.error('Error publishing post:', error);
 await ctx.reply(`❌ Ошибка: ${error.message}`);
 }
 });

 // /poll command
   // /poll command — создание опроса с поддержкой кавычек
  bot.command('poll', async (ctx) => {
    const fullText = ctx.message.text.trim();

    // Убираем команду /poll
    let textAfterCommand = fullText.replace(/^\/poll\s+/, '').trim();

    if (!textAfterCommand) {
      await ctx.reply(
        '📝 *Использование:*\n' +
        '`/poll "Вопрос с пробелами?" Вариант1 Вариант2 Вариант3`\n\n' +
        '*Пример:*\n' +
        '/poll "Как вам сегодня погода?" Отлично Нормально Плохо Ужасно',
        { parse_mode: 'Markdown' }
      );
      return;
    }

    let question = '';
    let options = [];

    // Если вопрос в кавычках — берём его полностью
    if (textAfterCommand.startsWith('"')) {
      const match = textAfterCommand.match(/^"([^"]+)"\s*(.*)$/);

      if (match) {
        question = match[1].trim();
        const optionsPart = match[2].trim();

        if (optionsPart) {
          options = optionsPart.split(/\s+/).filter(opt => opt.length > 0);
        }
      }
    } 
    // Если кавычек нет — берём первое слово как вопрос (старое поведение)
    else {
      const parts = textAfterCommand.split(/\s+/);
      question = parts[0];
      options = parts.slice(1);
    }

    // Валидация
    if (!question) {
      await ctx.reply('❌ Не указан вопрос для опроса');
      return;
    }

    if (options.length < 2) {
      await ctx.reply('❌ Нужно минимум 2 варианта ответа');
      return;
    }

    if (options.length > 10) {
      await ctx.reply('❌ Максимум 10 вариантов ответа');
      return;
    }

    try {
      await botService.sendPollToChannel(question, {
        options: options,
        isAnonymous: true,
        multipleAnswers: false,
      });

      await ctx.reply('✅ Опрос успешно опубликован в канал!');
      logger.info(`Poll created: "${question}" with ${options.length} options`);
    } catch (error) {
      logger.error('Error publishing poll:', error);
      await ctx.reply(`❌ Не удалось опубликовать опрос: ${error.message}`);
    }
  });

// /list_sources command
bot.command('listsources', async (ctx) => {
  try {
    const sources = await sourceService.getSources();

    if (sources.length === 0) {
      await ctx.reply('📭 Нет источников. Добавьте /add_source');
      return;
    }

    let text = '📰 *Список источников:*\n\n';

    for (const source of sources) {
      const status = source.is_active ? '✅' : '❌';
      const name = markdownV2Escape(source.name || 'Без названия');
      const type = markdownV2Escape(source.type.toUpperCase());
      const url = markdownV2Escape(source.url);
      const id = markdownV2Escape(source.id);

      text += `${status} *${name}*\n`;
      text += `Тип: ${type}\n`;
      text += `URL: ${url}\n`;
      text += `ID: \`${id}\`\n\n`;   // backtick оставляем — он начинает inline code
    }

    await ctx.reply(text, { 
      parse_mode: 'MarkdownV2' 
    });

  } catch (error) {
    logger.error('Error in /list_sources:', error);
    await ctx.reply('❌ Ошибка при получении списка источников');
  }
});

 // /remove_source command
 bot.command('remove_source', async (ctx) => {
 const args = ctx.message.text.split(' ').slice(1);

 if (args.length<1) {
 await ctx.reply('📝 *Использование:*\n`/remove_source<id>`\n\nID можно узнать через /list\_sources');
 return;
 }

 const sourceId = args[0];

 try {
 await sourceService.deleteSource(sourceId);
 await ctx.reply('✅ Источник удалён!');
 } catch (error) {
 await ctx.reply(`❌ Ошибка: ${error.message}`);
 }
 });

 // /clear_all_sources — полная очистка всех источников
  bot.command('clear_all_sources', async (ctx) => {
    await ctx.reply('🗑️ Выполняю полную очистку всех источников и постов...');

    try {
      const result = await sourceService.clearAllSources();
      
      // Безопасный текст для MarkdownV2
      const text = 
`✅ *Очистка завершена\\!*

Удалено источников: *${result.message.split(': ')[1] || '0'}*

Теперь можно добавлять новые источники с помощью /add\\_source`;

      await ctx.reply(text, { parse_mode: 'MarkdownV2' });
      
      logger.info(`All sources cleared. Removed ${result.message.split(': ')[1] || '0'} sources.`);
    } catch (error) {
      logger.error('Clear all sources failed:', error);
      await ctx.reply(`❌ Ошибка при очистке: ${error.message}`);
    }
  });

 // /toggle_source command
 bot.command('toggle_source', async (ctx) => {
 const args = ctx.message.text.split(' ').slice(1);

 if (args.length<1) {
 await ctx.reply('📝 *Использование:*\n`/toggle_source<id>`');
 return;
 }

 const sourceId = args[0];

 try {
 await sourceService.toggleSource(sourceId);
 await ctx.reply('✅ Статус источника изменён!');
 } catch (error) {
 await ctx.reply(`❌ Ошибка: ${error.message}`);
 }
 });

 // /parse command - manual parse
 bot.command('parse', async (ctx) => {
 await ctx.reply('🔄 Запускаю парсинг...');

 try {
 const scheduler = require('../scheduler/index');
 await scheduler.triggerParse();
 await ctx.reply('✅ Парсинг завершён!');
 } catch (error) {
 logger.error('Error in manual parse:', error);
 await ctx.reply(`❌ Ошибка: ${error.message}`);
 }
 });

   // /status command — статистика бота
  bot.command('status', async (ctx) => {
    try {
      const [postCount, sources] = await Promise.all([
        postService.getPostCount(),
        sourceService.getSources()
      ]);

      const activeSources = sources.filter(s => s.is_active === 1 || s.is_active === true).length;

      const statusText = 
`📊 *Статистика бота*

📰 Всего источников: *${sources.length}*
✅ Активных: *${activeSources}*
📝 Опубликовано постов: *${postCount}*

⏰ Сейчас: ${new Date().toLocaleString('ru-RU')}`;

      await ctx.reply(statusText, { parse_mode: 'Markdown' });

    } catch (error) {
      logger.error('Error in /status command:', error);
      await ctx.reply('❌ Не удалось загрузить статистику.');
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
