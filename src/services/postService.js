// src/services/postService.js
const postDao = require('../db/postDao');
const logger = require('../utils/logger');
const config = require('../config');
const aiService = require('./aiService');
const htmlEscape = require('../utils/htmlEscape');

/**
 * Post Service - бизнес-логика постов
 */
const postService = {
    /**
     * Создание поста (с возможной AI-обработкой)
     */
    async createPost(sourceId, data) {
        const post = await postDao.create({
            source_id: sourceId,
            title: data.title,
            content: data.content || data.description,
            url: data.url || data.link,
            image_url: data.imageUrl || data.image_url,
        });

        if (!post) return null;

        if (config.ai?.enabled) {
            logger.info(`[AI] Переписываю пост: "${post.title?.slice(0, 80)}..."`);
            return await aiService.rewritePost(post);
        }

        return post;
    },

    formatForTelegram(post) {
        let html = '';

        if (post.title) {
            const safeTitle = htmlEscape(post.title);
            html += `📰 <b>${safeTitle}</b>\n\n`;
        }

        if (post.content) {
            let content = post.content.trim();

            if (content.length > 3900) {
                content = content.slice(0, 3900) + '…';
            }

            const safeContent = htmlEscape(content)
                .replace(/\n\n+/g, '\n<br><br>')
                .replace(/\n/g, '<br>');

            html += safeContent + '\n\n';
        }

        if (post.url) {
            const safeUrl = htmlEscape(post.url);
            html += `<a href="${safeUrl}">🔗 Читать оригинал</a>`;
        }

        return html.trim();
    },

    /**
     * Получить все посты
     */
    async getPosts(limit = 50) {
        return await postDao.getAll(limit);
    },

    /**
     * Посты по источнику
     */
    async getPostsBySource(sourceId, limit = 20) {
        return await postDao.getBySource(sourceId, limit);
    },

    /**
     * Количество постов
     */
    async getPostCount() {
        return await postDao.getCount();
    },

    /**
     * Удаление поста
     */
    async deletePost(id) {
        return await postDao.delete(id);
    },
};

module.exports = postService;