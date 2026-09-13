'use strict';
const path = require('path');
const { initializeSchema } = require('./schema');
const LIMITS = { MAX_WALLET: 5000000, MAX_BANK: 10000000, MAX_INVESTMENT: 1000000 };
const DB_PATH = path.join(__dirname, '../../data/bot.db');
let _db = null;
function getDb() {
    if (_db) return _db;
    try {
        const Database = require('better-sqlite3');
        _db = new Database(DB_PATH);
        initializeSchema(_db);
        console.log('[DB] SQLite connected:', DB_PATH);
    } catch (err) {
        console.error('[DB] FATAL:', err.message);
        process.exit(1);
    }
    return _db;
}
const _stmts = {};
function stmt(sql) {
    if (!_stmts[sql]) _stmts[sql] = getDb().prepare(sql);
    return _stmts[sql];
}
function _defaultUser(userId) {
    return { user_id: userId, balance: 1000, bank: 0, bank_cap: 0, xp: 0, level: 1, daily_streak: 0, warnings: 0, last_daily: null, last_weekly: null, last_work: null, last_rob: null, jail_time: null, mute_time: null, married_to: null, married_since: null, color: null, birthday: null, reputation: 0, last_rep: null, vault: 0 };
}
function getUserData(userId) {
    const db = getDb();
    let user = stmt('SELECT * FROM users WHERE user_id = ?').get(userId);
    if (!user) {
        const def = _defaultUser(userId);
        stmt('INSERT INTO users (user_id, balance, bank, xp, level, daily_streak, warnings, vault, reputation) VALUES (@user_id, @balance, @bank, @xp, @level, @daily_streak, @warnings, @vault, @reputation)').run(def);
        stmt('INSERT OR IGNORE INTO user_stats (user_id) VALUES (?)').run(userId);
        user = stmt('SELECT * FROM users WHERE user_id = ?').get(userId);
    }
    const stats = stmt('SELECT * FROM user_stats WHERE user_id = ?').get(userId) || { games_played: 0, games_won: 0, total_wagered: 0, total_won: 0, biggest_win: 0 };
    const inventoryRows = stmt('SELECT item_id, quantity, expires_at FROM inventory WHERE user_id = ?').all(userId);
    const inventory = {};
    for (const row of inventoryRows) inventory[row.item_id] = { quantity: row.quantity, expiresAt: row.expires_at };
    const achievementRows = stmt('SELECT achievement_id FROM achievements WHERE user_id = ?').all(userId);
    const achievements = achievementRows.map(r => r.achievement_id);
    const transactions = stmt('SELECT type, amount, description, created_at FROM transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT 25').all(userId);
    return {
        balance: user.balance, bank: user.bank, bankCap: user.bank_cap, xp: user.xp, level: user.level,
        dailyStreak: user.daily_streak, warnings: user.warnings, lastDaily: user.last_daily ? user.last_daily * 1000 : null,
        lastWeekly: user.last_weekly ? user.last_weekly * 1000 : null, lastWork: user.last_work ? user.last_work * 1000 : null,
        lastRob: user.last_rob ? user.last_rob * 1000 : null, jailTime: user.jail_time ? user.jail_time * 1000 : null,
        muteTime: user.mute_time ? user.mute_time * 1000 : null, marriedTo: user.married_to, marriedSince: user.married_since,
        color: user.color, birthday: user.birthday, reputation: user.reputation, lastRep: user.last_rep, vault: user.vault,
        inventory, achievements,
        transactions: transactions.map(t => ({ type: t.type, amount: t.amount, description: t.description, timestamp: t.created_at * 1000 })),
        stats: { gamesPlayed: stats.games_played, gamesWon: stats.games_won, totalWagered: stats.total_wagered, totalWon: stats.total_won, biggestWin: stats.biggest_win },
    };
}
const _FIELD_MAP = { balance:'balance', bank:'bank', bankCap:'bank_cap', xp:'xp', level:'level', dailyStreak:'daily_streak', warnings:'warnings', lastDaily:'last_daily', lastWeekly:'last_weekly', lastWork:'last_work', lastRob:'last_rob', jailTime:'jail_time', muteTime:'mute_time', marriedTo:'married_to', marriedSince:'married_since', color:'color', birthday:'birthday', reputation:'reputation', lastRep:'last_rep', vault:'vault' };
const _TS_FIELDS = new Set(['last_daily','last_weekly','last_work','last_rob','jail_time','mute_time','married_since','last_rep']);
function updateUserData(userId, data) {
    getUserData(userId);
    const map = _FIELD_MAP;
    const updates = []; const values = [];
    for (const [key, val] of Object.entries(data)) {
        if (key === 'stats') { const sm = {gamesPlayed:'games_played',gamesWon:'games_won',totalWagered:'total_wagered',totalWon:'total_won',biggestWin:'biggest_win'}; const su=[],sv=[]; for(const[sk,sv2]of Object.entries(val)){if(sm[sk]){su.push(sm[sk]+' = ?');sv.push(sv2);}} if(su.length){sv.push(userId);getDb().prepare('UPDATE user_stats SET '+su.join(', ')+' WHERE user_id = ?').run(...sv);} continue; }
        if (key === 'inventory') { stmt('DELETE FROM inventory WHERE user_id = ?').run(userId); const ins=stmt('INSERT OR REPLACE INTO inventory (user_id, item_id, quantity, expires_at) VALUES (?, ?, ?, ?)'); for(const[iid,item]of Object.entries(val)){if(item)ins.run(userId,iid,item.quantity||1,item.expiresAt||null);} continue; }
        if (key === 'achievements') { stmt('DELETE FROM achievements WHERE user_id = ?').run(userId); const ins=stmt('INSERT OR IGNORE INTO achievements (user_id, achievement_id) VALUES (?, ?)'); for(const ach of val)ins.run(userId,ach); continue; }
        if (key === 'transactions') continue;
        if (map[key]) { const col=map[key]; let v=val; if(_TS_FIELDS.has(col)&&typeof v==='number'&&v>1e10)v=Math.floor(v/1000); updates.push(col+' = ?'); values.push(v); }
    }
    if (updates.length) { updates.push('updated_at = unixepoch()'); values.push(userId); getDb().prepare('UPDATE users SET '+updates.join(', ')+' WHERE user_id = ?').run(...values); }
    return getUserData(userId);
}
function updateFields(userId, fields) { return updateUserData(userId, fields); }
function addMoney(userId, amount) {
    getUserData(userId);
    const u = stmt('SELECT balance FROM users WHERE user_id = ?').get(userId);
    const curr = u?.balance || 0;
    const add = Math.max(0, Math.min(Math.abs(amount), LIMITS.MAX_WALLET - curr));
    stmt('UPDATE users SET balance = balance + ?, updated_at = unixepoch() WHERE user_id = ?').run(add, userId);
    return add;
}
function removeMoney(userId, amount) {
    getUserData(userId);
    const u = stmt('SELECT balance FROM users WHERE user_id = ?').get(userId);
    if ((u?.balance||0) < amount) return false;
    stmt('UPDATE users SET balance = balance - ?, updated_at = unixepoch() WHERE user_id = ?').run(amount, userId);
    return true;
}
function addMoneyToBank(userId, amount) {
    getUserData(userId);
    const u = stmt('SELECT bank, bank_cap FROM users WHERE user_id = ?').get(userId);
    const maxBank = Math.max(LIMITS.MAX_BANK, u?.bank_cap||0);
    const curr = u?.bank||0;
    if (curr >= maxBank) return 0;
    const dep = Math.min(Math.abs(amount), maxBank - curr);
    stmt('UPDATE users SET bank = bank + ?, updated_at = unixepoch() WHERE user_id = ?').run(dep, userId);
    return dep;
}
function removeMoneyFromBank(userId, amount) {
    getUserData(userId);
    const u = stmt('SELECT bank FROM users WHERE user_id = ?').get(userId);
    if ((u?.bank||0) < amount) return false;
    stmt('UPDATE users SET bank = bank - ?, updated_at = unixepoch() WHERE user_id = ?').run(amount, userId);
    return true;
}
function transferMoney(fromId, toId, amount) {
    const db = getDb();
    const transfer = db.transaction(() => {
        getUserData(fromId); getUserData(toId);
        const from = stmt('SELECT balance FROM users WHERE user_id = ?').get(fromId);
        if ((from?.balance||0) < amount) return false;
        stmt('UPDATE users SET balance = balance - ?, updated_at = unixepoch() WHERE user_id = ?').run(amount, fromId);
        const added = addMoney(toId, amount);
        if (added < amount) stmt('UPDATE users SET balance = balance + ?, updated_at = unixepoch() WHERE user_id = ?').run(amount - added, fromId);
        return true;
    });
    return transfer();
}
function addTransaction(userId, type, amount, description) {
    getUserData(userId);
    stmt('INSERT INTO transactions (user_id, type, amount, description) VALUES (?, ?, ?, ?)').run(userId, type, amount, description);
    stmt('DELETE FROM transactions WHERE user_id = ? AND id NOT IN (SELECT id FROM transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT 50)').run(userId, userId);
}
function getGuildData(guildId) {
    let guild = stmt('SELECT * FROM guilds WHERE guild_id = ?').get(guildId);
    if (!guild) {
        stmt('INSERT INTO guilds (guild_id) VALUES (?)').run(guildId);
        guild = stmt('SELECT * FROM guilds WHERE guild_id = ?').get(guildId);
    }
    // Parse protection_settings JSON safely
    let protectionSettings = {};
    try { protectionSettings = JSON.parse(guild.protection_settings || '{}'); } catch {}
    return {
        bankChannel: guild.bank_channel,
        jailRole: guild.jail_role,
        muteRole: guild.mute_role,
        logChannel: guild.log_channel,
        punishmentsChannel: guild.punishments_channel,
        gamesChannel: guild.games_channel,
        welcomeChannel: guild.welcome_channel,
        // ─── Color System ───────────────────────
        colorChannelId: guild.color_channel_id || null,
        colorMessageId: guild.color_message_id || null,
        // ─── Log System ─────────────────────────
        logChannelId: guild.log_channel_id || null,
        // ─── Protection ─────────────────────────
        protectionSettings,
        // ─── Settings ───────────────────────────
        setupComplete: guild.setup_complete === 1,
        prefix: guild.prefix,
        language: guild.language,
        economyEnabled: guild.economy_enabled === 1,
        gamesEnabled: guild.games_enabled === 1,
        aiEnabled: guild.ai_enabled === 1,
        autoModEnabled: guild.auto_mod_enabled === 1,
        antiSpamEnabled: guild.anti_spam_enabled === 1,
        antiLinkEnabled: guild.anti_link_enabled === 1,
        antiCapsEnabled: guild.anti_caps_enabled === 1,
        antiRaidEnabled: guild.anti_raid_enabled === 1,
    };
}

