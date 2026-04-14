const axios = require('axios');
const cheerio = require('cheerio');
const logger = require('../utils/logger');
const config = require('../config');

/**
 * HTML Parser Service
 */
const htmlParser = {
    /**
     * Parse HTML page and extract content
     */
    async fetchFullArticle(url) {
        try {
            logger.info(`Fetching full article: ${url}`);

            const response = await axios.get(url, {
                timeout: config.parser.timeout || 30000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (compatible; TelegramAutopostBot/1.0)',
                },
            });

            const $ = cheerio.load(response.data);

            // Универсальные селекторы для научных и психологических сайтов
            const contentSelectors = [
                'article', // общий
                '.post-content', // PsyPost
                '.entry-content', // многие WordPress
                '.article-body', // Neuroscience News
                '.content', // общий
                '.td-post-content', // другие
                'main article', // ещё вариант
            ];

            let fullText = '';

            for (const selector of contentSelectors) {
                const element = $(selector);
                if (element.length > 0) {
                    // Удаляем ненужные элементы (реклама, скрипты, кнопки и т.д.)
                    element
                        .find('script, style, iframe, .ad, .share, .related, .comments')
                        .remove();
                    fullText = element.text().trim();
                    if (fullText.length > 300) break;
                }
            }

            // Если ничего не нашли — берём весь основной контент страницы
            if (fullText.length < 300) {
                fullText = $('body').text().trim();
            }

            // Очищаем текст от лишних пробелов и переносов
            fullText = fullText.replace(/\s+/g, ' ').trim().slice(0, 15000); // ограничиваем максимальную длину

            logger.info(`Full article fetched: ${url} (${fullText.length} chars)`);

            return fullText;
        } catch (error) {
            logger.error(`Failed to fetch full article ${url}:`, error.message);
            return null;
        }
    },

    /**
     * Parse multiple items from list page
     */
    async parseList(url, itemSelector = 'article a, .post a, .entry a') {
        try {
            logger.info(`Parsing HTML list: ${url}`);

            const response = await axios.get(url, {
                timeout: config.parser.timeout,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (compatible; TelegramBot/1.0)',
                },
            });

            const $ = cheerio.load(response.data);
            const items = [];

            $(itemSelector).each((_, el) => {
                const href = $(el).attr('href');
                const title = $(el).text().trim();

                if (href && title && !href.startsWith('#')) {
                    // Make absolute URL
                    const absoluteUrl = href.startsWith('http') ? href : new URL(href, url).href;

                    items.push({
                        title,
                        link: absoluteUrl,
                    });
                }
            });

            logger.info(`HTML list parsed: ${url}, found ${items.length} items`);
            return items;
        } catch (error) {
            logger.error(`Error parsing HTML list ${url}:`, error.message);
            throw error;
        }
    },

    /**
     * Custom parser registry
     */
    customParsers: new Map(),

    /**
     * Register custom parser for specific domain
     */
    registerParser(domain, parserFn) {
        this.customParsers.set(domain, parserFn);
        logger.info(`Custom parser registered for: ${domain}`);
    },

    /**
     * Parse with custom parser if available
     */
    async parseWithCustom(url, selector) {
        const domain = new URL(url).hostname;

        if (this.customParsers.has(domain)) {
            logger.info(`Using custom parser for: ${domain}`);
            return this.customParsers.get(domain)(url);
        }

        return this.parse(url, selector);
    },
};

module.exports = htmlParser;
