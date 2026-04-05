// src/services/aiService.js
const axios = require('axios');
const logger = require('../utils/logger');
const config = require('../config');

/**
 * Universal AI service via OpenRouter 
 */
class AiService {
    constructor() {
        this.enabled = config.ai?.enabled === true;
        this.provider = config.ai?.provider || 'openrouter';
        this.apiKey = config.ai?.apiKey;
        this.model = config.ai?.model || 'qwen/qwen3.6-plus:free';

        if (this.enabled && !this.apiKey) {
            logger.warn('AI_API_KEY не указан в .env — AI отключён');
        }

        logger.info(`AI Service initialized: ${this.provider} | model: ${this.model}`);
    }

    async chat(message) {
        if (!this.enabled || !this.apiKey) {
            return '❌ AI не настроен. Проверь AI_ENABLED и AI_API_KEY в .env';
        }

        const maxRetries = 3;
        const baseDelay = 20000;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                logger.info(`[AI] Запрос к ${this.model} (попытка ${attempt}/${maxRetries})`);

                const response = await axios.post(
                    'https://openrouter.ai/api/v1/chat/completions',
                    {
                        model: this.model,
                        messages: [{ role: 'user', content: message }],
                        temperature: 0.7,
                        max_tokens: 1200,
                    },
                    {
                        headers: {
                            Authorization: `Bearer ${this.apiKey}`,
                            'HTTP-Referer': 'https://github.com/yourname/telegram-autopost-bot',
                            'X-Title': 'Telegram Autopost Bot',
                            'Content-Type': 'application/json',
                        },
                        timeout: 180000,
                    }
                );

                const aiReply = response.data.choices?.[0]?.message?.content?.trim();

                if (aiReply) {
                    logger.info(`[AI] Успешно получен ответ (${aiReply.length} символов)`);
                    return aiReply;
                }

                return 'AI вернул пустой ответ.';
            } catch (error) {
                const status = error.response?.status;
                const errorMsg = error.response?.data?.error?.message || error.message;

                logger.error(
                    `OpenRouter ошибка (попытка ${attempt}): Status=${status} | ${errorMsg}`
                );

                // === PROCESSING 429 (Rate Limit) ===
                if (status === 429) {
                    const retryAfter =
                        error.response?.headers?.['retry-after'] || attempt * baseDelay;

                    logger.warn(
                        `[AI] Rate limit 429. Ждём ${Math.ceil(retryAfter / 1000)} секунд...`
                    );

                    await new Promise((r) => setTimeout(r, retryAfter));
                    continue;
                }

                // === Timeout or other errors ===
                if (attempt < maxRetries) {
                    const delay = baseDelay * attempt; // exponential backoff
                    logger.warn(`[AI] Ошибка. Повтор через ${delay / 1000} сек...`);
                    await new Promise((r) => setTimeout(r, delay));
                    continue;
                }
            }
        }

        logger.error(`[AI] Не удалось получить ответ после ${maxRetries} попыток`);
        return `❌ AI временно недоступен. Пост будет опубликован без переписывания.`;
    }

    async rewritePost(post) {
        if (!this.enabled || !this.apiKey) {
            logger.warn('[Мозг] AI отключён — возвращаем оригинал');
            return post;
        }

        const prompt = `Ты — научный редактор Telegram-канала про нейронауку и психологию.

Тебе пришла англоязычная статья. Сделай качественный перевод на русский язык.

Требования:
- Переведи заголовок на естественный, кликабельный русский.
- Сделай полный перевод всей статьи, сохраняя научную точность.
- Стиль: живой, увлекательный, научно-популярный.
- Длина: длина текста должна составлять ~850–1000 символов).

Ответ верни **строго** в формате:

ЗАГОЛОВОК: [русский заголовок]

ТЕКСТ:
[полный перевод статьи]

Оригинальный заголовок: ${post.title || ''}
Оригинальный текст:
${post.content || post.description || ''}
`;

        try {
            const response = await this.chat(prompt);

            const titleMatch = response.match(/ЗАГОЛОВОК:\s*(.+?)(?=ТЕКСТ:|$)/is);
            const textMatch = response.match(/ТЕКСТ:\s*([\s\S]+)/is);

            const newTitle = titleMatch ? titleMatch[1].trim() : post.title;
            const fullText = textMatch ? textMatch[1].trim() : response; // fallback

            logger.info(
                `[Мозг] Переведена статья "${newTitle.slice(0, 60)}..." (${fullText.length} символов)`
            );

            return {
                ...post,
                title: newTitle,
                content: fullText,
                isAiProcessed: true,
            };
        } catch (error) {
            logger.error('[Мозг] Ошибка переписывания:', error.message);
            return post;
        }
    }
}

const aiService = new AiService();
module.exports = aiService;
