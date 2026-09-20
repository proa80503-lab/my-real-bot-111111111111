'use strict';
const { ChannelType, PermissionsBitField } = require('discord.js');

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
    const topUsers = db.getLeaderboard ? db.getLeaderboard('balance', 10).map(u => ({
        id: u.user_id, balance: u.value,
    })) : [];

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

    // جلب السيرفرات
    let fullGuilds = [];
    if (client?.isReady()) {
        try {
            const partialGuilds = await client.guilds.fetch();
            fullGuilds = await Promise.all(
                partialGuilds.map(async pg => {
                    try {
                        const g = await client.guilds.fetch(pg.id);
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
            fullGuilds = [...(client.guilds.cache.values())];
        }
    }

    const guilds = fullGuilds.map(g => ({
        id: g.id,
        name: g.name,
        icon: g.iconURL({ dynamic: true }) || null,
        memberCount: g.memberCount,
        ownerId: g.ownerId,
        channels: g.channels.cache.size,
        roles: g.roles.cache.size,
    }));

    const guildChannels = fullGuilds.map(g => ({
        guildId: g.id,
        guildName: g.name,
        channels: g.channels.cache
            .filter(ch => ch.type === ChannelType.GuildText)
            .map(ch => {
                const botMember = g.members.me;
                const canSend = botMember ? ch.permissionsFor(botMember)?.has(PermissionsBitField.Flags.SendMessages) : false;
                return { id: ch.id, name: ch.name, canSend };
            })
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
    const targetGuildId = body.welcomeGuildId || botSettings.get('welcomeGuildId');
    if (targetGuildId && (body.welcomeChannelId !== undefined || body.welcomeEnabled !== undefined || body.welcomeGuildId !== undefined)) {
        const guildUpdates = {};

        const oldGuildId = botSettings.get('welcomeGuildId');
        if (body.welcomeGuildId && oldGuildId && oldGuildId !== body.welcomeGuildId) {
            db.updateGuildData(oldGuildId, { welcomeEnabled: false, welcomeChannel: null });
        }

        if (body.welcomeChannelId !== undefined) {
            guildUpdates.welcomeChannel = body.welcomeChannelId || null;
            if (body.welcomeChannelId) {
                guildUpdates.welcomeEnabled = true; // تفعيل تلقائي عند اختيار قناة
            } else {
                guildUpdates.welcomeEnabled = false; // تعطيل إذا أزال القناة
            }
        }
        if (body.welcomeEnabled !== undefined) guildUpdates.welcomeEnabled = Boolean(body.welcomeEnabled);
        if (body.welcomeAvatarX   !== undefined) guildUpdates.welcomeAvatarX = Number(body.welcomeAvatarX) || 960;
        if (body.welcomeAvatarY   !== undefined) guildUpdates.welcomeAvatarY = Number(body.welcomeAvatarY) || 540;
        if (body.welcomeAvatarWidth  !== undefined) guildUpdates.welcomeAvatarSize = Number(body.welcomeAvatarWidth) || 256;
        if (body.welcomeAvatarHeight !== undefined) guildUpdates.welcomeAvatarSize = Number(body.welcomeAvatarHeight) || 256;
        if (body.welcomeAvatarRadius !== undefined) guildUpdates.welcomeAvatarRadius = Number(body.welcomeAvatarRadius) || 50;

        if (body.deleteWelcomeImage) {
            botSettings.set('welcomeImage', null);
            guildUpdates.welcomeImage = null;
            db.deleteWelcomeImageBase64(targetGuildId).catch(console.error);
        } else if (body.welcomeImageBase64) {
            try {
                // حفظ الصورة في Mongoose
                db.setWelcomeImageBase64(targetGuildId, body.welcomeImageBase64).catch(console.error);
                
                // الرابط الديناميكي الجديد
                const dynamicUrl = `/api/public/welcome-image/${targetGuildId}`;
                botSettings.set('welcomeImage', dynamicUrl);
                guildUpdates.welcomeImage = dynamicUrl;
            } catch (uploadErr) {
                console.error('[BotOwner/Settings] فشل حفظ الصورة المرفوعة في القاعدة:', uploadErr);
            }
        } else if (body.welcomeImage !== undefined) {
            guildUpdates.welcomeImage = body.welcomeImage || null;
        }

        if (Object.keys(guildUpdates).length > 0) {
            db.updateGuildData(targetGuildId, guildUpdates);
            console.log(`[BotOwner/Settings] ✅ مزامنة ترحيب Guild ${targetGuildId}:`, guildUpdates);
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
// تجربة الترحيب — مُصلحة بالكامل
// ──────────────────────────────────────────────────────────────────────────────
router.post('/test-welcome', async (req, res) => {
    const client = req.app.get('client');
    if (!client?.isReady()) {
        return res.status(503).json({
            success: false,
            error: 'البوت غير متصل بديسكورد بعد. انتظر لحظة ثم حاول مجدداً.'
        });
    }

    try {
        const { sendWelcomeToChannel } = require('../../../utils/welcome');
        const settings = botSettings.getAll();

        // القراءة من body الطلب أولاً، ثم من قاعدة البيانات
        const guildId   = String(req.body?.guildId   || settings.welcomeGuildId   || '').trim();
        const channelId = String(req.body?.channelId || settings.welcomeChannelId || '').trim();

        console.log(`[test-welcome] guildId=${guildId} | channelId=${channelId}`);

        if (!channelId) {
            return res.status(400).json({
                success: false,
                error: 'لم يتم تحديد روم الترحيب. اختر السيرفر والروم من القائمة واضغط "حفظ وتطبيق" أولاً.'
            });
        }

        // جلب القناة مباشرة بالـ ID
        let channel;
        try {
            channel = await client.channels.fetch(channelId);
        } catch (e) {
            return res.status(404).json({
                success: false,
                error: `البوت لا يستطيع الوصول للقناة (ID: ${channelId}).\n• تأكد أن البوت عنده صلاحية "View Channel" و "Send Messages"\n• تأكد أن رقم القناة صحيح`
            });
        }

        if (!channel?.isTextBased()) {
            return res.status(400).json({ success: false, error: 'القناة المختارة ليست قناة نصية.' });
        }

        const guild = channel.guild;
        if (!guild) {
            return res.status(404).json({ success: false, error: 'القناة ليست في سيرفر ديسكورد.' });
        }

        // التحقق من صلاحيات البوت
        const botMember = guild.members.me;
        if (!botMember) {
            return res.status(403).json({ success: false, error: 'البوت ليس في هذا السيرفر!' });
        }
        const perms = channel.permissionsFor(botMember);
        if (!perms?.has(PermissionsBitField.Flags.SendMessages)) {
            return res.status(403).json({
                success: false,
                error: `❌ البوت لا يملك صلاحية "Send Messages" في #${channel.name}!\nيرجى إضافة الصلاحية من إعدادات السيرفر.`
            });
        }

        // جلب عضو للتجربة
        let testMember = null;
        const tryId = req.user?.userId || req.user?.id;
        if (tryId) {
            try { testMember = await guild.members.fetch(tryId); } catch {}
        }
        if (!testMember) {
            try { testMember = await guild.members.fetch(client.user.id); } catch {}
        }
        if (!testMember) {
            return res.status(404).json({
                success: false,
                error: 'تعذّر جلب عضو للتجربة. تأكد من تفعيل "Server Members Intent" في Discord Developer Portal.'
            });
        }

        // إرسال رسالة الترحيب التجريبية
        await sendWelcomeToChannel(channel, testMember, settings);
        res.json({
            success: true,
            message: `✅ تم إرسال رسالة ترحيب تجريبية إلى #${channel.name} في سيرفر "${guild.name}" بنجاح! 🎉`
        });

    } catch (err) {
        console.error('[test-welcome] خطأ:', err);
        res.status(500).json({ success: false, error: `خطأ داخلي: ${err.message}` });
    }
});

// ──────────────────────────────────────────────────────────────────────────────
// الإشراف — تنفيذ إجراء على عضو من داشبورد مالك البوت
// ──────────────────────────────────────────────────────────────────────────────
router.post('/moderate', async (req, res) => {
    const { userId, guildId, action, reason } = req.body;
    const client = req.app.get('client');

    if (!userId || !guildId || !action) {
        return res.status(400).json({ success: false, error: 'بيانات ناقصة: userId, guildId, action مطلوبة' });
    }

    if (!client?.isReady()) {
        return res.status(503).json({ success: false, error: 'البوت غير متصل' });
    }

    try {
        const guild = await client.guilds.fetch(guildId).catch(() => null);
        if (!guild) return res.status(404).json({ success: false, error: 'السيرفر غير موجود أو البوت ليس فيه' });

        const member = await guild.members.fetch(userId).catch(() => null);
        if (!member) return res.status(404).json({ success: false, error: 'العضو غير موجود في السيرفر' });

        const auditReason = `[Dashboard] ${action} by Bot Owner - ${reason || 'No reason'}`;

        switch (action) {
            case 'warn': {
                const userData = db.getUserData(userId);
                const warns = (userData.warnings || 0) + 1;
                db.updateFields ? db.updateFields(userId, { warnings: warns }) : db.updateUserData(userId, { warnings: warns });
                try {
                    await member.send(`⚠️ تلقيت تحذيراً في **${guild.name}**!\nالسبب: ${reason || 'لم يُذكر'}\nإجمالي تحذيراتك: ${warns}`);
                } catch {}
                return res.json({ success: true, message: `✅ تم تحذير ${member.user.tag} (تحذيرات: ${warns})` });
            }
            case 'kick':
                await member.kick(auditReason);
                return res.json({ success: true, message: `✅ تم طرد ${member.user.tag}` });
            case 'ban':
                await guild.members.ban(userId, { reason: auditReason });
                return res.json({ success: true, message: `✅ تم حظر ${member.user.tag}` });
            case 'timeout': {
                const duration = 10 * 60 * 1000; // 10 دقائق
                await member.timeout(duration, auditReason);
                return res.json({ success: true, message: `✅ تم إيقاف ${member.user.tag} مؤقتاً لمدة 10 دقائق` });
            }
            default:
                return res.status(400).json({ success: false, error: `إجراء غير معروف: ${action}` });
        }
    } catch (err) {
        console.error('[moderate]', err);
        res.status(500).json({ success: false, error: `خطأ: ${err.message}` });
    }
});

module.exports = router;
