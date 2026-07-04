'use strict';

const fs   = require('fs');
const path = require('path');

const dbPath  = path.join(__dirname, '../data/economy.json');
const tmpPath = dbPath + '.tmp';   // الكتابة أولاً هنا
const bakPath = dbPath + '.bak';   // آخر نسخة سليمة

// ─────────────────────────────────────────────────────────────────────────────
// Cache ذكي — يقلل عمليات I/O من مئات إلى بضع دورات في الدقيقة
// ─────────────────────────────────────────────────────────────────────────────
let _cache = null;   // البيانات الكاملة في الذاكرة
let _dirty = false;  // هل هناك تغييرات غير محفوظة؟

// قراءة الملف مرة واحدة عند أول طلب
function _ensureCache() {
    if (_cache) return;
    try {
        if (fs.existsSync(dbPath)) {
            const raw = fs.readFileSync(dbPath, 'utf8');
            _cache = JSON.parse(raw);
        }
    } catch (e) {
        // محاولة استعادة النسخة الاحتياطية عند تلف الملف الرئيسي
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

// ─── حفظ atomic — يكتب على ملف مؤقت ثم يُعيد تسميته ─────────────────────────
function _flush() {
    if (!_dirty || !_cache) return;
    try {
        const data = JSON.stringify(_cache, null, 2);

        // 1. كتابة الملف المؤقت
        fs.writeFileSync(tmpPath, data, 'utf8');

        // 2. نسخ الملف الحالي كـ backup (صامت إذا لم يكن موجوداً)
        if (fs.existsSync(dbPath)) {
            fs.copyFileSync(dbPath, bakPath);
        }

        // 3. الاستبدال الآمن (atomic على أغلب الأنظمة)
        fs.renameSync(tmpPath, dbPath);

        _dirty = false;
    } catch (e) {
        console.error('[DB] ❌ خطأ في حفظ قاعدة البيانات:', e.message);
        // محاولة حفظ مباشر كخطة بديلة
        try {
            fs.writeFileSync(dbPath, JSON.stringify(_cache, null, 2), 'utf8');
            _dirty = false;
        } catch (e2) {
            console.error('[DB] ❌ فشل الحفظ البديل أيضاً:', e2.message);
        }
    }
}

// ─── حفظ دوري كل 30 ثانية ────────────────────────────────────────────────────
const _saveInterval = setInterval(_flush, 30_000);
_saveInterval.unref?.();

// ─── حفظ عند إغلاق البوت ─────────────────────────────────────────────────────
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

    // ── ترقية صامتة للبيانات القديمة ──────────────────────────────────────
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
    if (u.marriedTo   === undefined) { u.marriedTo   = null; _dirty = true; }
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

// ─── تحديث حقول محددة فقط (أكثر أماناً — لا يُضيّع حقولاً أخرى) ─────────────
function updateFields(userId, fields) {
    _ensureCache();
    if (!_cache.users[userId]) getUserData(userId);
    for (const [key, value] of Object.entries(fields)) {
        _cache.users[userId][key] = value;
    }
    _dirty = true;
    return _cache.users[userId];
}

// ─── إضافة أموال ─────────────────────────────────────────────────────────────
function addMoney(userId, amount) {
    _ensureCache();
    if (!_cache.users[userId]) getUserData(userId);
    _cache.users[userId].balance = (_cache.users[userId].balance || 0) + Math.abs(amount);
    _dirty = true;
    return _cache.users[userId];
}

// ─── خصم أموال (يعيد false إن لم يكفِ الرصيد) ────────────────────────────────
function removeMoney(userId, amount) {
    _ensureCache();
    if (!_cache.users[userId]) getUserData(userId);
    if ((_cache.users[userId].balance || 0) < amount) return false;
    _cache.users[userId].balance -= amount;
    _dirty = true;
    return true;
}

// ─── تحويل أموال بين مستخدمين ─────────────────────────────────────────────────
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

// ─── سجل المعاملات (آخر 25 فقط) ──────────────────────────────────────────────
function addTransaction(userId, type, amount, description) {
    _ensureCache();
    if (!_cache.users[userId]) getUserData(userId);
    if (!_cache.users[userId].transactions) _cache.users[userId].transactions = [];

    _cache.users[userId].transactions.unshift({
        type, amount, description, timestamp: Date.now(),
    });

    // احتفظ بآخر 25 فقط
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

// ─── قراءة كل المستخدمين ─────────────────────────────────────────────────────
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
    getAllUsers,
};
