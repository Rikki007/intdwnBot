# Telegram Autopost Bot

Telegram бот для автоматического постинга контента из RSS и HTML источников.

## Возможности

- ✅ Автоматический постинг контента из RSS/HTML источников
- ✅ Система антидублей (по URL и хешу контента)
- ✅ Очередь задач с ретраем
- ✅ Планировщик (node-cron)
- ✅ Создание опросов
- ✅ AI-генерация/переписывание постов (OpenRouter + Qwen)
- ✅ Модульная расширяемая архитектура

## Структура проекта

```
telegram-autopost-bot/
├── src/
│   ├── bot/
│   │   ├── botService.js
│   │   └── handlers.js
│   ├── config/
│   │   └── index.js
│   ├── db/
│   │   ├── index.js
│   │   ├── postDao.js
│   │   ├── sourceDao.js
│   │   └── logDao.js
│   ├── parsers/
│   │   ├── rssParser.js
│   │   └── htmlParser.js
│   ├── scheduler/
│   │   └── index.js
│   ├── services/
│   │   ├── aiService.js
│   │   ├── parserService.js
│   │   ├── postService.js
│   │   ├── queueService.js
│   │   └── sourceService.js
│   ├── utils/
│   │   ├── helpers.js
│   │   ├── logger.js
│   │   └── markdown.js
│   └── index.js
├── .env
├── package.json
└── README.md
```

## Установка

```bash
# Клонировать репозиторий
git clone<repo-url>
cd telegram-autopost-bot
npm install
```

## Конфигурация

```env
# Telegram
TELEGRAM_TOKEN=your_bot_token_here
CHANNEL_ID=@your_channel

# Database
DB_PATH=./data/bot.db

# Scheduler
CRON_SCHEDULE=*/15 * * * *

# Queue
QUEUE_RETRY_ATTEMPTS=3

# Parser
PARSE_TIMEOUT=30000

# AI (OpenRouter)
AI_ENABLED=true
AI_PROVIDER=openrouter
AI_API_KEY=sk-or-...
AI_MODEL=qwen/qwen3.6-plus:free
```

## Запуск

```bash
# Запуск
npm start

# Режим разработки (с hot-reload)
npm run dev
```

## Команды бота

| Команда | Описание |
|---------|----------|
| `/start` | Приветствие |
| `/help` | Справка |
| `/add_source` | Добавить источник |
| `/list_sources` | Список источников |
| `/remove_source` | Удалить источник |
| `/toggle_source` | Включить/выключить источник |
| `/clear_all_sources` | Полная очистка источников и постов |
| `/poll` | Создать опрос |
| `/parse` | Ручной парсинг |
| `/status` | Статистика |
| `/chatid` | Показать ID текущего чата |

## Примеры использования

```
/add_source rss https://example.com/feed.xml МойКанал

/add_source html https://example.com/blog "Блог" "article"

poll "Как вам сегодня погода?" Отлично Нормально Плохо
```

## База данных

Проект использует better-sqlite3 с включённым WAL mode.
База данных автоматически создаётся в ./data/bot.db.

### Таблицы

- **sources** - источники контента
- **posts** - опубликованные посты
- **logs** - логи работы

### Разраьотка

```
npm run lint
npm run lint:fix
npm run format
npm run format:check
```

## Расширение

### Добавление нового парсера

```javascript
// в htmlParser.js
htmlParser.registerParser('example.com', async (url) => {
  ...
});
```

### Основные особенности реализации

- AI-переписывание: при AI_ENABLED=true каждый новый пост автоматически отправляется на OpenRouter и переписывается в живом научно-популярном стиле (настроено под нейронауку/психологию).
- Антидубли: проверка по URL + по MD5-хешу содержимого.
- Rate limiting: очередь гарантирует паузу минимум 1.2 секунды между отправками в Telegram.
- База данных: SQLite + WAL, индексы по url и hash.

### Разработка

```env
npm run lint
npm run lint:fix
npm run format
```

## Лицензия

MIT
