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

            const items = (feed.items || []).map((item) => ({
                title: item.title?.trim() || '',
                link: item.link || item.guid || '',
                content:
                    item.contentSnippet?.trim() ||
                    item.content?.trim() ||
                    item.description?.trim() ||
                    '',
                description: item.contentSnippet || item.description || '',
                imageUrl:
                    item.mediaGroup?.['media:thumbnail']?.[0]?.$?.url ||
                    item.mediaThumbnail?.$.url ||
                    item.enclosure?.url ||
                    null,
                pubDate: item.pubDate || item.isoDate || null,
                videoId: item.link ? item.link.split('v=')[1] || '' : '',
            }));

            logger.info(`RSS parsed: ${url}, found ${items.length} items`);
            return items;
        } catch (error) {
            logger.error(`Error parsing RSS ${url}:`, error.message);

            if (error.message.includes('404') || error.message.includes('Not Found')) {
                throw new Error('YouTube RSS feed temporarily unavailable (404). Try again later.');
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
