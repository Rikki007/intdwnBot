const betterSqlite3 = require('better-sqlite3');
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

    // Create data folder if it doesn't exist
    if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
    }

    // Open database with better-sqlite3
    db = new betterSqlite3(dbPath, { verbose: null });

    // Enable WAL mode for better concurrency
    db.pragma('journal_mode = WAL');
    db.pragma('synchronous = NORMAL');

    // Create tables
    db.exec(`
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

    db.exec(`
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

    db.exec(`CREATE INDEX IF NOT EXISTS idx_posts_url ON posts(url)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_posts_hash ON posts(hash)`);

    db.exec(`
        CREATE TABLE IF NOT EXISTS logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            level TEXT NOT NULL,
            message TEXT,
            context TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    `);

    logger.info('✅ Database initialized successfully with better-sqlite3');
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
        db.close();
        logger.info('Database connection closed');
        db = null;
    }
}

module.exports = {
    initDatabase,
    getDb,
    closeDatabase,
};
