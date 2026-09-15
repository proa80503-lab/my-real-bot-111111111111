'use strict';
/**
 * bot-settings-db.js
 * يخزّن إعدادات صاحب البوت في SQLite (جدول bot_settings)
 * بدلاً من ملف JSON حتى تبقى الإعدادات بعد كل Render restart
 */

const DEFAULTS = {
    autoMessagesEnabled:     'true',
    aiRandomReplyEnabled:    'true',
    dailyReminderEnabled:    'true',
    dailySummaryEnabled:     'true',
    ghostPingEnabled:        'false',
    antiRaidAccountAgeEnabled:'true',
    aiRandomReplyFrequency:  '10',
    randomEventInterval:     '20',
    challengeInterval:       '45',
    moodMessageInterval:     '180',
    greetingInterval:        '240',
    ghostPingInterval:       '21600000',
    lastBankReset:           '0',
    disabledCommands:        '[]',
    savedWelcomeDesigns:     '[]',
    dashboardKey:            '',

    // إعدادات الترحيب
    welcomeGuildId:          '',   // ID السيرفر
    welcomeChannelId:        '',   // ID الروم
    welcomeImage:            '',   // رابط الصورة الخلفية
    welcomeAvatarX:          '960',
    welcomeAvatarY:          '540',
    welcomeAvatarWidth:      '256',
    welcomeAvatarHeight:     '256',
    welcomeAvatarRadius:     '50',
};

let _db = null;

function getDb() {
    if (_db) return _db;
    const { getDb: _getDb } = require('./db-instance');
    _db = _getDb();
    return _db;
}

function _get(key) {
    try {
        const row = getDb().prepare('SELECT value FROM bot_settings WHERE key = ?').get(key);
        return row ? row.value : (DEFAULTS[key] ?? null);
    } catch { return DEFAULTS[key] ?? null; }
}

function _set(key, value) {
    try {
        getDb().prepare('INSERT OR REPLACE INTO bot_settings (key, value) VALUES (?, ?)').run(key, String(value));
    } catch(e) { console.error('[BotSettingsDB] set error:', e.message); }
}

function get(key) {
    const raw = _get(key);
    if (raw === null || raw === undefined) return DEFAULTS[key] ?? null;
    // Booleans
    if (raw === 'true') return true;
    if (raw === 'false') return false;
    // JSON arrays/objects
    if (raw.startsWith('[') || raw.startsWith('{')) {
        try { return JSON.parse(raw); } catch {}
    }
    // Numbers
    const n = Number(raw);
    if (!isNaN(n) && raw.trim() !== '') return n;
    return raw;
}

function set(key, value) {
    const v = (typeof value === 'object') ? JSON.stringify(value) : String(value);
    _set(key, v);
}

function setMany(updates) {
    for (const [k, v] of Object.entries(updates)) set(k, v);
}

function getAll() {
    const result = { ...DEFAULTS };
    try {
        const rows = getDb().prepare('SELECT key, value FROM bot_settings').all();
        for (const row of rows) result[row.key] = row.value;
    } catch {}
    // Parse each value
    const parsed = {};
    for (const [k, v] of Object.entries(result)) {
        if (v === 'true') { parsed[k] = true; continue; }
        if (v === 'false') { parsed[k] = false; continue; }
        if (typeof v === 'string' && (v.startsWith('[') || v.startsWith('{'))) {
            try { parsed[k] = JSON.parse(v); continue; } catch {}
        }
        const n = Number(v);
        if (typeof v === 'string' && !isNaN(n) && v.trim() !== '') { parsed[k] = n; continue; }
        parsed[k] = v;
    }
    return parsed;
}

module.exports = { get, set, setMany, getAll, DEFAULTS };