const _GUILD_MAP = {
    bankChannel: 'bank_channel', jailRole: 'jail_role', muteRole: 'mute_role',
    logChannel: 'log_channel', punishmentsChannel: 'punishments_channel',
    gamesChannel: 'games_channel', welcomeChannel: 'welcome_channel',
    // ─── New fields ─────────────────────────
    colorChannelId: 'color_channel_id', colorMessageId: 'color_message_id',
    logChannelId: 'log_channel_id', protectionSettings: 'protection_settings',
    // ─── Settings ───────────────────────────
    setupComplete: 'setup_complete', prefix: 'prefix', language: 'language',
    economyEnabled: 'economy_enabled', gamesEnabled: 'games_enabled',
    aiEnabled: 'ai_enabled', autoModEnabled: 'auto_mod_enabled',
    antiSpamEnabled: 'anti_spam_enabled', antiLinkEnabled: 'anti_link_enabled',
    antiCapsEnabled: 'anti_caps_enabled', antiRaidEnabled: 'anti_raid_enabled',
};
const _GUILD_BOOL = new Set(['setup_complete','economy_enabled','games_enabled','ai_enabled',
    'auto_mod_enabled','anti_spam_enabled','anti_link_enabled','anti_caps_enabled','anti_raid_enabled']);
const _GUILD_JSON = new Set(['protection_settings']);

