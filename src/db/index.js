const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const config = require('../config');
const logger = require('../utils/logger');

let db = null;

/**
 * Initialize database connection and create tables
 */
function initDatabase() {
    const dbPath = config.db.path;
    const dbDir = path.dirname(dbPath);

    // Create a data folder if it doesn't exist.
    if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
    }

    db = new sqlite3.Database(dbPath);

    // WAL mode
    db.exec('PRAGMA journal_mode = WAL', (err) => {
        if (err) logger.warn('Failed to set WAL mode:', err.message);
    });

    // Создаём таблицы
    db.serialize(() => {
        db.run(`
      CREATE TABLE IF NOT EXISTS sources (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL CHECK(type IN ('rss', 'html')),
        url TEXT NOT NULL,
        name TEXT,
        selector TEXT,
        is_active INTEGER DEFAULT 1,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

        db.run(`
      CREATE TABLE IF NOT EXISTS posts (
        id TEXT PRIMARY KEY,
        source_id TEXT,
        title TEXT,
        content TEXT,
        url TEXT UNIQUE,
        hash TEXT,
        image_url TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        published_at TEXT,
        FOREIGN KEY (source_id) REFERENCES sources(id)
      )
    `);

        db.run(`CREATE INDEX IF NOT EXISTS idx_posts_url ON posts(url)`);
        db.run(`CREATE INDEX IF NOT EXISTS idx_posts_hash ON posts(hash)`);

        db.run(`
      CREATE TABLE IF NOT EXISTS logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        level TEXT NOT NULL,
        message TEXT,
        context TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

        logger.info('✅ Database initialized successfully');
    });

    return db;
}

/**
 * Get database instance
 */
function getDb() {
    if (!db) {
        throw new Error('Database not initialized. Call initDatabase() first.');
    }
    return db;
}

/**
 * Close database connection
 */
function closeDatabase() {
    if (db) {
        db.close((err) => {
            if (err) logger.error('Error closing database:', err);
            else logger.info('Database connection closed');
        });
        db = null;
    }
}

module.exports = {
    initDatabase,
    getDb,
    closeDatabase,
};
