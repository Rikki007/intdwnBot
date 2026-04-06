const { getDb } = require('./index');
const { generateId } = require('../utils/helpers');
const logger = require('../utils/logger');

/**
 * Source Data Access Object (адаптировано под better-sqlite3)
 */
const sourceDao = {
    /**
     * Create new source
     */
    async create(type, url, name = null, selector = null) {
        const db = getDb();
        const id = generateId();

        const stmt = db.prepare(`
            INSERT INTO sources (id, type, url, name, selector, is_active)
            VALUES (?, ?, ?, ?, ?, 1)
        `);

        try {
            stmt.run(id, type, url, name, selector);

            logger.info(`Source created: ${url}`);
            return { id, type, url, name, selector, is_active: 1 };
        } catch (err) {
            logger.error('Error creating source:', err);
            throw err;
        }
    },

    /**
     * Get all sources
     */
    async getAll() {
        const db = getDb();
        const stmt = db.prepare('SELECT * FROM sources ORDER BY created_at DESC');
        try {
            return stmt.all();
        } catch (err) {
            logger.error('Error getting sources:', err);
            throw err;
        }
    },

    /**
     * Get active sources
     */
    async getActive() {
        const db = getDb();
        const stmt = db.prepare('SELECT * FROM sources WHERE is_active = 1');
        try {
            return stmt.all();
        } catch (err) {
            logger.error('Error getting active sources:', err);
            throw err;
        }
    },

    /**
     * Get source by ID
     */
    async getById(id) {
        const db = getDb();
        const stmt = db.prepare('SELECT * FROM sources WHERE id = ?');
        try {
            return stmt.get(id);
        } catch (err) {
            logger.error('Error getting source:', err);
            throw err;
        }
    },

    /**
     * Update source
     */
    async update(id, data) {
        const db = getDb();

        const fields = [];
        const values = [];

        if (data.name !== undefined) {
            fields.push('name = ?');
            values.push(data.name);
        }
        if (data.url !== undefined) {
            fields.push('url = ?');
            values.push(data.url);
        }
        if (data.selector !== undefined) {
            fields.push('selector = ?');
            values.push(data.selector);
        }
        if (data.is_active !== undefined) {
            fields.push('is_active = ?');
            values.push(data.is_active);
        }

        fields.push('updated_at = CURRENT_TIMESTAMP');
        values.push(id);

        const sql = `UPDATE sources SET ${fields.join(', ')} WHERE id = ?`;

        const stmt = db.prepare(sql);

        try {
            stmt.run(...values);
            logger.info(`Source updated: ${id}`);
            return { id, ...data };
        } catch (err) {
            logger.error('Error updating source:', err);
            throw err;
        }
    },

    /**
     * Delete source
     */
    async delete(id) {
        const db = getDb();
        const stmt = db.prepare('DELETE FROM sources WHERE id = ?');
        try {
            stmt.run(id);
            logger.info(`Source deleted: ${id}`);
            return { success: true };
        } catch (err) {
            logger.error('Error deleting source:', err);
            throw err;
        }
    },

    /**
     * Toggle source active status
     */
    async toggleActive(id) {
        const db = getDb();
        const stmt = db.prepare(`
            UPDATE sources 
            SET is_active = CASE WHEN is_active = 1 THEN 0 ELSE 1 END,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `);
        try {
            stmt.run(id);
            return { success: true };
        } catch (err) {
            logger.error('Error toggling source:', err);
            throw err;
        }
    },
};

module.exports = sourceDao;