function updateGuildData(guildId, data) {
    getGuildData(guildId);
    const updates = [], values = [];
    for (const [key, val] of Object.entries(data)) {
        const col = _GUILD_MAP[key];
        if (!col) continue;
        let v = val;
        if (_GUILD_BOOL.has(col)) v = val ? 1 : 0;
        else if (_GUILD_JSON.has(col)) v = typeof val === 'string' ? val : JSON.stringify(val);
        updates.push(col + ' = ?');
        values.push(v);
    }
    if (updates.length) {
        updates.push('updated_at = unixepoch()');
        values.push(guildId);
        getDb().prepare('UPDATE guilds SET ' + updates.join(', ') + ' WHERE guild_id = ?').run(...values);
    }
    return getGuildData(guildId);
}

// ─── Web Sessions (OAuth) ───────────────────────────────────────────────────
function createWebSession(token, userId, username, avatar, role, guildId, expiresAt) {
    stmt('INSERT OR REPLACE INTO web_sessions (token, user_id, username, avatar, role, guild_id, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?)').run(token, userId, username, avatar, role, guildId || null, Math.floor(expiresAt / 1000));
}
function getWebSession(token) {
    const row = stmt('SELECT * FROM web_sessions WHERE token = ?').get(token);
    if (!row) return null;
    if (row.expires_at * 1000 < Date.now()) {
        stmt('DELETE FROM web_sessions WHERE token = ?').run(token);
        return null;
    }
    return { token: row.token, userId: row.user_id, username: row.username, avatar: row.avatar, role: row.role, guildId: row.guild_id, expiresAt: row.expires_at * 1000 };
}
function deleteWebSession(token) {
    stmt('DELETE FROM web_sessions WHERE token = ?').run(token);
}
function cleanExpiredSessions() {
    stmt('DELETE FROM web_sessions WHERE expires_at < ?').run(Math.floor(Date.now() / 1000));
}
function getAllUsers() { const rows=stmt('SELECT user_id FROM users').all(); const result={}; for(const r of rows)result[r.user_id]=getUserData(r.user_id); return result; }
function getLeaderboard(field='balance',limit=10) { const m={balance:'balance',bank:'bank',xp:'xp',level:'level'}; const col=m[field]||'balance'; return stmt('SELECT user_id, '+col+' as value FROM users ORDER BY '+col+' DESC LIMIT ?').all(limit); }
function loadDatabase() { return { users: {}, guilds: {} }; }
function saveDatabase() { return true; }
function saveAll() {}
process.on('SIGINT', ()=>{ if(_db)_db.close(); process.exit(0); });
process.on('SIGTERM', ()=>{ if(_db)_db.close(); process.exit(0); });
module.exports = {
    getDb, LIMITS,
    getUserData, updateUserData, updateFields,
    addMoney, removeMoney, addMoneyToBank, removeMoneyFromBank, transferMoney, addTransaction,
    getGuildData, updateGuildData,
    getAllUsers, getLeaderboard,
    loadDatabase, saveDatabase, saveAll,
    // Web Sessions
    createWebSession, getWebSession, deleteWebSession, cleanExpiredSessions,
};
