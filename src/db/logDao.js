const { getDb } = require('./index');
const logger = require('../utils/logger');

/**
 * Log Data Access Object (адаптировано под better-sqlite3)
 */
const logDao = {
    /**
     * Add log entry
     */
    log(level, message, context = null) {
        const db = getDb();
        const stmt = db.prepare(`
            INSERT INTO logs (level, message, context)
            VALUES (?, ?, ?)
        `);

        try {
            stmt.run(level, message, context ? JSON.stringify(context) : null);
            return { success: true };
        } catch (err) {
            // Логируем через winston, чтобы не зациклиться
            logger.error('Error writing log to database:', err);
            // Не бросаем ошибку, чтобы не ломать основной поток логирования
        }
    },

    /**
     * Get recent logs
     */
    async getRecent(limit = 100) {
        const db = getDb();
        const stmt = db.prepare('SELECT * FROM logs ORDER BY created_at DESC LIMIT ?');
        try {
            return stmt.all(limit);
        } catch (err) {
            logger.error('Error getting logs:', err);
            throw err;
        }
    },

    /**
     * Get logs by level
     */
    async getByLevel(level, limit = 100) {
        const db = getDb();
        const stmt = db.prepare(
            'SELECT * FROM logs WHERE level = ? ORDER BY created_at DESC LIMIT ?'
        );
        try {
            return stmt.all(level, limit);
        } catch (err) {
            logger.error('Error getting logs by level:', err);
            throw err;
        }
    },

    /**
     * Clear old logs
     */
    async clearOld(days = 30) {
        const db = getDb();
        const stmt = db.prepare(
            `DELETE FROM logs WHERE created_at < datetime('now', '-${days} days')`
        );
        try {
            stmt.run();
            logger.info(`Old logs cleared (older than ${days} days)`);
            return { success: true };
        } catch (err) {
            logger.error('Error clearing old logs:', err);
            throw err;
        }
    },
};

module.exports = logDao;
