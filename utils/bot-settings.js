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
