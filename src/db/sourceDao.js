const { getDb } = require('../db');
const { generateId } = require('../utils/helpers');
const logger = require('../utils/logger');

/**
 * Source Data Access Object
 */
const sourceDao = {
 /**
 * Create new source
 */
 create(type, url, name = null, selector = null) {
 return new Promise((resolve, reject) => {
 const db = getDb();
 const id = generateId();

 const stmt = db.prepare(`
 INSERT INTO sources (id, type, url, name, selector, is_active)
 VALUES (?, ?, ?, ?, ?,1)
 `);

 stmt.run(id, type, url, name, selector, (err) => {
 if (err) {
 logger.error('Error creating source:', err);
 reject(err);
 } else {
 logger.info(`Source created: ${url}`);
 resolve({ id, type, url, name, selector, is_active:1 });
 }
 });
 stmt.finalize();
 });
 },

 /**
 * Get all sources
 */
 getAll() {
 return new Promise((resolve, reject) => {
 const db = getDb();
 db.all('SELECT * FROM sources ORDER BY created_at DESC', (err, rows) => {
 if (err) {
 logger.error('Error getting sources:', err);
 reject(err);
 } else {
 resolve(rows);
 }
 });
 });
 },

 /**
 * Get active sources
 */
 getActive() {
 return new Promise((resolve, reject) => {
 const db = getDb();
 db.all('SELECT * FROM sources WHERE is_active =1', (err, rows) => {
 if (err) {
 logger.error('Error getting active sources:', err);
 reject(err);
 } else {
 resolve(rows);
 }
 });
 });
 },

 /**
 * Get source by ID
 */
 getById(id) {
 return new Promise((resolve, reject) => {
 const db = getDb();
 db.get('SELECT * FROM sources WHERE id = ?', [id], (err, row) => {
 if (err) {
 logger.error('Error getting source:', err);
 reject(err);
 } else {
 resolve(row);
 }
 });
 });
 },

 /**
 * Update source
 */
 update(id, data) {
 return new Promise((resolve, reject) => {
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

 stmt.run(...values, (err) => {
 if (err) {
 logger.error('Error updating source:', err);
 reject(err);
 } else {
 logger.info(`Source updated: ${id}`);
 resolve({ id, ...data });
 }
 });
 stmt.finalize();
 });
 },

 /**
 * Delete source
 */
 delete(id) {
 return new Promise((resolve, reject) => {
 const db = getDb();
 db.run('DELETE FROM sources WHERE id = ?', [id], (err) => {
 if (err) {
 logger.error('Error deleting source:', err);
 reject(err);
 } else {
 logger.info(`Source deleted: ${id}`);
 resolve({ success: true });
 }
 });
 });
 },

 /**
 * Toggle source active status
 */
 toggleActive(id) {
 return new Promise((resolve, reject) => {
 const db = getDb();
 db.run(`
 UPDATE sources 
 SET is_active = CASE WHEN is_active = 1 THEN 0 ELSE 1 END,
 updated_at = CURRENT_TIMESTAMP
 WHERE id = ?
 `, [id], (err) => {
 if (err) {
 logger.error('Error toggling source:', err);
 reject(err);
 } else {
 resolve({ success: true });
 }
 });
 });
 },
};

module.exports = sourceDao;
