const sourceDao = require('../db/sourceDao');
const logger = require('../utils/logger');

/**
 * Source Service - business logic for sources
 */
const sourceService = {
    /**
     * Add new source
     */
    async addSource(type, url, name = null, selector = null) {
        // Validate URL
        try {
            new URL(url);
        } catch {
            throw new Error('Invalid URL');
        }

        // Validate type
        if (!['rss', 'html'].includes(type)) {
            throw new Error('Type must be "rss" or "html"');
        }

        const source = await sourceDao.create(type, url, name, selector);
        logger.info(`Source added: ${type} - ${url}`);
        return source;
    },

    /**
     * Get all sources
     */
    async getSources() {
        return await sourceDao.getAll();
    },

    /**
     * Get active sources
     */
    async getActiveSources() {
        return await sourceDao.getActive();
    },

    /**
     * Get source by ID
     */
    async getSource(id) {
        return await sourceDao.getById(id);
    },

    /**
     * Update source
     */
    async updateSource(id, data) {
        return await sourceDao.update(id, data);
    },

    /**
     * Delete source
     */
    async deleteSource(id) {
        return await sourceDao.delete(id);
    },

    /**
     * Toggle source active status
     */
    async toggleSource(id) {
        return await sourceDao.toggleActive(id);
    },

    /**
     * Format source for display
     */
    formatForDisplay(source) {
        const status = source.is_active ? '✅ Активен' : '❌ Неактивен';
        return `📰 *${source.name || 'Источник'}*
Тип: ${source.type.toUpperCase()}
URL: ${source.url}
Статус: ${status}
ID: \`${source.id}\``;
    },
    // clear all sources
    async clearAllSources() {
        try {
            const db = require('../db/index').getDb(); // ← используем getDb()

            // Сначала удаляем посты
            const deletePosts = db.prepare('DELETE FROM posts');
            deletePosts.run();

            // Затем удаляем источники
            const deleteSources = db.prepare('DELETE FROM sources');
            const result = deleteSources.run();

            logger.info(`All sources cleared. Removed ${result.changes} sources.`);
            return {
                success: true,
                message: `✅ Удалено источников: ${result.changes}`,
            };
        } catch (error) {
            logger.error('Error clearing all sources:', error);
            throw new Error('Не удалось очистить: ' + error.message, {
                cause: error,
            });
        }
    },
};

module.exports = sourceService;
