'use strict';
const { BotSetting } = require('./models');

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
    welcomeGuildId:          '',
    welcomeChannelId:        '',
    welcomeImage:            '',
    welcomeAvatarX:          '960',
    welcomeAvatarY:          '540',
    welcomeAvatarWidth:      '256',
    welcomeAvatarHeight:     '256',
    welcomeAvatarRadius:     '50',
};

const cache = new Map();

async function loadBotSettings() {
    console.log('[BotSettingsDB] ⏳ Loading bot settings from MongoDB...');
    const settings = await BotSetting.find({}).lean();
    for (const s of settings) {
        cache.set(s.key, s.value);
    }
    console.log(`[BotSettingsDB] ✅ Loaded ${settings.length} settings into memory.`);
}

function _get(key) {
    if (cache.has(key)) return cache.get(key);
    return DEFAULTS[key] ?? null;
}

function _set(key, value) {
    const valStr = String(value);
    cache.set(key, valStr);
    BotSetting.updateOne({ key }, { $set: { value: valStr } }, { upsert: true })
        .catch(e => console.error('[BotSettingsDB] Update Error:', e.message));
}

function get(key) {
    const raw = _get(key);
    if (raw === null || raw === undefined) return DEFAULTS[key] ?? null;
    
    if (raw === 'true') return true;
    if (raw === 'false') return false;
    
    if (raw.startsWith('[') || raw.startsWith('{')) {
        try { return JSON.parse(raw); } catch {}
    }
    
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
    for (const [k, v] of cache.entries()) {
        result[k] = v;
    }
    
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

module.exports = { get, set, setMany, getAll, loadBotSettings, DEFAULTS };
