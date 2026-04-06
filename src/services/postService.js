const postDao = require('../db/postDao');
const logger = require('../utils/logger');
const config = require('../config');
const aiService = require('../services/aiService');

/**
 * Post Service - business logic for posts
 */
const postService = {
    /**
     * Create post from parsed content
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
            logger.info(`[Мозг] === НАЧИНАЮ ПЕРЕПИСЫВАНИЕ === "${post.title?.slice(0, 80)}..."`);
            return await aiService.rewritePost(post);
        }

        return post;
    },
    /**
     * Get all posts
     */
    async getPosts(limit = 50) {
        return await postDao.getAll(limit);
    },

    /**
     * Get posts by source
     */
    async getPostsBySource(sourceId, limit = 20) {
        return await postDao.getBySource(sourceId, limit);
    },

    /**
     * Get post count
     */
    async getPostCount() {
        return await postDao.getCount();
    },

    /**
     * Delete post
     */
    async deletePost(id) {
        return await postDao.delete(id);
    },

    /**
 * Format post for Telegram
 */
formatForTelegram(post) {
    let text = '';

    if (post.title) {
        const safeTitle = markdownV2Escape(post.title);
        text += `*${safeTitle}*\n\n`;
    }

    if (post.content) {
        let content = post.content.slice(0, 3900);

        content = markdownV2Escape(content)
            .replace(/\\{2,}/g, '\\');   // убираем двойные слеши, если появятся

        text += content + '\n\n';
    }

    if (post.url) {
        const safeUrl = markdownV2Escape(post.url);           // ← вот это было пропущено!
        text += `🔗 [Читать оригинал](${safeUrl})`;
    }

    return text;
},
};

module.exports = postService;
