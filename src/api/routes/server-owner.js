'use strict';

/**
 * ════════════════════════════════════════════════════════
 *  server-owner.js — Routes خاصة بمالك السيرفر
 *  ✅ محمية بـ requireServerOwner middleware
 *  ✅ عزل كامل — كل guild بياناته منفصلة
 *  ❌ Server Owner A لا يستطيع الوصول لبيانات Guild B
 * ════════════════════════════════════════════════════════
 */

const express = require('express');
const { PermissionsBitField, ChannelType } = require('discord.js');
const { requireServerOwner } = require('./auth');
const db = require('../../database/db');
const router = express.Router({ mergeParams: true });

// جميع الـ routes تتطلب Server Owner لهذا الـ guild بالذات
router.use(requireServerOwner);

// ─── Helper: التحقق من صلاحيات البوت في قناة ─────────────────────────────────
function checkBotPerms(channel, botMember, requiredPerms) {
    const missing = [];
    for (const [perm, label] of requiredPerms) {
        if (!channel.permissionsFor(botMember).has(perm)) {
            missing.push(label);
        }
    }
    return missing;
}

// ─── Helper: جلب معلومات القناة بشكل آمن ─────────────────────────────────────
function channelInfo(channel, botMember) {
    const perms = channel.permissionsFor(botMember);
    return {
        id: channel.id,
        name: channel.name,
        type: channel.type === ChannelType.GuildText ? 'text' : channel.type === ChannelType.GuildVoice ? 'voice' : 'other',
        position: channel.position,
        canSend: perms?.has(PermissionsBitField.Flags.SendMessages) ?? false,
        canView: perms?.has(PermissionsBitField.Flags.ViewChannel) ?? false,
        canEmbed: perms?.has(PermissionsBitField.Flags.EmbedLinks) ?? false,
        canManage: perms?.has(PermissionsBitField.Flags.ManageMessages) ?? false,
    };
}

