'use strict';

const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '../data/economy.json');

// ─────────────────────────────────────────────────────────────────────────────
// Cache ذكي في الذاكرة — يقلل عمليات القراءة/الكتابة من مئات → عدد قليل/دورة
// ─────────────────────────────────────────────────────────────────────────────
let _cache = null; // البيانات الكاملة في الذاكرة
let _dirty = false; // هل هناك تغييرات غير محفوظة؟

// قراءة الملف مرة واحدة فقط عند التشغيل
function _ensureCache() {
    if (_cache) return;
    try {
        if (fs.existsSync(dbPath)) {
            const raw = fs.readFileSync(dbPath, 'utf8');
            _cache = JSON.parse(raw);
        }
    } catch (e) {
        console.error('[DB] خطأ في تحميل قاعدة البيانات:', e.message);
    }
    if (!_cache || typeof _cache !== 'object') _cache = { users: {}, guilds: {} };
    if (!_cache.users) _cache.users = {};
    if (!_cache.guilds) _cache.guilds = {};
}

// حفظ محمي بـ try/catch
function _flush() {
    if (!_dirty || !_cache) return;
    try {
        fs.writeFileSync(dbPath, JSON.stringify(_cache, null, 2), 'utf8');
        _dirty = false;
    } catch (e) {
        console.error('[DB] خطأ في حفظ قاعدة البيانات:', e.message);
    }
}

// حفظ دوري كل 30 ثانية
const _saveInterval = setInterval(_flush, 30000);
_saveInterval.unref?.(); // لا يمنع إغلاق البوت

// حفظ نهائي عند إغلاق البوت
function saveAll() { _flush(); }
process.on('SIGINT', () => { saveAll(); process.exit(0); });
process.on('SIGTERM', () => { saveAll(); process.exit(0); });

// ─────────────────────────────────────────────────────────────────────────────
// API العامة
// ─────────────────────────────────────────────────────────────────────────────

function loadDatabase() {
    _ensureCache();
    return _cache;
}

function saveDatabase(db) {
    _cache = db;
    _dirty = true;
    return true;
}

// القيم الافتراضية لمستخدم جديد
function _defaultUser() {
    return {
        balance: 1000,
        bank: 0,
        lastDaily: null,
        lastWeekly: null,
        lastWork: null,
        lastRob: null,
        dailyStreak: 0,
        inventory: {}, // ← object وليس array (مهم!)
        warnings: 0,
        jailTime: null,
        muteTime: null,
        xp: 0,
        level: 1,
        achievements: [],
        stats: {
            gamesPlayed: 0,
            gamesWon: 0,
            totalWagered: 0,
            totalWon: 0,
            biggestWin: 0
        },
        transactions: [],
        marriedTo: null,
        marriedSince: null
    };
}

// الحصول على بيانات المستخدم (قراءة من الـ Cache)
function getUserData(userId) {
    _ensureCache();
    if (!_cache.users[userId]) {
        _cache.users[userId] = _defaultUser();
        _dirty = true;
    }

    const u = _cache.users[userId];

    // ترقية البيانات القديمة بشكل صامت
    if (u.xp === undefined) u.xp = 0;
    if (!u.level) u.level = 1;
    if (!u.achievements) u.achievements = [];
    if (!u.stats) u.stats = { gamesPlayed: 0, gamesWon: 0, totalWagered: 0, totalWon: 0, biggestWin: 0 };
    if (!u.transactions) u.transactions = [];
    if (u.dailyStreak === undefined) u.dailyStreak = 0;
    // ── ترقية صامتة: تحويل الحقول القديمة إلى الحقول الموحّدة ──
    if (u.partner !== undefined && u.marriedTo === undefined) {
        u.marriedTo = u.partner;
        delete u.partner;
        _dirty = true;
    }
    if (u.marriageDate !== undefined && u.marriedSince === undefined) {
        u.marriedSince = u.marriageDate;
        delete u.marriageDate;
        _dirty = true;
    }
    if (u.marriedTo === undefined) u.marriedTo = null;
    if (u.marriedSince === undefined) u.marriedSince = null;

    // ← إصلاح Bug: إذا كان inventory مصفوفة (بيانات قديمة) نحوله لـ object
    if (Array.isArray(u.inventory)) {
        const newInv = {};
        for (const item of u.inventory) {
            if (item && item.id) newInv[item.id] = item;
        }
        u.inventory = newInv;
        _dirty = true;
    }
    if (!u.inventory || typeof u.inventory !== 'object') {
        u.inventory = {};
        _dirty = true;
    }

    return u;
}

