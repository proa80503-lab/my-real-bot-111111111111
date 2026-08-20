'use strict';

const fs   = require('fs');
const path = require('path');

const dbPath  = path.join(__dirname, '../data/economy.json');
const tmpPath = dbPath + '.tmp';
const bakPath = dbPath + '.bak';

// ─── حدود مركزية — جميع الأكواد تخضع لها تلقائياً ───────────────────────────
const LIMITS = {
    MAX_WALLET: 5_000_000,   // أقصى رصيد في المحفظة
    MAX_BANK:   10_000_000,  // أقصى رصيد في البنك (قبل التوسعة)
    MAX_INVESTMENT: 1_000_000,
};
module.exports.LIMITS = LIMITS;

// ─────────────────────────────────────────────────────────────────────────────
// Cache ذكي — يقلل عمليات I/O
// ─────────────────────────────────────────────────────────────────────────────
let _cache = null;
let _dirty = false;

function _ensureCache() {
    if (_cache) return;
    try {
        if (fs.existsSync(dbPath)) {
            const raw = fs.readFileSync(dbPath, 'utf8');
            _cache = JSON.parse(raw);
        }
    } catch (e) {
        console.error('[DB] ⚠️ تعذّر قراءة قاعدة البيانات — محاولة استعادة النسخة الاحتياطية...', e.message);
        try {
            if (fs.existsSync(bakPath)) {
                const raw = fs.readFileSync(bakPath, 'utf8');
                _cache = JSON.parse(raw);
                console.log('[DB] ✅ تم استعادة النسخة الاحتياطية بنجاح.');
            }
        } catch (e2) {
            console.error('[DB] ❌ فشل استعادة النسخة الاحتياطية:', e2.message);
        }
    }
    if (!_cache || typeof _cache !== 'object') _cache = { users: {}, guilds: {} };
    if (!_cache.users)  _cache.users  = {};
    if (!_cache.guilds) _cache.guilds = {};
}

// ─── حفظ atomic ───────────────────────────────────────────────────────────────
function _flush() {
    if (!_dirty || !_cache) return;
    try {
        const data = JSON.stringify(_cache, null, 2);
        fs.writeFileSync(tmpPath, data, 'utf8');
        if (fs.existsSync(dbPath)) fs.copyFileSync(dbPath, bakPath);
        fs.renameSync(tmpPath, dbPath);
        _dirty = false;
    } catch (e) {
        console.error('[DB] ❌ خطأ في حفظ قاعدة البيانات:', e.message);
        try {
            fs.writeFileSync(dbPath, JSON.stringify(_cache, null, 2), 'utf8');
            _dirty = false;
        } catch (e2) {
            console.error('[DB] ❌ فشل الحفظ البديل أيضاً:', e2.message);
        }
    }
}

const _saveInterval = setInterval(_flush, 30_000);
_saveInterval.unref?.();

function saveAll() { _flush(); }
process.on('SIGINT',  () => { saveAll(); process.exit(0); });
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

// ─── القيم الافتراضية لمستخدم جديد ──────────────────────────────────────────
function _defaultUser() {
    return {
        balance:      1000,
        bank:         0,
        lastDaily:    null,
        lastWeekly:   null,
        lastWork:     null,
        lastRob:      null,
        dailyStreak:  0,
        inventory:    {},
        warnings:     0,
        jailTime:     null,
        muteTime:     null,
        xp:           0,
        level:        1,
        achievements: [],
        stats: {
            gamesPlayed:   0,
            gamesWon:      0,
            totalWagered:  0,
            totalWon:      0,
            biggestWin:    0,
        },
        transactions: [],
        marriedTo:    null,
        marriedSince: null,
    };
}

// ─── الحصول على بيانات المستخدم ───────────────────────────────────────────────
function getUserData(userId) {
    _ensureCache();

    if (!_cache.users[userId]) {
        _cache.users[userId] = _defaultUser();
        _dirty = true;
    }

    const u = _cache.users[userId];

    // ── ترقية صامتة للبيانات القديمة ─────────────────────────────────────────
    if (u.xp           === undefined) { u.xp           = 0;    _dirty = true; }
    if (!u.level)                     { u.level         = 1;    _dirty = true; }
    if (!u.achievements)              { u.achievements  = [];   _dirty = true; }
    if (!u.transactions)              { u.transactions  = [];   _dirty = true; }
    if (u.dailyStreak  === undefined) { u.dailyStreak   = 0;    _dirty = true; }
    if (!u.stats) {
        u.stats = { gamesPlayed: 0, gamesWon: 0, totalWagered: 0, totalWon: 0, biggestWin: 0 };
        _dirty = true;
    }

    // دمج حقول partner القديمة → marriedTo الجديدة
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
    if (u.marriedTo    === undefined) { u.marriedTo    = null; _dirty = true; }
    if (u.marriedSince === undefined) { u.marriedSince = null; _dirty = true; }

    // إصلاح inventory array قديم → object
    if (Array.isArray(u.inventory)) {
        const obj = {};
        for (const item of u.inventory) {
            if (item?.id) obj[item.id] = item;
        }
        u.inventory = obj;
        _dirty = true;
    }
    if (!u.inventory || typeof u.inventory !== 'object' || Array.isArray(u.inventory)) {
        u.inventory = {};
        _dirty = true;
    }

    return u;
}

