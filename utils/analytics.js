'use strict';

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║  📊 ANALYTICS ENGINE v2.0 — محرك التحليلات المتقدم                      ║
 * ║  تتبع الأحداث الآني | رسوم بيانية نصية | تقارير ذكية                   ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

const fs = require('fs');
const path = require('path');

const ANALYTICS_FILE = path.join(__dirname, '../data/analytics.json');

let _data = null;
let _dirty = false;

function _load() {
    if (_data) return _data;
    try {
        if (fs.existsSync(ANALYTICS_FILE)) {
            _data = JSON.parse(fs.readFileSync(ANALYTICS_FILE, 'utf8'));
        }
    } catch { /* ignore */ }
    if (!_data) _data = _defaultData();
    _ensure(_data);
    return _data;
}

function _defaultData() {
    return {
        hourlyActivity: {},   // { 'YYYY-MM-DD:HH': count }
        dailyCommands: {},    // { 'YYYY-MM-DD': { cmd: count } }
        userActivity: {},     // { userId: { messages, commands, lastSeen, joinDate } }
        economyFlow: {},      // { 'YYYY-MM-DD': { earned, spent, transferred } }
        guildStats: {},       // { guildId: { members, messages, commands } }
        topCommands: {},      // { cmd: count }
        events: [],           // آخر 1000 حدث مهم
        sessions: {},         // { userId: { start, end, actions } }
        performance: {
            avgResponseMs: [],
            errors: [],
            restarts: 0
        }
    };
}

function _ensure(d) {
    const keys = ['hourlyActivity', 'dailyCommands', 'userActivity', 'economyFlow',
        'guildStats', 'topCommands', 'events', 'sessions', 'performance'];
    for (const k of keys) {
        if (!d[k]) {
            d[k] = k === 'events' || k === 'performance.avgResponseMs' || k === 'performance.errors' ? [] : {};
        }
    }
    if (!d.performance) d.performance = { avgResponseMs: [], errors: [], restarts: 0 };
    if (!Array.isArray(d.performance.avgResponseMs)) d.performance.avgResponseMs = [];
    if (!Array.isArray(d.performance.errors)) d.performance.errors = [];
}

function _flush() {
    if (!_dirty || !_data) return;
    try {
        const dir = path.dirname(ANALYTICS_FILE);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(ANALYTICS_FILE, JSON.stringify(_data, null, 2), 'utf8');
        _dirty = false;
    } catch (e) {
        console.error('[Analytics] خطأ في الحفظ:', e.message);
    }
}

setInterval(_flush, 3 * 60 * 1000).unref?.();
process.on('SIGINT', () => _flush());
process.on('SIGTERM', () => _flush());

// ─── API العامة ──────────────────────────────────────────────────────────────

function trackCommand(commandName, userId, guildId) {
    const d = _load();
    const now = new Date();
    const dateKey = now.toISOString().slice(0, 10);
    const hourKey = `${dateKey}:${now.getHours().toString().padStart(2, '0')}`;

    // نشاط الساعة
    d.hourlyActivity[hourKey] = (d.hourlyActivity[hourKey] || 0) + 1;

    // أوامر اليوم
    if (!d.dailyCommands[dateKey]) d.dailyCommands[dateKey] = {};
    d.dailyCommands[dateKey][commandName] = (d.dailyCommands[dateKey][commandName] || 0) + 1;

    // الأوامر الأكثر استخداماً
    d.topCommands[commandName] = (d.topCommands[commandName] || 0) + 1;

    // نشاط المستخدم
    if (!d.userActivity[userId]) {
        d.userActivity[userId] = { messages: 0, commands: 0, lastSeen: Date.now(), joinDate: Date.now() };
    }
    d.userActivity[userId].commands++;
    d.userActivity[userId].lastSeen = Date.now();

    // إحصائيات السيرفر
    if (guildId) {
        if (!d.guildStats[guildId]) d.guildStats[guildId] = { members: 0, messages: 0, commands: 0 };
        d.guildStats[guildId].commands++;
    }

    _dirty = true;
}

function trackMessage(userId, guildId) {
    const d = _load();
    const now = new Date();
    const hourKey = `${now.toISOString().slice(0, 10)}:${now.getHours().toString().padStart(2, '0')}`;

    d.hourlyActivity[hourKey] = (d.hourlyActivity[hourKey] || 0) + 1;

    if (!d.userActivity[userId]) {
        d.userActivity[userId] = { messages: 0, commands: 0, lastSeen: Date.now(), joinDate: Date.now() };
    }
    d.userActivity[userId].messages++;
    d.userActivity[userId].lastSeen = Date.now();

    if (guildId) {
        if (!d.guildStats[guildId]) d.guildStats[guildId] = { members: 0, messages: 0, commands: 0 };
        d.guildStats[guildId].messages++;
    }

    _dirty = true;
}

