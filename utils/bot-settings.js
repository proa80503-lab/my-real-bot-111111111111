'use strict';

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * bot-settings.js — Single Source of Truth للإعدادات القابلة للتغيير
 * ─────────────────────────────────────────────────────────────────────────────
 * هذا الملف هو المصدر الوحيد لجميع الإعدادات التي:
 *   1. يمكن تغييرها من Dashboard أثناء التشغيل
 *   2. يجب أن تبقى محفوظة بعد Restart
 *
 * يُقرأ من data/bot-settings.json ويُكتب عليه
 * يُستخدم من: random-interactions.js / auto-tasks.js / ghost-ping.js /
 *              commandHandler.js / dashboard-server.js
 * ─────────────────────────────────────────────────────────────────────────────
 */

const fs   = require('fs');
const path = require('path');

const SETTINGS_PATH = path.join(__dirname, '../data/bot-settings.json');

// ── القيم الافتراضية ─────────────────────────────────────────────────────────
const DEFAULTS = {
    // الرسائل التلقائية
    autoMessagesEnabled: true,        // تفعيل/تعطيل جميع الرسائل التلقائية
    randomEventInterval: 20,          // كل X دقيقة — أحداث عشوائية (مزاج، نكتة، حقيقة...)
    challengeInterval: 45,            // كل X دقيقة — تحديات سريعة
    moodMessageInterval: 180,         // كل X دقيقة — رسائل المزاج
    greetingInterval: 240,            // كل X دقيقة — تحيات حسب الوقت

    // تذكيرات يومية
    dailyReminderEnabled: true,       // تذكير اليومي الساعة 9 صباحاً
    dailySummaryEnabled: true,        // ملخص النشاط الساعة 9 مساءً

    // AI Auto-Reply
    aiRandomReplyEnabled: true,       // رد AI العشوائي كل N رسالة
    aiRandomReplyFrequency: 10,       // كل كم رسالة يرد AI تلقائياً

    // Ghost Ping
    ghostPingEnabled: false,          // منشن وهمي — معطّل افتراضياً
    ghostPingInterval: 21600000,      // 6 ساعات

    // أوامر معطّلة
    disabledCommands: [],             // أسماء الأوامر المعطّلة ['casino','rob',...]

    // إعدادات Dashboard
    dashboardKey: '',                 // يُملأ من .env أو يُولَّد مرة واحدة
};

// ── Cache داخلي ──────────────────────────────────────────────────────────────
let _settings = null;

/**
 * تحميل الإعدادات من الملف مع دمج القيم الافتراضية
 */
function load() {
    if (_settings) return _settings;

    try {
        if (fs.existsSync(SETTINGS_PATH)) {
            const raw = fs.readFileSync(SETTINGS_PATH, 'utf8');
            const saved = JSON.parse(raw);
            // دمج القيم الافتراضية مع المحفوظة (المحفوظة لها الأولوية)
            _settings = { ...DEFAULTS, ...saved };
        } else {
            _settings = { ...DEFAULTS };
            _persist(); // إنشاء الملف للمرة الأولى
        }
    } catch (e) {
        console.error('[BotSettings] ⚠️ خطأ في قراءة الإعدادات — استخدام القيم الافتراضية:', e.message);
        _settings = { ...DEFAULTS };
    }

    return _settings;
}

/**
 * حفظ الإعدادات إلى الملف (atomic write)
 */
function _persist() {
    try {
        const dir = path.dirname(SETTINGS_PATH);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

        const tmp = SETTINGS_PATH + '.tmp';
        fs.writeFileSync(tmp, JSON.stringify(_settings, null, 2), 'utf8');
        fs.renameSync(tmp, SETTINGS_PATH);
    } catch (e) {
        console.error('[BotSettings] ❌ خطأ في حفظ الإعدادات:', e.message);
        // محاولة حفظ مباشرة
        try { fs.writeFileSync(SETTINGS_PATH, JSON.stringify(_settings, null, 2), 'utf8'); } catch {}
    }
}

/**
 * قراءة قيمة إعداد واحدة
 * @param {string} key
 * @returns {*}
 */
function get(key) {
    return load()[key];
}

/**
 * تعديل قيمة إعداد واحدة وحفظها
 * @param {string} key
 * @param {*} value
 */
function set(key, value) {
    load(); // تأكد من تحميل الإعدادات أولاً
    _settings[key] = value;
    _persist();
}

/**
 * تعديل عدة إعدادات دفعة واحدة
 * @param {Object} updates
 */
function setMany(updates) {
    load();
    Object.assign(_settings, updates);
    _persist();
}

/**
 * قراءة جميع الإعدادات (نسخة للقراءة فقط)
 * @returns {Object}
 */
function getAll() {
    return { ...load() }; // نسخة لمنع التعديل المباشر
}

/**
 * إضافة أمر لقائمة الأوامر المعطّلة
 * @param {string} commandName
 * @returns {boolean} true إذا تمت الإضافة
 */
function disableCommand(commandName) {
    load();
    const name = commandName.toLowerCase();
    if (_settings.disabledCommands.includes(name)) return false;
    _settings.disabledCommands = [..._settings.disabledCommands, name];
    _persist();
    return true;
}

/**
 * إزالة أمر من قائمة الأوامر المعطّلة
 * @param {string} commandName
 * @returns {boolean} true إذا تمت الإزالة
 */
function enableCommand(commandName) {
    load();
    const name = commandName.toLowerCase();
    const before = _settings.disabledCommands.length;
    _settings.disabledCommands = _settings.disabledCommands.filter(c => c !== name);
    if (_settings.disabledCommands.length !== before) {
        _persist();
        return true;
    }
    return false;
}

/**
 * التحقق من أن أمراً معطّل
 * @param {string} commandName
 * @returns {boolean}
 */
function isCommandDisabled(commandName) {
    return load().disabledCommands.includes(commandName.toLowerCase());
}

/**
 * إعادة تحميل الإعدادات من الملف (بعد تغيير خارجي)
 */
function reload() {
    _settings = null;
    return load();
}

// ── تهيئة dashboardKey ────────────────────────────────────────────────────────
// يُقرأ من .env أولاً، إن لم يوجد يُولَّد مرة واحدة ويُحفظ
(function initDashboardKey() {
    const envKey = process.env.DASHBOARD_KEY;
    const current = load();

    if (envKey && envKey.length >= 8) {
        // استخدم المفتاح من .env دائماً
        if (_settings.dashboardKey !== envKey) {
            _settings.dashboardKey = envKey;
            _persist();
        }
    } else if (!current.dashboardKey) {
        // ولّد مفتاحاً مرة واحدة واحفظه
        const crypto = require('crypto');
        _settings.dashboardKey = crypto.randomBytes(20).toString('hex');
        _persist();
        console.log('[BotSettings] 🔑 تم توليد DASHBOARD_KEY جديد وحفظه في bot-settings.json');
        console.log('[BotSettings] 💡 لتثبيته، أضف DASHBOARD_KEY=' + _settings.dashboardKey + ' لملف .env');
    }
})();

module.exports = {
    get,
    set,
    setMany,
    getAll,
    disableCommand,
    enableCommand,
    isCommandDisabled,
    reload,
    DEFAULTS,
};
