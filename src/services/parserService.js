const rssParser = require('../parsers/rssParser');
const htmlParser = require('../parsers/htmlParser');
const logger = require('../utils/logger');

/**
 * Main Parser Service - routes to appropriate parser
 */
const parserService = {
 /**
 * Parse source based on its type
 */
 async parseSource(source) {
 try {
 if (source.type === 'rss') {
 return await rssParser.parse(source.url);
 } else if (source.type === 'html') {
 return await htmlParser.parseWithCustom(
 source.url,
 source.selector || 'article'
 );
 } else {
 throw new Error(`Unknown source type: ${source.type}`);
 }
 } catch (error) {
 logger.error(`Error parsing source ${source.url}:`, error.message);
 throw error;
 }
 },

 /**
 * Get source info
 */
 async getSourceInfo(source) {
 if (source.type === 'rss') {
 return await rssParser.getFeedInfo(source.url);
 } else if (source.type === 'html') {
 return await htmlParser.parse(source.url, source.selector);
 }
 return null;
 },
};

module.exports = parserService;