function trackEconomy(type, amount, userId) {
    const d = _load();
    const dateKey = new Date().toISOString().slice(0, 10);
    if (!d.economyFlow[dateKey]) d.economyFlow[dateKey] = { earned: 0, spent: 0, transferred: 0 };

    if (type === 'earn') d.economyFlow[dateKey].earned += amount;
    else if (type === 'spend') d.economyFlow[dateKey].spent += amount;
    else if (type === 'transfer') d.economyFlow[dateKey].transferred += amount;

    _dirty = true;
}

function trackEvent(type, data = {}) {
    const d = _load();
    d.events.push({ type, data, ts: Date.now() });
    if (d.events.length > 1000) d.events = d.events.slice(-800);
    _dirty = true;
}

function trackResponseTime(ms) {
    const d = _load();
    d.performance.avgResponseMs.push(ms);
    if (d.performance.avgResponseMs.length > 500) d.performance.avgResponseMs.shift();
    _dirty = true;
}

function trackError(error, context = '') {
    const d = _load();
    d.performance.errors.push({
        message: error.message || String(error),
        context,
        ts: Date.now()
    });
    if (d.performance.errors.length > 200) d.performance.errors.shift();
    _dirty = true;
}

// ─── التقارير ─────────────────────────────────────────────────────────────────

function getHourlyChart(hours = 24) {
    const d = _load();
    const now = new Date();
    const bars = [];
    const maxVal = 10;

    for (let i = hours - 1; i >= 0; i--) {
        const dt = new Date(now.getTime() - i * 60 * 60 * 1000);
        const key = `${dt.toISOString().slice(0, 10)}:${dt.getHours().toString().padStart(2, '0')}`;
        const count = d.hourlyActivity[key] || 0;
        bars.push({ hour: dt.getHours(), count });
    }

    // رسم بياني نصي
    const max = Math.max(...bars.map(b => b.count), 1);
    const lines = [];
    for (let row = 5; row >= 1; row--) {
        const threshold = (max / 5) * row;
        const line = bars.slice(-12).map(b => b.count >= threshold ? '█' : '░').join('');
        lines.push(line);
    }
    const hourLabels = bars.slice(-12).map(b => b.hour.toString().padStart(2, '0')).join(' ');

    return {
        chart: lines.join('\n'),
        labels: hourLabels,
        data: bars,
        max,
        total: bars.reduce((s, b) => s + b.count, 0)
    };
}

function getDailyReport() {
    const d = _load();
    const today = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

    const todayCommands = d.dailyCommands[today] || {};
    const yesterdayCommands = d.dailyCommands[yesterday] || {};

    const todayTotal = Object.values(todayCommands).reduce((a, b) => a + b, 0);
    const yesterdayTotal = Object.values(yesterdayCommands).reduce((a, b) => a + b, 0);
    const change = yesterdayTotal > 0 ? ((todayTotal - yesterdayTotal) / yesterdayTotal * 100).toFixed(1) : 'N/A';

    const topToday = Object.entries(todayCommands)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

    const todayEco = d.economyFlow[today] || { earned: 0, spent: 0, transferred: 0 };

    const avgMs = d.performance.avgResponseMs.length > 0
        ? (d.performance.avgResponseMs.reduce((a, b) => a + b, 0) / d.performance.avgResponseMs.length).toFixed(0)
        : 'N/A';

    return {
        date: today,
        totalCommands: todayTotal,
        changeFromYesterday: change,
        topCommands: topToday,
        economy: todayEco,
        avgResponseMs: avgMs,
        activeUsers: Object.values(d.userActivity).filter(u =>
            Date.now() - u.lastSeen < 24 * 60 * 60 * 1000
        ).length,
        errors: d.performance.errors.filter(e => Date.now() - e.ts < 24 * 60 * 60 * 1000).length
    };
}

function getAllTimeStats() {
    const d = _load();
    const totalCommands = Object.values(d.topCommands).reduce((a, b) => a + b, 0);
    const totalMessages = Object.values(d.userActivity).reduce((s, u) => s + (u.messages || 0), 0);

    const topAllTime = Object.entries(d.topCommands)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);

    const mostActiveUsers = Object.entries(d.userActivity)
        .sort((a, b) => (b[1].commands + b[1].messages) - (a[1].commands + a[1].messages))
        .slice(0, 5);

    return {
        totalCommands,
        totalMessages,
        totalUsers: Object.keys(d.userActivity).length,
        topCommands: topAllTime,
        mostActiveUsers,
        guildsTracked: Object.keys(d.guildStats).length
    };
}

function getUserStats(userId) {
    const d = _load();
    return d.userActivity[userId] || { messages: 0, commands: 0, lastSeen: null };
}

function getGuildStats(guildId) {
    const d = _load();
    return d.guildStats[guildId] || { members: 0, messages: 0, commands: 0 };
}

module.exports = {
    trackCommand,
    trackMessage,
    trackEconomy,
    trackEvent,
    trackResponseTime,
    trackError,
    getHourlyChart,
    getDailyReport,
    getAllTimeStats,
    getUserStats,
    getGuildStats
};
