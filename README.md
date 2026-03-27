# Telegram Autopost Bot

Telegram бот для автоматического постинга контента из RSS и HTML источников.

## Возможности

- ✅ Автоматический постинг контента из RSS/HTML источников
- ✅ Система антидублей (по URL и хешу контента)
- ✅ Очередь задач с ретраем
- ✅ Планировщик (node-cron)
- ✅ Создание опросов
- ✅ Подготовка под AI-генерацию постов
- ✅ Модульная расширяемая архитектура

## Структура проекта

```
telegram-autopost-bot/
├── src/
│ ├── bot/
│ │ ├── botService.js # Telegram бот
│ │ └── handlers.js # Обработчики команд
│ ├── config/
│ │ └── index.js # Конфигурация
│ ├── db/
│ │ ├── index.js # Инициализация SQLite
│ │ ├── sourceDao.js # DAO источников
│ │ ├── postDao.js # DAO постов
│ │ └── logDao.js # DAO логов
│ ├── parsers/
│ │ ├── rssParser.js # RSS парсер
│ │ └── htmlParser.js # HTML парсер
│ ├── scheduler/
│ │ └── index.js # Cron задачи
│ ├── services/
│ │ ├── aiService.js # AI сервис (заглушка)
│ │ ├── parserService.js # Общий парсер
│ │ ├── postService.js # Посты
│ │ ├── queueService.js # Очередь задач
│ │ └── sourceService.js # Источники
│ ├── utils/
│ │ ├── helpers.js # Утилиты
│ │ └── logger.js # Логгер
│ └── index.js # Точка входа
├── .env.example # Пример конфигурации
├── package.json
└── README.md
```

## Установка

```bash
# Клонировать репозиторий
git clone<repo-url>
cd telegram-autopost-bot

# Установить зависимости
npm install
```

## Конфигурация

Скопируйте `.env.example` в `.env` и настройте:

```env
# Telegram
TELEGRAM_TOKEN=your_bot_token_here
CHANNEL_ID=@your_channel_name

# Database
DB_PATH=./data/bot.db

# Scheduler (cron expression)
CRON_SCHEDULE=*/15 * * * *

# Queue
QUEUE_CONCURRENCY=3
QUEUE_RETRY_ATTEMPTS=3

# Parser
PARSE_TIMEOUT=30000

# AI (placeholder)
AI_ENABLED=false
AI_MODEL=gpt-3.5-turbo
```

### Получение Telegram токена

1. Откройте @BotFather в Telegram
2. Отправьте `/newbot`
3. Следуйте инструкциям, получите токен

### Получение Channel ID

- Добавьте бота в канал как администратора
- Используйте @username_to_id_bot или перешлите сообщение из канала в @getidsbot

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
| `/post` | Опубликовать пост |
| `/poll` | Создать опрос |
| `/parse` | Ручной парсинг |
| `/status` | Статистика |
| `/test_ai` | Тест AI генерации |

## Примеры использования

### Добавление RSS источника

```
/add_source rss https://example.com/feed.xml Название
```

### Добавление HTML источника

```
/add_source html https://example.com/blog Blog article
```

### Создание поста

```
/post Привет, мир!
```

### Создание опроса

```
/poll "Как дела?" Хорошо Плохо Отлично
```

## База данных

SQLite база данных автоматически создаётся при первом запуске.

### Таблицы

- **sources** - источники контента
- **posts** - опубликованные посты
- **logs** - логи работы

## Расширение

### Добавление нового парсера

```javascript
// src/parsers/htmlParser.js
htmlParser.registerParser('example.com', async (url) => {
 // Custom parsing logic
 return {
 title: '...',
 content: '...',
 link: url,
 };
});
```

### Подключение AI

```env
AI_ENABLED=true
OPENAI_API_KEY=your_key_here
```

## Лицензия

MIT
