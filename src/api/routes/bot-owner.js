'use strict';
const { ChannelType } = require('discord.js');

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
const botSettings = require('../../database/bot-settings-db');
const db = require('../../database/db');
const fs = require('fs');
const path = require('path');
const router = express.Router();

// جميع الـ routes تتطلب Bot Owner
router.use(requireBotOwner);

// ──────────────────────────────────────────────────────────────────────────────
// Stats الشاملة للبوت
// ──────────────────────────────────────────────────────────────────────────────
router.get('/stats', async (req, res) => {
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

    // ── جلب السيرفرات الكاملة من Discord API ─────────────────────────────────
    // guilds.fetch() بدون معامل يُرجع OAuth2Guild (جزئي) بدون قنوات.
    // نجلب كل سيرفر بشكل كامل حتى نحصل على قنواته.
    let fullGuilds = [];
    if (client?.isReady()) {
        try {
            // الخطوة 1: جلب قائمة السيرفرات (OAuth2Guild partials)
            const partialGuilds = await client.guilds.fetch();
            // الخطوة 2: جلب كل سيرفر كاملاً (مع قنواته وأعضائه)
            fullGuilds = await Promise.all(
                partialGuilds.map(async pg => {
                    try {
                        const g = await client.guilds.fetch(pg.id);
                        // جلب القنوات
                        if (g.channels.cache.size === 0) {
                            try { await g.channels.fetch(); } catch {}
                        }
                        return g;
                    } catch { return null; }
                })
            );
            fullGuilds = fullGuilds.filter(Boolean);
        } catch (e) {
            console.error('[Stats] فشل جلب السيرفرات:', e.message);
            // احتياطي: استخدم ما في الـ cache
            fullGuilds = [...(client.guilds.cache.values())];
        }
    }

    // إحصائيات السيرفرات
    const guilds = fullGuilds.map(g => ({
        id: g.id,
        name: g.name,
        icon: g.iconURL({ dynamic: true }) || null,
        memberCount: g.memberCount,
        ownerId: g.ownerId,
        channels: g.channels.cache.size,
        roles: g.roles.cache.size,
    }));

    // قائمة قنوات جميع السيرفرات لاختيار روم الترحيب
    const guildChannels = fullGuilds.map(g => ({
        guildId: g.id,
        guildName: g.name,
        channels: g.channels.cache
            .filter(ch => ch.type === ChannelType.GuildText)
            .map(ch => ({ id: ch.id, name: ch.name }))
            .sort((a, b) => a.name.localeCompare(b.name))
    }));

    res.json({
        success: true,
        stats: {
            totalCmds,
            cmdStats,
            topUsers,
            discordGuilds: fullGuilds.length,
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
            guildChannels,
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
        'antiRaidAccountAgeEnabled',
        'welcomeGuildId', 'welcomeChannelId', 'welcomeEnabled',
        'welcomeImage', 'welcomeAvatarX',
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

    // ── CORE FIX: مزامنة إعدادات الترحيب مع Guild DB ─────────────────────────
    // welcome.js يقرأ من Guild DB فقط — لذا يجب الكتابة هنا
    const targetGuildId = body.welcomeGuildId || botSettings.get('welcomeGuildId');
    if (targetGuildId && (body.welcomeChannelId !== undefined || body.welcomeEnabled !== undefined || body.welcomeGuildId !== undefined)) {
        const guildUpdates = {};

        // إذا تغيّر الـ Guild، احذف الإعداد من الـ Guild القديم أولاً
        const oldGuildId = botSettings.get('welcomeGuildId');
        if (body.welcomeGuildId && oldGuildId && oldGuildId !== body.welcomeGuildId) {
            db.updateGuildData(oldGuildId, { welcomeEnabled: false, welcomeChannel: null });
            console.log(`[BotOwner/Settings] ⚠️ تم مسح إعدادات الترحيب من Guild القديم: ${oldGuildId}`);
        }

        // احفظ الإعدادات الجديدة في الـ Guild المستهدف
        if (body.welcomeChannelId !== undefined) guildUpdates.welcomeChannel = body.welcomeChannelId || null;
        if (body.welcomeEnabled   !== undefined) guildUpdates.welcomeEnabled = Boolean(body.welcomeEnabled);
        if (body.welcomeImage     !== undefined) guildUpdates.welcomeImage   = body.welcomeImage   || null;
        if (body.welcomeAvatarX   !== undefined) guildUpdates.welcomeAvatarX = Number(body.welcomeAvatarX) || 960;
        if (body.welcomeAvatarY   !== undefined) guildUpdates.welcomeAvatarY = Number(body.welcomeAvatarY) || 540;
        if (body.welcomeAvatarWidth  !== undefined) guildUpdates.welcomeAvatarSize   = Number(body.welcomeAvatarWidth)  || 256;
        if (body.welcomeAvatarHeight !== undefined) guildUpdates.welcomeAvatarSize   = Number(body.welcomeAvatarHeight) || 256;
        if (body.welcomeAvatarRadius !== undefined) guildUpdates.welcomeAvatarRadius = Number(body.welcomeAvatarRadius) || 50;

        if (Object.keys(guildUpdates).length > 0) {
            db.updateGuildData(targetGuildId, guildUpdates);
            console.log(
                `[BotOwner/Settings] ✅ تم مزامنة إعدادات الترحيب مع Guild DB\n` +
                `  → Guild: ${targetGuildId}\n` +
                `  → Updates: ${JSON.stringify(guildUpdates)}`
            );
        }
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
// تجربة الترحيب — النسخة الجديدة المُعاد كتابتها
// ──────────────────────────────────────────────────────────────────────────────
router.post('/test-welcome', async (req, res) => {
    const client = req.app.get('client');
    if (!client?.isReady()) {
        return res.status(503).json({ success: false, error: 'البوت غير متصل بديسكورد بعد. انتظر لحظة ثم حاول مجدداً.' });
    }

    try {
        const { sendWelcomeToChannel } = require('../../../utils/welcome');
        const settings = botSettings.getAll();

        // ── القراءة من body الطلب أولاً، ثم من قاعدة البيانات ──────────────────
        const guildId   = String(req.body?.guildId   || settings.welcomeGuildId   || '').trim();
        const channelId = String(req.body?.channelId || settings.welcomeChannelId || '').trim();

        if (!channelId) {
            return res.status(400).json({
                success: false,
                error: 'لم يتم تحديد روم الترحيب. اختر الروم من القائمة واضغط "حفظ وتطبيق" أولاً.'
            });
        }

        // ── جلب القناة مباشرة بالـ ID (الأكثر موثوقية — لا يحتاج guild في الـ cache) ──
        let channel;
        try {
            channel = await client.channels.fetch(channelId);
        } catch (e) {
            return res.status(404).json({
                success: false,
                error: `البوت لا يستطيع الوصول للقناة (ID: ${channelId}). تأكد أن البوت عنده صلاحية "View Channel" و "Send Messages" في هذه القناة.`
            });
        }

        if (!channel?.isTextBased()) {
            return res.status(400).json({ success: false, error: 'القناة المختارة ليست قناة نصية.' });
        }

        // ── جلب السيرفر من القناة مباشرة (لا حاجة لـ guilds.fetch) ───────────────
        const guild = channel.guild;
        if (!guild) {
            return res.status(404).json({ success: false, error: 'القناة ليست في سيرفر ديسكورد.' });
        }

        // ── جلب عضو للتجربة ──────────────────────────────────────────────────────
        let testMember = null;
        // 1. حاول جلب صاحب الداشبورد
        try { testMember = await guild.members.fetch(req.user.id); } catch {}
        // 2. احتياطي: البوت نفسه
        if (!testMember) {
            try { testMember = await guild.members.fetch(client.user.id); } catch {}
        }
        if (!testMember) {
            return res.status(404).json({
                success: false,
                error: 'تعذّر جلب عضو للتجربة. تأكد من تفعيل "Server Members Intent" في Discord Developer Portal.'
            });
        }

        // ── إرسال رسالة الترحيب التجريبية ───────────────────────────────────────
        await sendWelcomeToChannel(channel, testMember, settings);
        res.json({ success: true, message: `✅ تم إرسال رسالة ترحيب تجريبية إلى #${channel.name} في ${guild.name}` });

    } catch (err) {
        console.error('[test-welcome]', err);
        res.status(500).json({ success: false, error: `خطأ داخلي: ${err.message}` });
    }
});

module.exports = router;

