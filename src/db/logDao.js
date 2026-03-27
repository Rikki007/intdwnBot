const { getDb } = require('../db');
const logger = require('../utils/logger');

/**
 * Log Data Access Object
 */
const logDao = {
 /**
 * Add log entry
 */
 log(level, message, context = null) {
 return new Promise((resolve, reject) => {
 const db = getDb();
 const stmt = db.prepare(`
 INSERT INTO logs (level, message, context)
 VALUES (?, ?, ?)
 `);

 stmt.run(level, message, context ? JSON.stringify(context) : null, (err) => {
 if (err) {
 logger.error('Error writing log:', err);
 reject(err);
 } else {
 resolve({ success: true });
 }
 });
 stmt.finalize();
 });
 },

 /**
 * Get recent logs
 */
 getRecent(limit =100) {
 return new Promise((resolve, reject) => {
 const db = getDb();
 db.all(
 'SELECT * FROM logs ORDER BY created_at DESC LIMIT ?',
 [limit],
 (err, rows) => {
 if (err) {
 logger.error('Error getting logs:', err);
 reject(err);
 } else {
 resolve(rows);
 }
 }
 );
 });
 },

 /**
 * Get logs by level
 */
 getByLevel(level, limit =100) {
 return new Promise((resolve, reject) => {
 const db = getDb();
 db.all(
 'SELECT * FROM logs WHERE level = ? ORDER BY created_at DESC LIMIT ?',
 [level, limit],
 (err, rows) => {
 if (err) {
 logger.error('Error getting logs by level:', err);
 reject(err);
 } else {
 resolve(rows);
 }
 }
 );
 });
 },

 /**
 * Clear old logs (older than days)
 */
 clearOld(days =30) {
 return new Promise((resolve, reject) => {
 const db = getDb();
 db.run(
 `DELETE FROM logs WHERE created_at< datetime('now', '-${days} days')`,
 (err) => {
 if (err) {
 logger.error('Error clearing old logs:', err);
 reject(err);
 } else {
 logger.info('Old logs cleared');
 resolve({ success: true });
 }
 }
 );
 });
 },
};

module.exports = logDao;
