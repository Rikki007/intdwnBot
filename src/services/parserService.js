// src/services/parserService.js
const rssParser = require('../parsers/rssParser');
const htmlParser = require('../parsers/htmlParser');
const logger = require('../utils/logger');

/**
 * Main Parser Service — теперь с вытягиванием полного текста статьи
 */
const parserService = {
    MAX_ITEMS_PER_SOURCE: 3,

    /**
     * Parse source and enrich items with full article text
     */
    async parseSource(source) {
        try {
            let items = [];

            if (source.type === 'rss') {
                items = await rssParser.parse(source.url);
            } else if (source.type === 'html') {
                items = await htmlParser.parseWithCustom(source.url, source.selector || 'article');
            } else {
                throw new Error(`Unknown source type: ${source.type}`);
            }

            logger.info(`Парсер ${source.type} → ${source.url} | найдено ${items.length} статей`);

            // Ограничиваем количество статей
            if (items.length > this.MAX_ITEMS_PER_SOURCE) {
                items = items.slice(0, this.MAX_ITEMS_PER_SOURCE);
            }

            // === НОВОЕ: Вытягиваем полный текст для каждой статьи ===
            const enrichedItems = [];

            for (const item of items) {
                let fullText = null;

                if (item.fullUrl || item.link) {
                    const articleUrl = item.fullUrl || item.link;
                    fullText = await htmlParser.fetchFullArticle(articleUrl);
                }

                enrichedItems.push({
                    ...item,
                    fullContent: fullText || item.content || item.description || '',
                });
            }

            logger.info(
                `Источник ${source.url} → обогащено полным текстом ${enrichedItems.length} статей`
            );

            return enrichedItems;
        } catch (error) {
            logger.error(`Error parsing source ${source.url}:`, error.message);
            throw error;
        }
    },

    async getSourceInfo(source) {
        if (source.type === 'rss') {
            return await rssParser.getFeedInfo(source.url);
        }
        return null;
    },
};

module.exports = parserService;
