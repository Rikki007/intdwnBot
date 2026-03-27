const postDao = require('../db/postDao');
const logger = require('../utils/logger');

/**
 * Post Service - business logic for posts
 */
const postService = {
 /**
 * Create post from parsed content
 */
 async createPost(sourceId, data) {
  // Проверяем дубликаты
  const isDuplicate = await postDao.isDuplicate(data.url || data.link, data.content);

  if (isDuplicate) {
    logger.info(`Duplicate post skipped: ${data.url || data.link}`);
    return null;
  }

  const post = await postDao.create({
    source_id: sourceId,
    title: data.title,
    content: data.content || data.description,        
    url: data.url || data.link,                       
    image_url: data.imageUrl || data.image_url,
  });

  return post;
},

 /**
 * Get all posts
 */
 async getPosts(limit =50) {
 return await postDao.getAll(limit);
 },

 /**
 * Get posts by source
 */
 async getPostsBySource(sourceId, limit =20) {
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
 * Format post for Telegram (безопасная версия)
 */
formatForTelegram(post) {
  let text = '';

  if (post.title) {
    // Экранируем специальные символы в заголовке
    const safeTitle = post.title
      .replace(/([_*[\]()~`>#+\-=|{}.!])/g, '\\$1'); // экранируем Markdown v2 символы

    text += `*${safeTitle}*\n\n`;
  }

  if (post.content) {
    // Ограничиваем длину и тоже экранируем
    let content = post.content.slice(0, 3500);

    // Убираем опасные символы или экранируем
    content = content.replace(/([_*[\]()~`>#+\-=|{}.!])/g, '\\$1');

    text += content + '\n\n';
  }

  if (post.url) {
    // Безопасная ссылка
    text += `🔗 [Читать оригинал](${post.url})`;
  }

  return text;
},
};

module.exports = postService;
