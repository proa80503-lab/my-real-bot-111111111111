'use strict';

/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║  utils/database.js — Proxy شفاف لقاعدة البيانات الجديدة        ║
 * ║                                                                   ║
 * ║  ⚡ مُحوَّل لاستخدام SQLite (better-sqlite3) بدلاً من JSON       ║
 * ║  ✅ متوافق 100% مع الكود القديم — لا يحتاج تغيير أي import      ║
 * ║                                                                   ║
 * ║  جميع الأوامر والـ events تستمر في العمل بدون تعديل             ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */

// ── محاولة استخدام SQLite (المفضل) ─────────────────────────────────────────
let _db;
try {
    _db = require('../src/database/db');
    // اختبار الاتصال
    _db.getDb();
    console.log('[DB] ✅ SQLite جاهز — أداء عالي مضمون');
} catch (err) {
    console.error('[DB] ⚠️ فشل تحميل SQLite، جاري الرجوع للـ JSON القديم:', err.message);
    console.error('[DB] تأكد من تشغيل: npm install better-sqlite3');
    // Fallback للـ JSON القديم
    _db = _buildJsonFallback();
}

module.exports = _db;

// ─────────────────────────────────────────────────────────────────────────────
// Fallback للـ JSON القديم (في حالة فشل SQLite)
// ─────────────────────────────────────────────────────────────────────────────
function _buildJsonFallback() {
    const fs   = require('fs');
    const path = require('path');

    const dbPath  = path.join(__dirname, '../data/economy.json');
    const tmpPath = dbPath + '.tmp';
    const bakPath = dbPath + '.bak';

    const LIMITS = {
        MAX_WALLET:    5_000_000,
        MAX_BANK:     10_000_000,
        MAX_INVESTMENT: 1_000_000,
    };

    let _cache = null;
    let _dirty = false;

    function _ensureCache() {
        if (_cache) return;
        try {
            if (fs.existsSync(dbPath)) _cache = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
        } catch (e) {
            try { if (fs.existsSync(bakPath)) _cache = JSON.parse(fs.readFileSync(bakPath, 'utf8')); } catch {}
        }
        if (!_cache || typeof _cache !== 'object') _cache = { users: {}, guilds: {} };
        if (!_cache.users)  _cache.users  = {};
        if (!_cache.guilds) _cache.guilds = {};
    }

    function _flush() {
        if (!_dirty || !_cache) return;
        try {
            const data = JSON.stringify(_cache, null, 2);
            fs.writeFileSync(tmpPath, data, 'utf8');
            if (fs.existsSync(dbPath)) fs.copyFileSync(dbPath, bakPath);
            fs.renameSync(tmpPath, dbPath);
            _dirty = false;
        } catch (e) {
            console.error('[DB-JSON] خطأ في الحفظ:', e.message);
        }
    }

    const _saveInterval = setInterval(_flush, 30_000);
    _saveInterval.unref?.();

    function _defaultUser() {
        return {
            balance: 1000, bank: 0, lastDaily: null, lastWeekly: null, lastWork: null,
            lastRob: null, dailyStreak: 0, inventory: {}, warnings: 0, jailTime: null,
            muteTime: null, xp: 0, level: 1, achievements: [], stats: { gamesPlayed: 0, gamesWon: 0, totalWagered: 0, totalWon: 0, biggestWin: 0 },
            transactions: [], marriedTo: null, marriedSince: null,
        };
    }

    function getUserData(userId) {
        _ensureCache();
        if (!_cache.users[userId]) { _cache.users[userId] = _defaultUser(); _dirty = true; }
        const u = _cache.users[userId];
        if (u.xp === undefined)         { u.xp = 0; _dirty = true; }
        if (!u.level)                   { u.level = 1; _dirty = true; }
        if (!u.achievements)            { u.achievements = []; _dirty = true; }
        if (!u.transactions)            { u.transactions = []; _dirty = true; }
        if (u.dailyStreak === undefined) { u.dailyStreak = 0; _dirty = true; }
        if (!u.stats) { u.stats = { gamesPlayed: 0, gamesWon: 0, totalWagered: 0, totalWon: 0, biggestWin: 0 }; _dirty = true; }
        if (u.partner !== undefined && u.marriedTo === undefined) { u.marriedTo = u.partner; delete u.partner; _dirty = true; }
        if (u.marriageDate !== undefined && u.marriedSince === undefined) { u.marriedSince = u.marriageDate; delete u.marriageDate; _dirty = true; }
        if (u.marriedTo === undefined)   { u.marriedTo = null; _dirty = true; }
        if (u.marriedSince === undefined){ u.marriedSince = null; _dirty = true; }
        if (Array.isArray(u.inventory)) {
            const obj = {};
            for (const item of u.inventory) { if (item?.id) obj[item.id] = item; }
            u.inventory = obj; _dirty = true;
        }
        if (!u.inventory || typeof u.inventory !== 'object' || Array.isArray(u.inventory)) { u.inventory = {}; _dirty = true; }
        return u;
    }

    function updateUserData(userId, data) {
        _ensureCache();
        if (!_cache.users[userId]) getUserData(userId);
        _cache.users[userId] = { ..._cache.users[userId], ...data };
        _dirty = true;
        return _cache.users[userId];
    }

    function updateFields(userId, fields) {
        _ensureCache();
        if (!_cache.users[userId]) getUserData(userId);
        for (const [k, v] of Object.entries(fields)) _cache.users[userId][k] = v;
        _dirty = true;
        return _cache.users[userId];
    }

    function addMoney(userId, amount) {
        _ensureCache();
        if (!_cache.users[userId]) getUserData(userId);
        const u = _cache.users[userId];
        const current = u.balance || 0;
        const actualAdd = Math.max(0, Math.min(Math.abs(amount), LIMITS.MAX_WALLET - current));
        u.balance = current + actualAdd; _dirty = true;
        return actualAdd;
    }

    function removeMoney(userId, amount) {
        _ensureCache();
        if (!_cache.users[userId]) getUserData(userId);
        if ((_cache.users[userId].balance || 0) < amount) return false;
        _cache.users[userId].balance -= amount; _dirty = true;
        return true;
    }

    function addMoneyToBank(userId, amount) {
        _ensureCache();
        if (!_cache.users[userId]) getUserData(userId);
        const u = _cache.users[userId];
        const maxBank = Math.max(LIMITS.MAX_BANK, u.bankCap || 0);
        const current = u.bank || 0;
        if (current >= maxBank) return 0;
        const actualDeposit = Math.min(Math.abs(amount), maxBank - current);
        u.bank = current + actualDeposit; _dirty = true;
        return actualDeposit;
    }

    function removeMoneyFromBank(userId, amount) {
        _ensureCache();
        if (!_cache.users[userId]) getUserData(userId);
        if ((_cache.users[userId].bank || 0) < amount) return false;
        _cache.users[userId].bank -= amount; _dirty = true;
        return true;
    }

    function transferMoney(fromId, toId, amount) {
        _ensureCache();
        const from = getUserData(fromId);
        if ((from.balance || 0) < amount) return false;
        _cache.users[fromId].balance -= amount;
        if (!_cache.users[toId]) getUserData(toId);
        const added = addMoney(toId, amount);
        if (added < amount) _cache.users[fromId].balance += (amount - added);
        _dirty = true;
        return true;
    }

    function addTransaction(userId, type, amount, description) {
        _ensureCache();
        if (!_cache.users[userId]) getUserData(userId);
        if (!_cache.users[userId].transactions) _cache.users[userId].transactions = [];
        _cache.users[userId].transactions.unshift({ type, amount, description, timestamp: Date.now() });
        if (_cache.users[userId].transactions.length > 25) _cache.users[userId].transactions.length = 25;
        _dirty = true;
    }

    function getGuildData(guildId) {
        _ensureCache();
        if (!_cache.guilds[guildId]) {
            _cache.guilds[guildId] = { bankChannel: null, jailRole: null, muteRole: null, logChannel: null, punishmentsChannel: null, gamesChannel: null, setupComplete: false };
            _dirty = true;
        }
        const g = _cache.guilds[guildId];
        if (!('punishmentsChannel' in g)) { g.punishmentsChannel = null; _dirty = true; }
        if (!('gamesChannel' in g)) { g.gamesChannel = null; _dirty = true; }
        return g;
    }

    function updateGuildData(guildId, data) {
        _ensureCache();
        if (!_cache.guilds[guildId]) getGuildData(guildId);
        _cache.guilds[guildId] = { ..._cache.guilds[guildId], ...data };
        _dirty = true;
        return _cache.guilds[guildId];
    }

    function getAllUsers() { _ensureCache(); return _cache.users; }
    function loadDatabase() { _ensureCache(); return _cache; }
    function saveDatabase(db) { _cache = db; _dirty = true; return true; }
    function saveAll() { _flush(); }
    function getLeaderboard(field = 'balance', limit = 10) {
        _ensureCache();
        return Object.entries(_cache.users)
            .map(([uid, u]) => ({ user_id: uid, value: u[field] || 0 }))
            .sort((a, b) => b.value - a.value)
            .slice(0, limit);
    }

    process.on('SIGINT',  () => { saveAll(); process.exit(0); });
    process.on('SIGTERM', () => { saveAll(); process.exit(0); });

    return {
        LIMITS, getUserData, updateUserData, updateFields,
        addMoney, removeMoney, addMoneyToBank, removeMoneyFromBank, transferMoney,
        addTransaction, getGuildData, updateGuildData, getAllUsers, getLeaderboard,
        loadDatabase, saveDatabase, saveAll,
    };
}