// ──────────────────────────────────────────────────────────────────────────────
// معلومات السيرفر
// ──────────────────────────────────────────────────────────────────────────────
router.get('/info', async (req, res) => {
    const { guildId } = req.params;
    const client = req.app.get('client');
    try {
        const guild = await client.guilds.fetch(guildId);
        const guildData = db.getGuildData(guildId);
        const botMember = guild.members.me;

        res.json({
            success: true,
            guild: {
                id: guild.id,
                name: guild.name,
                icon: guild.iconURL({ dynamic: true }) || null,
                memberCount: guild.memberCount,
                ownerId: guild.ownerId,
                boostLevel: guild.premiumTier,
                boostCount: guild.premiumSubscriptionCount,
                createdAt: guild.createdAt,
            },
            settings: {
                colorChannelId: guildData.colorChannelId,
                colorChannelName: guildData.colorChannelId
                    ? guild.channels.cache.get(guildData.colorChannelId)?.name || null
                    : null,
                logChannelId: guildData.logChannelId,
                logChannelName: guildData.logChannelId
                    ? guild.channels.cache.get(guildData.logChannelId)?.name || null
                    : null,
                protectionSettings: guildData.protectionSettings || {},
                prefix: guildData.prefix,
            },
            botStatus: {
                online: true,
                permissions: guild.members.me?.permissions.toArray() || [],
                isAdmin: guild.members.me?.permissions.has(PermissionsBitField.Flags.Administrator) ?? false,
            },
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ──────────────────────────────────────────────────────────────────────────────
// قائمة القنوات (Text Channels فقط)
// ──────────────────────────────────────────────────────────────────────────────
router.get('/channels', async (req, res) => {
    const { guildId } = req.params;
    const client = req.app.get('client');
    try {
        const guild = await client.guilds.fetch(guildId);
        const botMember = guild.members.me;

        // جلب جميع Text Channels فقط
        const channels = guild.channels.cache
            .filter(c => c.type === ChannelType.GuildText)
            .sort((a, b) => a.position - b.position)
            .map(c => channelInfo(c, botMember));

        res.json({ success: true, channels });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ──────────────────────────────────────────────────────────────────────────────
// تعيين Color Channel
// ──────────────────────────────────────────────────────────────────────────────
router.post('/color-channel', async (req, res) => {
    const { guildId } = req.params;
    const { channelId } = req.body;

    if (!channelId) return res.status(400).json({ success: false, error: 'Channel ID required' });

    const client = req.app.get('client');
    try {
        const guild = await client.guilds.fetch(guildId);
        const channel = guild.channels.cache.get(channelId);
        if (!channel || channel.type !== ChannelType.GuildText) {
            return res.status(400).json({ success: false, error: 'Invalid text channel' });
        }

        const botMember = guild.members.me;
        const requiredPerms = [
            [PermissionsBitField.Flags.ViewChannel, 'View Channel'],
            [PermissionsBitField.Flags.SendMessages, 'Send Messages'],
            [PermissionsBitField.Flags.EmbedLinks, 'Embed Links'],
            [PermissionsBitField.Flags.ManageMessages, 'Manage Messages'],
        ];

        const missing = checkBotPerms(channel, botMember, requiredPerms);
        if (missing.length > 0) {
            return res.status(400).json({
                success: false,
                error: `البوت لا يملك الصلاحيات التالية في هذا الروم: ${missing.join(', ')}`,
                missingPermissions: missing,
            });
        }

        // حفظ في DB
        const guildData = db.getGuildData(guildId);
        const oldChannelId = guildData.colorChannelId;

        db.updateGuildData(guildId, {
            colorChannelId: channelId,
            colorMessageId: null, // سيُعاد إرساله
        });

        // تشغيل Color System
        try {
            const colorSystem = require('../../../utils/color-system');
            await colorSystem.setupColorChannel(guild, channel, oldChannelId);
        } catch (csErr) {
            console.error('[ColorSystem] Error:', csErr.message);
        }

        res.json({
            success: true,
            message: `تم تعيين ${channel.name} كقناة ألوان بنجاح`,
            channelId,
            channelName: channel.name,
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ──────────────────────────────────────────────────────────────────────────────
// تعيين Log Channel
// ──────────────────────────────────────────────────────────────────────────────
router.post('/log-channel', async (req, res) => {
    const { guildId } = req.params;
    const { channelId } = req.body;

    if (!channelId) return res.status(400).json({ success: false, error: 'Channel ID required' });

    const client = req.app.get('client');
    try {
        const guild = await client.guilds.fetch(guildId);
        const channel = guild.channels.cache.get(channelId);
        if (!channel || channel.type !== ChannelType.GuildText) {
            return res.status(400).json({ success: false, error: 'Invalid text channel' });
        }

        const botMember = guild.members.me;
        const requiredPerms = [
            [PermissionsBitField.Flags.ViewChannel, 'View Channel'],
            [PermissionsBitField.Flags.SendMessages, 'Send Messages'],
            [PermissionsBitField.Flags.EmbedLinks, 'Embed Links'],
        ];

        const missing = checkBotPerms(channel, botMember, requiredPerms);
        if (missing.length > 0) {
            return res.status(400).json({
                success: false,
                error: `البوت لا يملك الصلاحيات التالية في هذا الروم: ${missing.join(', ')}`,
                missingPermissions: missing,
            });
        }

        // حفظ في DB (كلا الحقلين للتوافق مع channel-resolver القديم)
        db.updateGuildData(guildId, {
            logChannelId: channelId,
            logChannel: channelId, // legacy compatibility
        });

        // إرسال رسالة تأكيد
        const { EmbedBuilder } = require('discord.js');
        await channel.send({
            embeds: [
                new EmbedBuilder()
                    .setColor('#57f287')
                    .setTitle('✅ تم تعيين قناة السجلات')
                    .setDescription(`سيتم إرسال جميع سجلات السيرفر إلى هذه القناة.`)
                    .setTimestamp()
            ]
        }).catch(() => {});

        res.json({
            success: true,
            message: `تم تعيين ${channel.name} كقناة سجلات بنجاح`,
            channelId,
            channelName: channel.name,
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ──────────────────────────────────────────────────────────────────────────────
// إعدادات الحماية
// ──────────────────────────────────────────────────────────────────────────────
router.get('/protection', (req, res) => {
    const { guildId } = req.params;
    const guildData = db.getGuildData(guildId);

    const DEFAULT_PROTECTION = {
        antiSpam:        { enabled: true,  action: 'timeout', threshold: 5, duration: 5 },
        antiRaid:        { enabled: true,  action: 'kick',    threshold: 5 },
        antiBadWords:    { enabled: true,  action: 'jail',    duration: 10 },
        antiLink:        { enabled: false, action: 'delete',  whitelist: [] },
        antiCaps:        { enabled: true,  action: 'delete',  threshold: 70 },
        antiMentionSpam: { enabled: true,  action: 'timeout', threshold: 5, duration: 10 },
        antiEmojiSpam:   { enabled: true,  action: 'delete',  threshold: 10 },
        antiDuplicate:   { enabled: true,  action: 'timeout', threshold: 3, duration: 5 },
        antiAccountAge:  { enabled: true,  minDays: 7 },
        antiNuke:        { enabled: false },
        antiBotJoin:     { enabled: false, action: 'kick' },
        antiWebhook:     { enabled: false, action: 'delete' },
        antiEveryone:    { enabled: false, action: 'delete' },
        antiMassMention: { enabled: false, action: 'timeout', threshold: 5 },
    };

    const saved = guildData.protectionSettings || {};
    const merged = {};
    for (const [key, def] of Object.entries(DEFAULT_PROTECTION)) {
        merged[key] = { ...def, ...(saved[key] || {}) };
    }

    res.json({ success: true, protection: merged, defaults: DEFAULT_PROTECTION });
});

router.post('/protection', (req, res) => {
    const { guildId } = req.params;
    const { protection } = req.body;
    if (!protection || typeof protection !== 'object') {
        return res.status(400).json({ success: false, error: 'Invalid protection settings' });
    }

    // حفظ الإعدادات
    db.updateGuildData(guildId, { protectionSettings: protection });

    // تحديث الـ flags المنفصلة للتوافق مع الكود القديم
    const updates = {};
    if (protection.antiSpam !== undefined)
        updates.antiSpamEnabled = protection.antiSpam.enabled;
    if (protection.antiLink !== undefined)
        updates.antiLinkEnabled = protection.antiLink.enabled;
    if (protection.antiCaps !== undefined)
        updates.antiCapsEnabled = protection.antiCaps.enabled;
    if (protection.antiRaid !== undefined)
        updates.antiRaidEnabled = protection.antiRaid.enabled;

    if (Object.keys(updates).length > 0) {
        db.updateGuildData(guildId, updates);
    }

    res.json({ success: true, message: 'تم حفظ إعدادات الحماية' });
});

// ──────────────────────────────────────────────────────────────────────────────
// إعدادات الترحيب — قراءة فقط (الكتابة تتم من Bot Owner Dashboard)
// ──────────────────────────────────────────────────────────────────────────────

/**
 * GET /server/:guildId/welcome-settings
 * يُرجع إعدادات الترحيب الحالية لهذا السيرفر.
 */
router.get('/welcome-settings', async (req, res) => {
    const { guildId } = req.params;
    const guildData = db.getGuildData(guildId);

    let channelName = null;
    let channelValid = false;
    const client = req.app.get('client');
    if (guildData.welcomeChannel && client) {
        try {
            const ch = await client.channels.fetch(guildData.welcomeChannel).catch(() => null);
            if (ch && ch.guildId === guildId) { channelName = ch.name; channelValid = true; }
        } catch {}
    }

    res.json({
        success: true,
        welcomeEnabled:      guildData.welcomeEnabled  ?? false,
        welcomeChannel:      guildData.welcomeChannel  ?? null,
        welcomeChannelName:  channelName,
        welcomeChannelValid: channelValid,
        welcomeImage:        guildData.welcomeImage    ?? null,
        welcomeAvatarX:      guildData.welcomeAvatarX  ?? 960,
        welcomeAvatarY:      guildData.welcomeAvatarY  ?? 540,
        welcomeAvatarSize:   guildData.welcomeAvatarSize ?? 256,
        welcomeAvatarRadius: guildData.welcomeAvatarRadius ?? 50,
    });
});

/**
 * POST /server/:guildId/welcome-settings
 * يحفظ إعدادات الترحيب لهذا السيرفر مباشرة (مالك السيرفر يستطيع الآن ضبط ترحيبه)
 */
router.post('/welcome-settings', async (req, res) => {
    const { guildId } = req.params;
    const {
        welcomeEnabled, welcomeChannel: channelId,
        welcomeImage, welcomeAvatarX, welcomeAvatarY,
        welcomeAvatarSize, welcomeAvatarRadius
    } = req.body;

    const updates = {};
    if (welcomeEnabled !== undefined) updates.welcomeEnabled = Boolean(welcomeEnabled);
    if (channelId !== undefined) updates.welcomeChannel = channelId || null;
    if (welcomeAvatarX !== undefined) updates.welcomeAvatarX = Number(welcomeAvatarX) || 960;
    if (welcomeAvatarY !== undefined) updates.welcomeAvatarY = Number(welcomeAvatarY) || 540;
    if (welcomeAvatarSize !== undefined) updates.welcomeAvatarSize = Number(welcomeAvatarSize) || 256;
    if (welcomeAvatarRadius !== undefined) updates.welcomeAvatarRadius = Number(welcomeAvatarRadius) || 50;

    if (req.body.deleteWelcomeImage) {
        updates.welcomeImage = null;
        db.deleteWelcomeImageBase64(guildId).catch(console.error);
    } else if (req.body.welcomeImageBase64) {
        try {
            db.setWelcomeImageBase64(guildId, req.body.welcomeImageBase64).catch(console.error);
            updates.welcomeImage = `/api/public/welcome-image/${guildId}`;
        } catch (uploadErr) {
            console.error('[ServerOwner/Welcome] فشل حفظ الصورة المرفوعة:', uploadErr);
        }
    } else if (welcomeImage !== undefined) {
        updates.welcomeImage = welcomeImage || null;
    }

    db.updateGuildData(guildId, updates);
    console.log(`[ServerOwner/Welcome] ✅ تم حفظ إعدادات الترحيب لـ Guild ${guildId}:`, updates);

    res.json({ success: true, message: 'تم حفظ إعدادات الترحيب ✅' });
});

/**
 * POST /server/:guildId/test-welcome
 * تجربة إرسال ترحيب للسيرفر
 */
router.post('/test-welcome', async (req, res) => {
    const { guildId } = req.params;
    const client = req.app.get('client');

    if (!client?.isReady()) {
        return res.status(503).json({ success: false, error: 'البوت غير متصل' });
    }

    const guildData = db.getGuildData(guildId);
    const channelId = guildData.welcomeChannel;

    if (!channelId) {
        return res.status(400).json({
            success: false,
            error: 'لم يتم تحديد قناة ترحيب. اختر القناة من الإعدادات أولاً.'
        });
    }

    try {
        const channel = await client.channels.fetch(channelId).catch(() => null);
        if (!channel || !channel.isTextBased()) {
            return res.status(404).json({ success: false, error: 'القناة غير موجودة أو ليست نصية' });
        }

        const guild = await client.guilds.fetch(guildId).catch(() => null);
        if (!guild) return res.status(404).json({ success: false, error: 'السيرفر غير موجود' });

        const { PermissionsBitField } = require('discord.js');
        const botMember = guild.members.me;
        if (!botMember?.permissions.has(PermissionsBitField.Flags.SendMessages)) {
            return res.status(403).json({
                success: false,
                error: `❌ البوت لا يملك صلاحية الإرسال في #${channel.name}`
            });
        }

        // جلب عضو للتجربة
        let testMember = null;
        const tryId = req.user?.userId || req.user?.id;
        if (tryId) { try { testMember = await guild.members.fetch(tryId); } catch {} }
        if (!testMember) { try { testMember = await guild.members.fetch(client.user.id); } catch {} }
        if (!testMember) {
            return res.status(404).json({ success: false, error: 'تعذّر جلب عضو للتجربة' });
        }

        const { sendWelcomeToChannel } = require('../../../utils/welcome');
        await sendWelcomeToChannel(channel, testMember, guildData);

        res.json({
            success: true,
            message: `✅ تم إرسال رسالة ترحيب تجريبية إلى #${channel.name} بنجاح! 🎉`
        });
    } catch (err) {
        console.error('[ServerOwner/test-welcome]', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// ──────────────────────────────────────────────────────────────────────────────
// الأعضاء
// ──────────────────────────────────────────────────────────────────────────────
router.get('/members/leaderboard', async (req, res) => {
    const { guildId } = req.params;
    const client = req.app.get('client');
    try {
        const guild = await client.guilds.fetch(guildId);
        const members = await guild.members.fetch();

        const leaderboard = members
            .filter(m => !m.user.bot)
            .map(m => {
                const uData = db.getUserData(m.id);
                return {
                    id: m.id,
                    username: m.user.username,
                    displayName: m.displayName,
                    avatar: m.user.displayAvatarURL({ dynamic: true }),
                    balance: uData.balance,
                    bank: uData.bank,
                    level: uData.level,
                    xp: uData.xp,
                };
            })
            .sort((a, b) => (b.balance + b.bank) - (a.balance + a.bank))
            .slice(0, 20);

        res.json({ success: true, leaderboard });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ──────────────────────────────────────────────────────────────────────────────
// Roles
// ──────────────────────────────────────────────────────────────────────────────
router.get('/roles', async (req, res) => {
    const { guildId } = req.params;
    const client = req.app.get('client');
    try {
        const guild = await client.guilds.fetch(guildId);
        const botMember = guild.members.me;
        const botTopRole = botMember?.roles?.highest?.position ?? 0;

        const roles = guild.roles.cache
            .filter(r => r.id !== guild.id)
            .sort((a, b) => b.position - a.position)
            .map(r => ({
                id: r.id,
                name: r.name,
                color: r.hexColor,
                position: r.position,
                managed: r.managed,
                mentionable: r.mentionable,
                canManage: r.position < botTopRole && !r.managed,
                memberCount: r.members.size,
            }));

        res.json({ success: true, roles });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

module.exports = router;

