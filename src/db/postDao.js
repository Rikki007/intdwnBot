// src/db/postDao.js
const { getDb } = require('./index');
const { generateId, generateHash } = require('../utils/helpers');
const logger = require('../utils/logger');

/**
 * Post Data Access Object с поддержкой статусов
 */
const postDao = {
    /**
     * Создать новый пост со статусом 'parsed'
     */
    async create(data) {
        const db = getDb();
        const id = generateId();
        const hash = generateHash(data.content || data.title || data.url);

        const stmt = db.prepare(`
            INSERT INTO posts (
                id, source_id, title, content, url, hash, image_url,
                status, ai_attempts, publish_attempts
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, 'parsed', 0, 0)
        `);

        try {
            stmt.run(
                id,
                data.source_id || null,
                data.title || null,
                data.content || null,
                data.url || null,
                hash,
                data.image_url || null
            );

            logger.info(`Post created [parsed]: ${data.title?.slice(0, 60) || 'no title'}`);
            return { id, ...data, hash, status: 'parsed' };
        } catch (err) {
            if (err.message.includes('UNIQUE constraint failed')) {
                logger.info(`Duplicate post skipped: ${data.url}`);
                return null;
            }
            logger.error('Error creating post:', err);
            throw err;
        }
    },

    /**
     * Обновить статус поста
     */
    async updateStatus(id, status, errorMessage = null) {
        const db = getDb();
        const stmt = db.prepare(`
            UPDATE posts 
            SET status = ?, 
                error_message = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `);
        try {
            stmt.run(status, errorMessage, id);
            logger.debug(`Post ${id} → status: ${status}`);
            return true;
        } catch (err) {
            logger.error(`Failed to update status for post ${id}:`, err);
            throw err;
        }
    },

    /**
     * Увеличить количество попыток AI
     */
    async incrementAiAttempts(id) {
        const db = getDb();
        const stmt = db.prepare(`
            UPDATE posts 
            SET ai_attempts = ai_attempts + 1, 
                updated_at = CURRENT_TIMESTAMP 
            WHERE id = ?
        `);
        stmt.run(id);
    },

    /**
     * Увеличить количество попыток публикации
     */
    async incrementPublishAttempts(id) {
        const db = getDb();
        const stmt = db.prepare(`
            UPDATE posts 
            SET publish_attempts = publish_attempts + 1, 
                updated_at = CURRENT_TIMESTAMP 
            WHERE id = ?
        `);
        stmt.run(id);
    },

    /**
     * Получить посты по статусу
     */
    async getByStatus(status, limit = 50) {
        const db = getDb();
        const stmt = db.prepare(`
            SELECT * FROM posts 
            WHERE status = ? 
            ORDER BY created_at DESC 
            LIMIT ?
        `);
        return stmt.all(status, limit);
    },

    // Методы для совместимости
    async getAll(limit = 50) {
        const db = getDb();
        const stmt = db.prepare('SELECT * FROM posts ORDER BY created_at DESC LIMIT ?');
        return stmt.all(limit);
    },

    async getCount() {
        const db = getDb();
        const stmt = db.prepare('SELECT COUNT(*) as count FROM posts');
        const row = stmt.get();
        return row.count;
    },

    async getById(id) {
        const db = getDb();
        const stmt = db.prepare('SELECT * FROM posts WHERE id = ?');
        return stmt.get(id);
    },

    async getCountByStatus(status) {
        const db = getDb();
        const stmt = db.prepare('SELECT COUNT(*) as count FROM posts WHERE status = ?');
        const row = stmt.get(status);
        return row ? row.count : 0;
    },
};

module.exports = postDao;
