// src/db/index.js
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

    // Создаём папку data, если её нет
    if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
    }

    db = new betterSqlite3(dbPath, { verbose: null });

    // WAL режим для лучшей производительности
    db.pragma('journal_mode = WAL');
    db.pragma('synchronous = NORMAL');

    // Таблица источников
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

    // Таблица постов с поддержкой статусов (новая чистая версия)
    db.exec(`
        CREATE TABLE IF NOT EXISTS posts (
            id TEXT PRIMARY KEY,
            source_id TEXT,
            title TEXT,
            content TEXT,
            url TEXT UNIQUE,
            hash TEXT,
            image_url TEXT,
            status TEXT DEFAULT 'parsed',
            ai_attempts INTEGER DEFAULT 0,
            publish_attempts INTEGER DEFAULT 0,
            error_message TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
            published_at TEXT,
            FOREIGN KEY (source_id) REFERENCES sources(id) ON DELETE CASCADE
        )
    `);

    // Индексы
    db.exec('CREATE INDEX IF NOT EXISTS idx_posts_url ON posts(url)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_posts_hash ON posts(hash)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_posts_status ON posts(status)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_posts_source_status ON posts(source_id, status)');

    logger.info('✅ Database initialized successfully with post statuses support');
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
