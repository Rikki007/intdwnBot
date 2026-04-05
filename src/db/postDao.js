const { getDb } = require('../db');
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
        return new Promise((resolve, reject) => {
            const db = getDb();
            const id = generateId();
            const hash = generateHash(data.content || data.title || data.url);

            const stmt = db.prepare(`
 INSERT INTO posts (id, source_id, title, content, url, hash, image_url, published_at)
 VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
 `);

            stmt.run(
                id,
                data.source_id || null,
                data.title || null,
                data.content || null,
                data.url || null,
                hash,
                data.image_url || null,
                (err) => {
                    if (err) {
                        if (err.message.includes('UNIQUE constraint failed')) {
                            logger.info(`Duplicate post skipped: ${data.url}`);
                            resolve(null); // Duplicate
                        } else {
                            logger.error('Error creating post:', err);
                            reject(err);
                        }
                    } else {
                        logger.info(`Post created: ${data.title}`);
                        resolve({ id, ...data, hash });
                    }
                }
            );
            stmt.finalize();
        });
    },

    /**
     * Get all posts
     */
    getAll(limit = 50) {
        return new Promise((resolve, reject) => {
            const db = getDb();
            db.all('SELECT * FROM posts ORDER BY created_at DESC LIMIT ?', [limit], (err, rows) => {
                if (err) {
                    logger.error('Error getting posts:', err);
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    },

    /**
     * Get posts by source
     */
    getBySource(sourceId, limit = 20) {
        return new Promise((resolve, reject) => {
            const db = getDb();
            db.all(
                'SELECT * FROM posts WHERE source_id = ? ORDER BY created_at DESC LIMIT ?',
                [sourceId, limit],
                (err, rows) => {
                    if (err) {
                        logger.error('Error getting posts by source:', err);
                        reject(err);
                    } else {
                        resolve(rows);
                    }
                }
            );
        });
    },

    /**
     * Check if URL exists (deduplication)
     */
    existsByUrl(url) {
        return new Promise((resolve, reject) => {
            const db = getDb();
            db.get('SELECT id FROM posts WHERE url = ?', [url], (err, row) => {
                if (err) {
                    logger.error('Error checking URL:', err);
                    reject(err);
                } else {
                    resolve(!!row);
                }
            });
        });
    },

    /**
     * Check if hash exists (deduplication)
     */
    existsByHash(hash) {
        return new Promise((resolve, reject) => {
            const db = getDb();
            db.get('SELECT id FROM posts WHERE hash = ?', [hash], (err, row) => {
                if (err) {
                    logger.error('Error checking hash:', err);
                    reject(err);
                } else {
                    resolve(!!row);
                }
            });
        });
    },

    /**
     * Check for duplicates (URL or hash)
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
    delete(id) {
        return new Promise((resolve, reject) => {
            const db = getDb();
            db.run('DELETE FROM posts WHERE id = ?', [id], (err) => {
                if (err) {
                    logger.error('Error deleting post:', err);
                    reject(err);
                } else {
                    resolve({ success: true });
                }
            });
        });
    },

    /**
     * Get recent posts count
     */
    getCount() {
        return new Promise((resolve, reject) => {
            const db = getDb();
            db.get('SELECT COUNT(*) as count FROM posts', (err, row) => {
                if (err) {
                    logger.error('Error getting posts count:', err);
                    reject(err);
                } else {
                    resolve(row.count);
                }
            });
        });
    },
};

module.exports = postDao;
