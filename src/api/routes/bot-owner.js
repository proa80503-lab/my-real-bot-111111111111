'use strict';

/**
 * ════════════════════════════════════════════════════════
 *  bot-owner.js — Routes خاصة بمالك البوت فقط
 *  ✅ محمية بـ requireBotOwner middleware
 *  ❌ Server Owner لا يستطيع الوصول إليها
 * ════════════════════════════════════════════════════════
 */

const express = require('express');
const { requireBotOwner } = require('./auth');
const dConf = require('../../../utils/dashboard-config');
const botSettings = require('../../../utils/bot-settings');
const db = require('../../database/db');
const fs = require('fs');
const path = require('path');
const router = express.Router();

// جميع الـ routes تتطلب Bot Owner
router.use(requireBotOwner);

// ──────────────────────────────────────────────────────────────────────────────
// Stats الشاملة للبوت
// ──────────────────────────────────────────────────────────────────────────────
router.get('/stats', (req, res) => {
    const client = req.app.get('client');
    const data = db.loadDatabase ? db.loadDatabase() : { users: {}, guilds: {} };

    // قراءة الأوامر
    const commandsBase = path.join(__dirname, '../../../commands');
    const cmdStats = {};
    try {
        for (const cat of fs.readdirSync(commandsBase)) {
            const p = path.join(commandsBase, cat);
            if (!fs.statSync(p).isDirectory()) continue;
            cmdStats[cat] = fs.readdirSync(p).filter(f => f.endsWith('.js'));
        }
    } catch {}
    const totalCmds = Object.values(cmdStats).reduce((s, v) => s + v.length, 0);

    // Leaderboard
    const topUsers = db.getLeaderboard('balance', 10).map(u => ({
        id: u.user_id, balance: u.value,
    }));

    const mem = process.memoryUsage();
    const upMs = client?.uptime || 0;

    // قراءة Logs
    const logPath = path.join(__dirname, '../../../../logs/bot.log');
    let logs = [];
    try {
        if (fs.existsSync(logPath)) {
            const lines = fs.readFileSync(logPath, 'utf8').split('\n').filter(Boolean);
            logs = lines.slice(-200).reverse();
        }
    } catch {}

    // إحصائيات السيرفرات
    const guilds = client?.guilds?.cache?.map(g => ({
        id: g.id,
        name: g.name,
        icon: g.iconURL({ dynamic: true }) || null,
        memberCount: g.memberCount,
        ownerId: g.ownerId,
        channels: g.channels.cache.size,
        roles: g.roles.cache.size,
    })) || [];

    res.json({
        success: true,
        stats: {
            totalCmds,
            cmdStats,
            topUsers,
            discordGuilds: client?.guilds?.cache?.size ?? 0,
            discordUsers: client?.users?.cache?.size ?? 0,
            ping: client?.ws?.ping ?? 0,
            botTag: client?.user?.tag ?? 'offline',
            botAvatar: client?.user?.displayAvatarURL({ dynamic: true }) || null,
            uptime: process.uptime(),
            uptimeMs: upMs,
            heapMB: Math.round(mem.heapUsed / 1024 / 1024),
            rssMB: Math.round(mem.rss / 1024 / 1024),
            nodeVersion: process.version,
            platform: process.platform,
            logs,
            guilds,
            botSettings: botSettings.getAll(),
        },
    });
});

// ──────────────────────────────────────────────────────────────────────────────
// إعدادات البوت
// ──────────────────────────────────────────────────────────────────────────────
router.post('/settings', (req, res) => {
    const body = req.body;
    const allowed = [
        'autoMessagesEnabled', 'ghostPingEnabled', 'randomEventInterval',
        'challengeInterval', 'moodMessageInterval', 'aiRandomReplyFrequency',
        'aiRandomReplyEnabled', 'dailyReminderEnabled', 'dailySummaryEnabled',
        'antiRaidAccountAgeEnabled', 'welcomeImage', 'welcomeAvatarX',
        'welcomeAvatarY', 'welcomeAvatarWidth', 'welcomeAvatarHeight', 'welcomeAvatarRadius',
        'savedWelcomeDesigns'
    ];

    for (const key of allowed) {
        if (body[key] !== undefined) botSettings.set(key, body[key]);
    }

    // Ghost ping خاص
    if (body.ghostPingEnabled !== undefined) {
        try {
            const gp = require('../../../utils/ghost-ping');
            body.ghostPingEnabled ? gp.enable() : gp.disable();
        } catch {}
    }

    res.json({ success: true });
});

