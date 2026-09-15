'use strict';
/**
 * db-instance.js
 * نقطة وصول واحدة لكائن SQLite — تمنع الـ circular require
 */
const path = require('path');

let _db = null;

function getDb() {
    if (_db) return _db;
    const Database = require('better-sqlite3');
    const DB_PATH  = path.join(__dirname, '../../data/bot.db');
    _db = new Database(DB_PATH);
    return _db;
}

module.exports = { getDb };