// ─── تحديث بيانات المستخدم بالكامل (merge) ────────────────────────────────────
function updateUserData(userId, data) {
    _ensureCache();
    if (!_cache.users[userId]) getUserData(userId);
    _cache.users[userId] = { ..._cache.users[userId], ...data };
    _dirty = true;
    return _cache.users[userId];
}

// ─── تحديث حقول محددة فقط ────────────────────────────────────────────────────
function updateFields(userId, fields) {
    _ensureCache();
    if (!_cache.users[userId]) getUserData(userId);
    for (const [key, value] of Object.entries(fields)) {
        _cache.users[userId][key] = value;
    }
    _dirty = true;
    return _cache.users[userId];
}

// ─── إضافة أموال للمحفظة (مع تطبيق الحد الأقصى تلقائياً) ─────────────────────
// يُعيد المبلغ الفعلي الذي تمت إضافته (قد يكون أقل بسبب الحد)
function addMoney(userId, amount) {
    _ensureCache();
    if (!_cache.users[userId]) getUserData(userId);
    const u = _cache.users[userId];
    const maxWallet = LIMITS.MAX_WALLET;
    const current = u.balance || 0;
    // تطبيق الحد الأقصى مركزياً
    const actualAdd = Math.max(0, Math.min(Math.abs(amount), maxWallet - current));
    u.balance = current + actualAdd;
    _dirty = true;
    return actualAdd; // يُعيد المبلغ الفعلي المُضاف
}

// ─── خصم أموال من المحفظة (يعيد false إن لم يكفِ الرصيد) ─────────────────────
function removeMoney(userId, amount) {
    _ensureCache();
    if (!_cache.users[userId]) getUserData(userId);
    if ((_cache.users[userId].balance || 0) < amount) return false;
    _cache.users[userId].balance -= amount;
    _dirty = true;
    return true;
}

// ─── إضافة أموال للبنك (مع تطبيق الحد الأقصى للبنك) ──────────────────────────
// يُعيد المبلغ الفعلي المُودَع، أو false إن كان البنك ممتلئاً
function addMoneyToBank(userId, amount) {
    _ensureCache();
    if (!_cache.users[userId]) getUserData(userId);
    const u = _cache.users[userId];
    const maxBank = Math.max(LIMITS.MAX_BANK, (u.bankCap || 0));
    const current = u.bank || 0;
    if (current >= maxBank) return 0;
    const actualDeposit = Math.min(Math.abs(amount), maxBank - current);
    u.bank = current + actualDeposit;
    _dirty = true;
    return actualDeposit;
}

// ─── خصم أموال من البنك (يعيد false إن لم يكفِ الرصيد) ───────────────────────
function removeMoneyFromBank(userId, amount) {
    _ensureCache();
    if (!_cache.users[userId]) getUserData(userId);
    if ((_cache.users[userId].bank || 0) < amount) return false;
    _cache.users[userId].bank -= amount;
    _dirty = true;
    return true;
}

// ─── تحويل أموال بين مستخدمين (من محفظة لمحفظة) ─────────────────────────────
function transferMoney(fromId, toId, amount) {
    _ensureCache();
    const from = getUserData(fromId);
    if ((from.balance || 0) < amount) return false;
    _cache.users[fromId].balance -= amount;
    if (!_cache.users[toId]) getUserData(toId);
    // نستخدم addMoney للتحقق من الحد عند المستلم
    const added = addMoney(toId, amount);
    // إذا لم يُضف بالكامل، نُعيد الفرق للمُرسل
    if (added < amount) {
        _cache.users[fromId].balance += (amount - added);
    }
    _dirty = true;
    return true;
}

// ─── سجل المعاملات (آخر 25 فقط) ──────────────────────────────────────────────
function addTransaction(userId, type, amount, description) {
    _ensureCache();
    if (!_cache.users[userId]) getUserData(userId);
    if (!_cache.users[userId].transactions) _cache.users[userId].transactions = [];

    _cache.users[userId].transactions.unshift({
        type, amount, description, timestamp: Date.now(),
    });

    if (_cache.users[userId].transactions.length > 25) {
        _cache.users[userId].transactions.length = 25;
    }
    _dirty = true;
}

// ─── بيانات السيرفر ───────────────────────────────────────────────────────────
function getGuildData(guildId) {
    _ensureCache();
    if (!_cache.guilds[guildId]) {
        _cache.guilds[guildId] = {
            bankChannel:        null,
            jailRole:           null,
            muteRole:           null,
            logChannel:         null,
            punishmentsChannel: null,
            gamesChannel:       null,
            setupComplete:      false,
        };
        _dirty = true;
    }
    const g = _cache.guilds[guildId];
    if (!('punishmentsChannel' in g)) { g.punishmentsChannel = null; _dirty = true; }
    if (!('gamesChannel'       in g)) { g.gamesChannel       = null; _dirty = true; }
    return g;
}

function updateGuildData(guildId, data) {
    _ensureCache();
    if (!_cache.guilds[guildId]) getGuildData(guildId);
    _cache.guilds[guildId] = { ..._cache.guilds[guildId], ...data };
    _dirty = true;
    return _cache.guilds[guildId];
}

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
    addMoneyToBank,
    removeMoneyFromBank,
    transferMoney,
    addTransaction,
    getGuildData,
    updateGuildData,
    getAllUsers,
    LIMITS,
};
