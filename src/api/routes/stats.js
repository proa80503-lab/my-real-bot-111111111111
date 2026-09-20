const express = require('express');
const db = require('../../../src/database/db');
const { verifyToken } = require('./auth');
const fs = require('fs');
const path = require('path');
const router = express.Router();

// Apply auth middleware to all stats routes
router.use(verifyToken);

const logPath = path.join(__dirname, '../../../../logs/bot.log');

function readDB() {
    const _dbCache = db.loadDatabase();
    return { users: _dbCache.users || {}, guilds: _dbCache.guilds || {} };
}

function readLogs(n = 200) {
    try {
        if (!fs.existsSync(logPath)) return [];
        const lines = fs.readFileSync(logPath, 'utf8').split('\n').filter(Boolean);
        return lines.slice(-n).reverse();
    } catch { return []; }
}

function getCommandStats() {
    const base = path.join(__dirname, '../../../../commands');
    const cats = {};
    try {
        for (const cat of fs.readdirSync(base)) {
            const p = path.join(base, cat);
            if (!fs.statSync(p).isDirectory()) continue;
            cats[cat] = fs.readdirSync(p).filter(f => f.endsWith('.js'));
        }
    } catch {}
    return cats;
}

router.get('/', (req, res) => {
    const client = req.app.get('client'); // Assume client is passed to app
    const data = readDB();
    const users = Object.entries(data.users || {});
    const guilds = Object.entries(data.guilds || {});
    const cmdStats = getCommandStats();
    const totalCmds = Object.values(cmdStats).reduce((s, v) => s + v.length, 0);

    const sortedUsers = users
        .map(([id, u]) => ({ id, balance: (u.balance||0)+(u.bank||0), level: u.level||1, xp: u.xp||0, games: u.stats?.gamesPlayed||0, warnings: u.warnings||0 }))
        .sort((a, b) => b.balance - a.balance)
        .slice(0, 10);

    const totalMoney = users.reduce((s, [, u]) => s + (u.balance || 0) + (u.bank || 0), 0);
    const totalWarnings = users.reduce((s, [, u]) => s + (u.warnings || 0), 0);
    const totalGamesPlayed = users.reduce((s, [, u]) => s + (u.stats?.gamesPlayed || 0), 0);
    const totalWins = users.reduce((s, [, u]) => s + (u.stats?.gamesWon || 0), 0);

    const discordGuilds = client?.guilds?.cache?.size ?? 0;
    const discordUsers = client?.users?.cache?.size ?? 0;
    const ping = client?.ws?.ping ?? 0;
    const botTag = client?.user?.tag ?? 'offline';

    const mem = process.memoryUsage();

    res.json({
        success: true,
        stats: {
            totalCmds, totalUsers: users.length, totalGuilds: guilds.length,
            totalMoney, totalWarnings, totalGamesPlayed, totalWins,
            discordGuilds, discordUsers, ping, botTag,
            topUsers: sortedUsers,
            cmdStats,
            guilds: guilds.map(([id, g]) => ({ id, ...g })),
            logs: readLogs(),
            uptime: process.uptime(),
            heapMB: Math.round(mem.heapUsed / 1024 / 1024),
            rssMB: Math.round(mem.rss / 1024 / 1024),
            nodeVersion: process.version,
            platform: process.platform,
        }
    });
});

module.exports = router;