// ──────────────────────────────────────────────────────────────────────────────
// إدارة الاقتصاد
// ──────────────────────────────────────────────────────────────────────────────
router.post('/economy', (req, res) => {
    const { userId, amount, action } = req.body;
    if (!userId || amount === undefined || !action) {
        return res.status(400).json({ success: false, error: 'Missing data' });
    }
    const amt = Number(amount);
    if (isNaN(amt) || amt < 0) {
        return res.status(400).json({ success: false, error: 'Invalid amount' });
    }

    const uData = db.getUserData(userId);
    if (action === 'add') db.addMoney(userId, amt);
    else if (action === 'remove') db.removeMoney(userId, amt);
    else if (action === 'set') db.updateUserData(userId, { balance: amt });
    else return res.status(400).json({ success: false, error: 'Invalid action' });

    res.json({ success: true });
});

// ──────────────────────────────────────────────────────────────────────────────
// تعطيل/تفعيل أمر
// ──────────────────────────────────────────────────────────────────────────────
router.post('/command', (req, res) => {
    const { command, action } = req.body;
    if (!command || !action) return res.status(400).json({ success: false, error: 'Missing data' });
    if (action === 'disable') botSettings.disableCommand(command);
    else if (action === 'enable') botSettings.enableCommand(command);
    else return res.status(400).json({ success: false, error: 'Invalid action' });
    res.json({ success: true });
});

// ──────────────────────────────────────────────────────────────────────────────
// إشراف (Moderation) من قِبل البوت أونر
// ──────────────────────────────────────────────────────────────────────────────
router.post('/moderation', async (req, res) => {
    const { guildId, userId, reason, action } = req.body;
    if (!guildId || !userId || !action) return res.status(400).json({ success: false, error: 'Missing data' });
    const client = req.app.get('client');
    if (!client) return res.status(503).json({ success: false, error: 'Bot offline' });

    try {
        const guild = await client.guilds.fetch(guildId);
        if (!guild) return res.status(404).json({ success: false, error: 'Guild not found' });

        if (action === 'warn') {
            const uData = db.getUserData(userId);
            db.updateUserData(userId, { warnings: (uData.warnings || 0) + 1 });
        } else if (action === 'kick') {
            const member = await guild.members.fetch(userId);
            if (member) await member.kick(reason || 'By Bot Owner');
        } else if (action === 'ban') {
            await guild.members.ban(userId, { reason: reason || 'By Bot Owner' });
        } else if (action === 'unban') {
            await guild.members.unban(userId, reason || 'By Bot Owner');
        }
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ──────────────────────────────────────────────────────────────────────────────
// إعلان عام
// ──────────────────────────────────────────────────────────────────────────────
router.post('/announce', async (req, res) => {
    const { channelId, message } = req.body;
    if (!channelId || !message) return res.status(400).json({ success: false, error: 'Missing data' });
    const client = req.app.get('client');
    if (!client) return res.status(503).json({ success: false, error: 'Bot offline' });
    try {
        const channel = await client.channels.fetch(channelId);
        if (!channel?.isTextBased()) return res.status(400).json({ success: false, error: 'Invalid channel' });
        await channel.send(message);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ──────────────────────────────────────────────────────────────────────────────
// Restart
// ──────────────────────────────────────────────────────────────────────────────
router.post('/restart', (req, res) => {
    res.json({ success: true, message: 'Restarting...' });
    setTimeout(() => process.exit(1), 1000);
});

// ──────────────────────────────────────────────────────────────────────────────
// الردود التلقائية
// ──────────────────────────────────────────────────────────────────────────────
router.post('/response', (req, res) => {
    const { trigger, response, exactMatch } = req.body;
    if (!trigger || !response) return res.status(400).json({ success: false, error: 'Missing data' });
    dConf.addAutoResponse(trigger, response, !!exactMatch);
    res.json({ success: true });
});

router.get('/responses', (req, res) => {
    res.json({ success: true, responses: dConf.getAutoResponses() });
});

router.delete('/response/:id', (req, res) => {
    const deleted = dConf.deleteAutoResponse(req.params.id);
    res.json({ success: deleted });
});

// ──────────────────────────────────────────────────────────────────────────────
// تجربة الترحيب
// ──────────────────────────────────────────────────────────────────────────────
router.post('/test-welcome', async (req, res) => {
    const client = req.app.get('client');
    if (!client) return res.status(503).json({ success: false, error: 'Bot offline' });

    try {
        const { sendWelcome } = require('../../../utils/welcome');
        // Find any guild the bot and the owner share
        let testMember = null;
        for (const guild of client.guilds.cache.values()) {
            try {
                const member = await guild.members.fetch(req.user.id);
                if (member) {
                    testMember = member;
                    break;
                }
            } catch (err) {}
        }

        if (!testMember) {
            return res.status(404).json({ success: false, error: 'يجب أن تكون موجوداً في سيرفر واحد على الأقل مع البوت لتجربة الترحيب.' });
        }

        await sendWelcome(testMember);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

module.exports = router;
