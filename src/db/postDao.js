const { getDb } = require('./index');
const { generateId, generateHash } = require('../utils/helpers');
const logger = require('../utils/logger');

/**
 * Post Data Access Object
 */
const postDao = {
    /**
     * Create new post
     */
    async create(data) {
        const db = getDb();
        const id = generateId();
        const hash = generateHash(data.content || data.title || data.url);

        const stmt = db.prepare(`
            INSERT INTO posts (id, source_id, title, content, url, hash, image_url, published_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
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

            logger.info(`Post created: ${data.title}`);
            return { id, ...data, hash };
        } catch (err) {
            if (err.message.includes('UNIQUE constraint failed')) {
                logger.info(`Duplicate post skipped: ${data.url}`);
                return null; // Duplicate
            } else {
                logger.error('Error creating post:', err);
                throw err;
            }
        }
    },

    /**
     * Get all posts
     */
    async getAll(limit = 50) {
        const db = getDb();
        const stmt = db.prepare('SELECT * FROM posts ORDER BY created_at DESC LIMIT ?');
        try {
            return stmt.all(limit);
        } catch (err) {
            logger.error('Error getting posts:', err);
            throw err;
        }
    },

    /**
     * Get posts by source
     */
    async getBySource(sourceId, limit = 20) {
        const db = getDb();
        const stmt = db.prepare(
            'SELECT * FROM posts WHERE source_id = ? ORDER BY created_at DESC LIMIT ?'
        );
        try {
            return stmt.all(sourceId, limit);
        } catch (err) {
            logger.error('Error getting posts by source:', err);
            throw err;
        }
    },

    /**
     * Check if URL exists
     */
    async existsByUrl(url) {
        const db = getDb();
        const stmt = db.prepare('SELECT id FROM posts WHERE url = ?');
        try {
            const row = stmt.get(url);
            return !!row;
        } catch (err) {
            logger.error('Error checking URL:', err);
            throw err;
        }
    },

    /**
     * Check if hash exists
     */
    async existsByHash(hash) {
        const db = getDb();
        const stmt = db.prepare('SELECT id FROM posts WHERE hash = ?');
        try {
            const row = stmt.get(hash);
            return !!row;
        } catch (err) {
            logger.error('Error checking hash:', err);
            throw err;
        }
    },

    /**
     * Check for duplicates
     */
    async isDuplicate(url, content) {
        if (url) {
            const urlExists = await this.existsByUrl(url);
            if (urlExists) return true;
        }

        if (content) {
            const hash = generateHash(content);
            const hashExists = await this.existsByHash(hash);
            if (hashExists) return true;
        }

        return false;
    },

    /**
     * Delete post
     */
    async delete(id) {
        const db = getDb();
        const stmt = db.prepare('DELETE FROM posts WHERE id = ?');
        try {
            stmt.run(id);
            return { success: true };
        } catch (err) {
            logger.error('Error deleting post:', err);
            throw err;
        }
    },

    /**
     * Get recent posts count
     */
    async getCount() {
        const db = getDb();
        const stmt = db.prepare('SELECT COUNT(*) as count FROM posts');
        try {
            const row = stmt.get();
            return row.count;
        } catch (err) {
            logger.error('Error getting posts count:', err);
            throw err;
        }
    },
};

module.exports = postDao;
