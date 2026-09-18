'use strict';

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * bot-settings.js (Proxy)
 * ─────────────────────────────────────────────────────────────────────────────
 * تم نقل التخزين إلى MongoDB (عبر bot-settings-db.js)
 * هذا الملف يعمل الآن كوسيط (Proxy) للحفاظ على توافق الكود القديم دون الحاجة
 * لتعديل جميع الملفات التي تستدعي utils/bot-settings.js
 * ─────────────────────────────────────────────────────────────────────────────
 */

const botSettingsDb = require('../src/database/bot-settings-db');

function get(key) {
    return botSettingsDb.get(key);
}

function set(key, value) {
    botSettingsDb.set(key, value);
}

function setMany(updates) {
    botSettingsDb.setMany(updates);
}

function getAll() {
    return botSettingsDb.getAll();
}

function disableCommand(commandName) {
    const disabled = get('disabledCommands') || [];
    const name = commandName.toLowerCase();
    if (disabled.includes(name)) return false;
    
    disabled.push(name);
    set('disabledCommands', disabled);
    return true;
}

function enableCommand(commandName) {
    let disabled = get('disabledCommands') || [];
    const name = commandName.toLowerCase();
    const before = disabled.length;
    
    disabled = disabled.filter(c => c !== name);
    if (disabled.length !== before) {
        set('disabledCommands', disabled);
        return true;
    }
    return false;
}

function isCommandDisabled(commandName) {
    const disabled = get('disabledCommands') || [];
    return disabled.includes(commandName.toLowerCase());
}

function reload() {
    // لم يعد هناك حاجة لـ reload لأن البيانات تتزامن من الذاكرة (Memory Cache)
    return getAll();
}

// ── تهيئة dashboardKey ────────────────────────────────────────────────────────
// يُقرأ من .env أولاً، إن لم يوجد يُولَّد مرة واحدة ويُحفظ
(function initDashboardKey() {
    // نؤجلها قليلاً حتى يتم تحميل البيانات من MongoDB في index.js
    setTimeout(() => {
        const envKey = process.env.DASHBOARD_KEY;
        const currentKey = get('dashboardKey');

        if (envKey && envKey.length >= 8) {
            if (currentKey !== envKey) {
                set('dashboardKey', envKey);
            }
        } else if (!currentKey) {
            const crypto = require('crypto');
            const newKey = crypto.randomBytes(20).toString('hex');
            set('dashboardKey', newKey);
            console.log('[BotSettings] 🔑 تم توليد DASHBOARD_KEY جديد وحفظه في قاعدة البيانات');
            console.log('[BotSettings] 💡 لتثبيته، أضف DASHBOARD_KEY=' + newKey + ' لملف .env');
        }
    }, 5000); // تأخير 5 ثواني
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
    DEFAULTS: botSettingsDb.DEFAULTS,
};