// تحديث بيانات المستخدم بصيغة دمج
function updateUserData(userId, data) {
    _ensureCache();
    if (!_cache.users[userId]) getUserData(userId);
    _cache.users[userId] = { ..._cache.users[userId], ...data };
    _dirty = true;
    return _cache.users[userId];
}

// تحديث حقول محددة فقط (Atomic-like)
function updateFields(userId, fields) {
    _ensureCache();
    if (!_cache.users[userId]) getUserData(userId);
    for (const [key, value] of Object.entries(fields)) {
        _cache.users[userId][key] = value;
    }
    _dirty = true;
    return _cache.users[userId];
}

// إضافة أموال
function addMoney(userId, amount) {
    _ensureCache();
    if (!_cache.users[userId]) getUserData(userId);
    _cache.users[userId].balance = (_cache.users[userId].balance || 0) + Math.abs(amount);
    _dirty = true;
    return _cache.users[userId];
}

// خصم أموال
function removeMoney(userId, amount) {
    _ensureCache();
    if (!_cache.users[userId]) getUserData(userId);
    if ((_cache.users[userId].balance || 0) < amount) return false;
    _cache.users[userId].balance -= amount;
    _dirty = true;
    return true;
}

// تحويل أموال بين مستخدمين
function transferMoney(fromId, toId, amount) {
    _ensureCache();
    const from = getUserData(fromId);
    if ((from.balance || 0) < amount) return false;
    _cache.users[fromId].balance -= amount;
    if (!_cache.users[toId]) getUserData(toId);
    _cache.users[toId].balance = (_cache.users[toId].balance || 0) + amount;
    _dirty = true;
    return true;
}

// إضافة معاملة لسجل المعاملات (آخر 20 معاملة)
function addTransaction(userId, type, amount, description) {
    _ensureCache();
    if (!_cache.users[userId]) getUserData(userId);
    if (!_cache.users[userId].transactions) _cache.users[userId].transactions = [];
    _cache.users[userId].transactions.unshift({
        type, amount, description, timestamp: Date.now()
    });
    if (_cache.users[userId].transactions.length > 20) {
        _cache.users[userId].transactions.length = 20;
    }
    _dirty = true;
}

// الحصول على بيانات السيرفر
function getGuildData(guildId) {
    _ensureCache();
    if (!_cache.guilds[guildId]) {
        _cache.guilds[guildId] = {
            bankChannel: null,
            jailRole: null,
            muteRole: null,
            logChannel: null,
            punishmentsChannel: null,
            gamesChannel: null,
            setupComplete: false
        };
        _dirty = true;
    }
    const g = _cache.guilds[guildId];
    if (!('punishmentsChannel' in g)) g.punishmentsChannel = null;
    if (!('gamesChannel' in g)) g.gamesChannel = null;
    return g;
}

// تحديث بيانات السيرفر
function updateGuildData(guildId, data) {
    _ensureCache();
    if (!_cache.guilds[guildId]) getGuildData(guildId);
    _cache.guilds[guildId] = { ..._cache.guilds[guildId], ...data };
    _dirty = true;
    return _cache.guilds[guildId];
}

// الحصول على جميع المستخدمين
function getAllUsers() {
    _ensureCache();
    return _cache.users;
}

module.exports = {
    loadDatabase,
    saveDatabase,
    saveAll,
    getUserData,
    updateUserData,
    updateFields,
    addMoney,
    removeMoney,
    transferMoney,
    addTransaction,
    getGuildData,
    updateGuildData,
    getAllUsers
};
