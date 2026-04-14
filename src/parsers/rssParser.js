const Parser = require('rss-parser');
const logger = require('../utils/logger');

const parser = new Parser({
    customFields: {
        item: [
            ['media:group', 'mediaGroup'],
            ['media:content', 'mediaContent'],
            ['media:thumbnail', 'mediaThumbnail'],
            ['enclosure', 'enclosure'],
        ],
    },
    timeout: 25000,
    headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; TelegramAutopostBot/1.0)',
        Accept: 'application/rss+xml, application/xml, text/xml',
    },
});

/**
 * RSS Parser Service
 */
const rssParser = {
    async parse(url) {
        try {
            logger.info(`Parsing RSS: ${url}`);

            const feed = await parser.parseURL(url);

            let items = (feed.items || []).map((item) => {
                let imageUrl = null;

                const candidates = [
                    item['media:group']?.['media:content']?.[0]?.$?.url,
                    item['media:group']?.['media:thumbnail']?.[0]?.$?.url,
                    item['media:content']?.[0]?.$?.url,
                    item['media:thumbnail']?.$.url,
                    item.enclosure?.url,
                    item.image?.url,
                ].filter(Boolean);

                for (const candidate of candidates) {
                    if (
                        candidate &&
                        !candidate.includes('/240/') &&
                        !candidate.includes('width=240')
                    ) {
                        imageUrl = candidate;
                        break;
                    }
                }
                if (!imageUrl && candidates.length > 0) imageUrl = candidates[0];

                return {
                    title: item.title?.trim() || '',
                    link: item.link || item.guid || '',
                    content: item.contentSnippet?.trim() || item.description?.trim() || '',
                    description: item.contentSnippet || item.description || '',
                    imageUrl: imageUrl,
                    pubDate: item.pubDate || item.isoDate || null,
                    fullUrl: item.link || item.guid || '', // сохраняем ссылку для полного текста
                };
            });

            // Сортируем по дате (новые сверху)
            items.sort((a, b) => {
                const dateA = a.pubDate ? new Date(a.pubDate) : new Date(0);
                const dateB = b.pubDate ? new Date(b.pubDate) : new Date(0);
                return dateB.getTime() - dateA.getTime();
            });

            logger.info(`RSS parsed: ${url}, found ${items.length} items`);

            return items;
        } catch (error) {
            logger.error(`Error parsing RSS ${url}:`, error.message);
            if (error.message.includes('404') || error.message.includes('Not Found')) {
                throw new Error('RSS feed temporarily unavailable (404). Try again later.', {
                    cause: error,
                });
            }
            throw error;
        }
    },

    async getFeedInfo(url) {
        try {
            const feed = await parser.parseURL(url);
            return {
                title: feed.title || 'YouTube Channel',
                description: feed.description || '',
                link: feed.link || url,
            };
        } catch (error) {
            logger.error(`Error getting RSS feed info ${url}:`, error.message);
            throw error;
        }
    },
};

module.exports = rssParser;
