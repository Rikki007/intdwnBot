// src/services/postService.js
const postDao = require('../db/postDao');
const logger = require('../utils/logger');
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

        logger.info(`[Post] Создан со статусом 'parsed' → ${post.id}`);

        // Сразу ставим в очередь на AI-обработку
        const queueService = require('./queueService');
        await queueService.add('ai_process', { postId: post.id });

        return post;
    },

    /**
     * Обработка AI для уже существующего поста
     */
    async processAi(postId) {
        const post = await postDao.getById(postId);
        if (!post) {
            logger.warn(`Post ${postId} not found for AI processing`);
            return null;
        }

        await postDao.updateStatus(postId, 'ai_processing');
        await postDao.incrementAiAttempts(postId);

        try {
            logger.info(`[AI] Начинаю обработку поста ${postId}`);

            // Передаём полный текст статьи, если он есть
            const textForAI = post.fullContent || post.content || post.description || '';

            const aiResult = await aiService.rewritePost({
                title: post.title,
                content: textForAI, // ← теперь передаём полный текст
                originalUrl: post.url,
            });

            const updatedPost = {
                ...post,
                title: aiResult.title || post.title,
                content: aiResult.content || post.content,
                isAiProcessed: true,
            };

            await postDao.updateStatus(postId, 'ai_processed');
            logger.info(`[AI] Пост ${postId} успешно обработан`);

            const queueService = require('./queueService');
            await queueService.add('publish_post', { postId: postId, post: updatedPost });

            return updatedPost;
        } catch (error) {
            logger.error(`[AI] Ошибка обработки поста ${postId}:`, error.message);
            await postDao.updateStatus(postId, 'ai_failed', error.message);
            throw error;
        }
    },

    formatForTelegram(post) {
        let html = '';

        if (post.title) {
            const safeTitle = htmlEscape(post.title);
            html += `<b>${safeTitle}</b>\n\n`;
        }

        if (post.content) {
            let content = post.content.trim();
            if (content.length > 3800) content = content.slice(0, 3800) + '…';

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
