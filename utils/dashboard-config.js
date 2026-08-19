'use strict';

const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, '../data/dashboard-config.json');

// القيم الافتراضية
const defaultData = {
    autoResponses: [],   // { id, trigger, response, exactMatch }
    customCommands: [],  // { id, name, response }
};

function ensureDir() {
    const dir = path.dirname(configPath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

function loadConfig() {
    ensureDir();
    try {
        if (fs.existsSync(configPath)) {
            const raw = fs.readFileSync(configPath, 'utf8');
            const data = JSON.parse(raw);
            return { ...defaultData, ...data };
        }
    } catch (err) {
        console.error('[DashboardConfig] Error loading config:', err.message);
    }
    return { ...defaultData };
}

function saveConfig(data) {
    ensureDir();
    try {
        fs.writeFileSync(configPath, JSON.stringify(data, null, 2), 'utf8');
        return true;
    } catch (err) {
        console.error('[DashboardConfig] Error saving config:', err.message);
        return false;
    }
}

// ─── دوال الردود التلقائية ──────────────────────────────────────────────
function getAutoResponses() {
    return loadConfig().autoResponses;
}

function addAutoResponse(trigger, response, exactMatch = false) {
    const data = loadConfig();
    const id = Date.now().toString();
    data.autoResponses.push({ id, trigger, response, exactMatch });
    saveConfig(data);
    return id;
}

function deleteAutoResponse(id) {
    const data = loadConfig();
    const initLen = data.autoResponses.length;
    data.autoResponses = data.autoResponses.filter(r => r.id !== id);
    if (data.autoResponses.length !== initLen) {
        saveConfig(data);
        return true;
    }
    return false;
}

// ─── دوال الأوامر المخصصة ───────────────────────────────────────────────
function getCustomCommands() {
    return loadConfig().customCommands;
}

function addCustomCommand(name, response) {
    const data = loadConfig();
    const id = Date.now().toString();
    // إزالة البرفكس إذا كان موجوداً
    name = name.toLowerCase().replace(/^[!/#.]/, '').trim();
    data.customCommands.push({ id, name, response });
    saveConfig(data);
    return id;
}

function deleteCustomCommand(id) {
    const data = loadConfig();
    const initLen = data.customCommands.length;
    data.customCommands = data.customCommands.filter(c => c.id !== id);
    if (data.customCommands.length !== initLen) {
        saveConfig(data);
        return true;
    }
    return false;
}

module.exports = {
    loadConfig,
    saveConfig,
    getAutoResponses,
    addAutoResponse,
    deleteAutoResponse,
    getCustomCommands,
    addCustomCommand,
    deleteCustomCommand
};
