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
 async parse(url, selector = 'article') {
 try {
 logger.info(`Parsing HTML: ${url}`);

 const response = await axios.get(url, {
 timeout: config.parser.timeout,
 headers: {
 'User-Agent': 'Mozilla/5.0 (compatible; TelegramBot/1.0)',
 },
 });

 const $ = cheerio.load(response.data);
 const $content = $(selector);

 const title = $('h1').first().text().trim() ||
 $('title').text().trim() ||
 '';

 const content = $content.text().trim().slice(0,2000);

 // Try to find main image
 const imageUrl = $('meta[property="og:image"]').attr('content') ||
 $('article img').first().attr('src') ||
 $('img').first().attr('src') ||
 null;

 // Try to find description
 const description = $('meta[name="description"]').attr('content') ||
 $('meta[property="og:description"]').attr('content') ||
 $('p').first().text().trim().slice(0,500) ||
 '';

 logger.info(`HTML parsed: ${url}`);
 return {
 title,
 content,
 description,
 imageUrl,
 link: url,
 };
 } catch (error) {
 logger.error(`Error parsing HTML ${url}:`, error.message);
 throw error;
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
 const absoluteUrl = href.startsWith('http')
 ? href
 : new URL(href, url).href;

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
