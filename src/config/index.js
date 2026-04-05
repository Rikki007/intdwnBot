require('dotenv').config();

module.exports = {
    // Telegram
    telegram: {
        token: process.env.TELEGRAM_TOKEN,
        channelId: process.env.CHANNEL_ID,
    },

    // Database
    db: {
        path: process.env.DB_PATH || './data/bot.db',
    },

    // Scheduler
    scheduler: {
        cron: process.env.CRON_SCHEDULE || '*/15 * * * *',
    },

    // Queue
    queue: {
        concurrency: parseInt(process.env.QUEUE_CONCURRENCY) || 3,
        retryAttempts: parseInt(process.env.QUEUE_RETRY_ATTEMPTS) || 3,
    },

    // Parser
    parser: {
        timeout: parseInt(process.env.PARSE_TIMEOUT) || 30000,
    },

    // AI settings
    ai: {
        enabled: process.env.AI_ENABLED === 'true',
        provider: process.env.AI_PROVIDER || 'openrouter',
        apiKey: process.env.AI_API_KEY,
        model: process.env.AI_MODEL || 'qwen/qwen3.6-plus:free',
    },
};
