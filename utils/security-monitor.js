'use strict';

/**
 * ══════════════════════════════════════════════════════════════
 *  🛡️  SECURITY MONITOR — نظام المراقبة الأمنية المتقدم
 *  يراقب السيرفر 24/7 ويوقف أي تهديد فوراً بدون تردد
 * ══════════════════════════════════════════════════════════════
 */

const { EmbedBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const config = require('../config');
const clanManager = require('./clan-manager');
const db = require('./database');

// ─── إحصائيات الحوادث ───────────────────────────────────────────────────────
const incidentLog = []; // آخر 50 حادثة
const MAX_LOG = 50;

function recordIncident(type, guildId, userId, details) {
    incidentLog.unshift({ type, guildId, userId, details, time: Date.now() });
    if (incidentLog.length > MAX_LOG) incidentLog.pop();
}

function getRecentIncidents(guildId, limit = 5) {
    return incidentLog.filter(i => i.guildId === guildId).slice(0, limit);
}

// ─── حالة أنظمة الحماية ─────────────────────────────────────────────────────
const systemStatus = {
    antiNuke: true,
    antiPhishing: true,
    antiTokenSniff: true,
    antiAdminAbuse: true,
    antiMassDM: true,
    antiBotAbuse: true,
    lockdownMode: false,   // وضع الإغلاق الكامل
};

// ─── Whitelist (أصحاب السيرفر والثقات) ──────────────────────────────────────
const trustedUsers = new Set();

function addTrustedUser(userId) { trustedUsers.add(userId); }
function removeTrustedUser(userId) { trustedUsers.delete(userId); }
function isTrusted(userId, guildOwnerId) {
    return userId === guildOwnerId ||
        userId === config.ownerId ||
        trustedUsers.has(userId);
}

// ════════════════════════════════════════════════════════════════
//  🚨 ANTI-NUKE — كشف ووقف محاولات تدمير السيرفر
// ════════════════════════════════════════════════════════════════
const nukeTracker = new Map(); // executorId → { actions: [], sanctioned: bool }
const NUKE_THRESHOLD = 3;      // 3 حذوفات/إنشاءات
const NUKE_WINDOW = 10_000;    // في 10 ثوانٍ

/**
 * يُستدعى عند: حذف/إنشاء قناة أو رتبة
 * type: 'channel_delete' | 'channel_create' | 'role_delete' | 'role_create' | 'webhook_delete'
 */
async function trackNukeAction(guild, executor, type) {
    if (!systemStatus.antiNuke) return;
    if (!executor) return;
    if (isTrusted(executor.id, guild.ownerId)) return;

    const key = `${guild.id}:${executor.id}`;
    const now = Date.now();

    if (!nukeTracker.has(key)) nukeTracker.set(key, { actions: [], sanctioned: false });
    const data = nukeTracker.get(key);

    if (data.sanctioned) return; // تم التعامل معه بالفعل

    data.actions.push({ type, time: now });
    // تنظيف الأحداث القديمة خارج النافذة الزمنية
    data.actions = data.actions.filter(a => now - a.time < NUKE_WINDOW);

    if (data.actions.length >= NUKE_THRESHOLD) {
        data.sanctioned = true;
        await _executeNukeResponse(guild, executor, data.actions);
    }
}

async function _executeNukeResponse(guild, executor, actions) {
    const summary = actions.map(a => a.type).join(', ');
    console.warn(`[🚨 ANTI-NUKE] تهديد: ${executor.tag} في ${guild.name} | ${summary}`);

    try {
        const member = await guild.members.fetch(executor.id).catch(() => null);
        if (member) {
            // 1. سحب جميع الرتب فوراً
            const dangerousRoles = member.roles.cache.filter(r =>
                r.permissions.has(PermissionFlagsBits.Administrator) ||
                r.permissions.has(PermissionFlagsBits.ManageChannels) ||
                r.permissions.has(PermissionFlagsBits.ManageRoles) ||
                r.permissions.has(PermissionFlagsBits.ManageGuild)
            );
            for (const [, role] of dangerousRoles) {
                await member.roles.remove(role, '🚨 Anti-Nuke: تجريد فوري').catch(() => { });
            }

            // 2. Timeout أقصى مدة (28 يوم)
            await member.timeout(28 * 24 * 60 * 60 * 1000, '🚨 Anti-Nuke: نشاط تدميري مشبوه').catch(() => { });
        }

        // 3. تنبيه فوري للأونر
        await _alertOwner(guild, {
            title: '🚨 Anti-Nuke — تم إيقاف هجوم!',
            color: '#FF0000',
            fields: [
                { name: '⚠️ المهاجم', value: `${executor.tag}\n\`${executor.id}\``, inline: true },
                { name: '📋 الأحداث', value: summary, inline: true },
                { name: '⚡ الإجراء', value: 'سُحبت الصلاحيات + Timeout 28 يوم', inline: false },
            ]
        });

        recordIncident('Anti-Nuke', guild.id, executor.id, summary);
        await _sendSecurityLog(guild, {
            type: '🚨 Anti-Nuke',
            color: '#FF0000',
            user: executor,
            action: 'تجريد الصلاحيات + Timeout 28 يوم',
            reason: `نشاط تدميري: ${summary}`,
            critical: true
        });

    } catch (err) {
        console.error('[Anti-Nuke] خطأ في التعامل مع التهديد:', err.message);
    }
}

// ════════════════════════════════════════════════════════════════
//  🎣 ANTI-PHISHING — كشف روابط الاحتيال
// ════════════════════════════════════════════════════════════════
const PHISHING_PATTERNS = [
    // Discord nitro scams
    /discord\s*[-_.]?\s*gift\s*[-_.]?\s*(com|net|gg|io|site|online)\b/gi,
    /discordnitro\s*[-_.]?\s*(com|net|gg|io)\b/gi,
    /free\s*[-_.]?\s*nitro\s*[-_.]?\s*(com|net|claim|gift)\b/gi,
    /nitro\s*[-_.]?\s*generator\b/gi,
    // Steam scams
    /steam\s*[-_.]?\s*(community|gift|trade)\s*[-_.]?\s*(com|net|io|site)\b.*\/(gift|trade|giveaway)/gi,
    // IP grabbers & malware
    /grabify\s*\.link/gi,
    /iplogger\s*\.(com|co\.uk|org)/gi,
    /blasze\.com/gi,
    /leakinfo\.net/gi,
    // Fake Discord login
    /discord[-_]?login\s*\.(com|net|ru|tk|ml|ga|cf)/gi,
    /discordapp[-_]?login\s*\.(com|net|ru)/gi,
    // URL shorteners often used for phishing
    /bit\.ly\/\w+.*discord/gi,
    // generic suspicious patterns
    /validate\s*[-_.]?\s*discord/gi,
    /verify\s*[-_.]?\s*discord\s*[-_.]?\s*(account|nitro)/gi,
];

async function checkPhishing(message) {
    if (!systemStatus.antiPhishing) return false;
    if (!message.guild) return false;
    if (message.author.bot) return false;
    if (isTrusted(message.author.id, message.guild.ownerId)) return false;

    const content = message.content;
    const matched = PHISHING_PATTERNS.some(p => { p.lastIndex = 0; return p.test(content); });

    if (matched) {
        try {
            await message.delete().catch(() => { });

            // حظر فوري
            await message.guild.bans.create(message.author.id, {
                reason: '🎣 كشف رابط احتيال (Phishing) — حظر تلقائي فوري',
                deleteMessageSeconds: 86400 // حذف رسائل آخر 24 ساعة
            }).catch(() => { });

            await _sendSecurityLog(message.guild, {
                type: '🎣 Anti-Phishing',
                color: '#FF4500',
                user: message.author,
                action: 'Ban فوري + حذف الرسالة',
                reason: `رابط احتيال: ${content.substring(0, 200)}`,
                critical: true
            });

            await _alertOwner(message.guild, {
                title: '🎣 Anti-Phishing — تم اكتشاف رابط احتيال!',
                color: '#FF4500',
                fields: [
                    { name: '🚫 المستخدم', value: `${message.author.tag} (${message.author.id})`, inline: true },
                    { name: '📣 القناة', value: `${message.channel.name}`, inline: true },
                    { name: '🔗 المحتوى', value: content.substring(0, 300), inline: false },
                ]
            });

            recordIncident('Phishing', message.guild.id, message.author.id, content.substring(0, 100));
            return true;
        } catch (err) {
            console.error('[Anti-Phishing] خطأ:', err.message);
        }
    }
    return false;
}

// ════════════════════════════════════════════════════════════════
//  🔑 ANTI-TOKEN SNIFFING — منع نشر التوكنات
// ════════════════════════════════════════════════════════════════
// نمط توكن Discord الحقيقي: Base64(ID).Base64(Timestamp).HMAC
const TOKEN_REGEX = /[MN][A-Za-z\d_-]{23,25}\.[A-Za-z\d_-]{6}\.[A-Za-z\d_-]{27,38}/g;
// نمط توكن بوت (المعتاد)
const BOT_TOKEN_REGEX = /Bot\s+[MN][A-Za-z\d_-]{23,25}\.[A-Za-z\d_-]{6}\.[A-Za-z\d_-]{27,38}/gi;

async function checkTokenSniffing(message) {
    if (!systemStatus.antiTokenSniff) return false;
    if (!message.guild) return false;
    if (message.author.bot) return false;

    TOKEN_REGEX.lastIndex = 0;
    BOT_TOKEN_REGEX.lastIndex = 0;
    const hasToken = TOKEN_REGEX.test(message.content) || BOT_TOKEN_REGEX.test(message.content);

    if (hasToken) {
        try {
            await message.delete().catch(() => { });

            // تنبيه قوي جداً — هذا خطير
            await _sendSecurityLog(message.guild, {
                type: '🔑 Token Sniffing Detected',
                color: '#8B0000',
                user: message.author,
                action: 'حذف الرسالة + تنبيه طارئ',
                reason: 'اكتشاف نمط توكن في الرسالة!',
                critical: true
            });

            await _alertOwner(message.guild, {
                title: '🔑 ⚠️ خطر: اكتشاف توكن في الرسالة!',
                color: '#8B0000',
                fields: [
                    { name: '👤 المرسِل', value: `${message.author.tag}\n\`${message.author.id}\``, inline: true },
                    { name: '📣 القناة', value: message.channel.name, inline: true },
                    { name: '⚡ الإجراء', value: 'تم حذف الرسالة فوراً — راجع أمان حسابك!', inline: false },
                ]
            });

            // timeout للمشتبه به
            await message.member?.timeout(60 * 60 * 1000, '🔑 نشر توكن مشبوه').catch(() => { });

            recordIncident('TokenSniff', message.guild.id, message.author.id, 'Token pattern detected');
            return true;
        } catch (err) {
            console.error('[Anti-TokenSniff] خطأ:', err.message);
        }
    }
    return false;
}

// ════════════════════════════════════════════════════════════════
//  👑 ADMIN ABUSE DETECTOR — كشف إساءة استخدام الصلاحيات
// ════════════════════════════════════════════════════════════════
const adminActionTracker = new Map(); // executorId → timestamps[]
const ADMIN_ABUSE_THRESHOLD = 5; // 5 إجراءات خطيرة
const ADMIN_ABUSE_WINDOW = 30_000; // في 30 ثانية

const DANGEROUS_PERMISSIONS = [
    PermissionFlagsBits.Administrator,
    PermissionFlagsBits.BanMembers,
    PermissionFlagsBits.KickMembers,
    PermissionFlagsBits.ManageGuild,
    PermissionFlagsBits.ManageRoles,
    PermissionFlagsBits.ManageChannels,
    PermissionFlagsBits.ManageWebhooks,
];

async function checkAdminAbuse(guild, executor, actionType) {
    if (!systemStatus.antiAdminAbuse) return;
    if (!executor) return;
    if (isTrusted(executor.id, guild.ownerId)) return;

    const key = `${guild.id}:${executor.id}`;
    const now = Date.now();

    if (!adminActionTracker.has(key)) adminActionTracker.set(key, []);
    const times = adminActionTracker.get(key);
    times.push(now);

    const recent = times.filter(t => now - t < ADMIN_ABUSE_WINDOW);
    adminActionTracker.set(key, recent);

    if (recent.length >= ADMIN_ABUSE_THRESHOLD) {
        adminActionTracker.delete(key); // reset لتجنب تكرار الإجراء

        console.warn(`[👑 ADMIN-ABUSE] ${executor.tag} | ${actionType} | ${recent.length} actions in 30s`);

        try {
            const member = await guild.members.fetch(executor.id).catch(() => null);
            if (member && !isTrusted(member.id, guild.ownerId)) {
                await member.timeout(2 * 60 * 60 * 1000, '👑 Admin Abuse: تصرفات إدارية مشبوهة بسرعة عالية').catch(() => { });
            }

            await _sendSecurityLog(guild, {
                type: '👑 Admin Abuse Detected',
                color: '#FF8C00',
                user: executor,
                action: `Timeout ساعتين | ${recent.length} إجراء في 30s`,
                reason: `إساءة صلاحيات: ${actionType}`,
                critical: true
            });

            recordIncident('AdminAbuse', guild.id, executor.id, `${actionType} x${recent.length}`);
        } catch (err) {
            console.error('[Admin-Abuse] خطأ:', err.message);
        }
    }
}

/**
 * فحص منح صلاحيات خطيرة لعضو
 * يُستدعى من event guildMemberUpdate
 */
async function checkPermissionEscalation(guild, addedRole, executor) {
    if (!executor) return;
    if (isTrusted(executor.id, guild.ownerId)) return;

    const isDangerous = DANGEROUS_PERMISSIONS.some(p => addedRole.permissions.has(p));
    if (!isDangerous) return;

    await _sendSecurityLog(guild, {
        type: '⬆️ Permission Escalation',
        color: '#FFA500',
        user: executor,
        action: `منح رتبة خطيرة: ${addedRole.name}`,
        reason: 'رتبة تحتوي على صلاحيات Admin/Manage',
        critical: false
    });

    await checkAdminAbuse(guild, executor, `granted dangerous role: ${addedRole.name}`);
    recordIncident('PermEscalation', guild.id, executor.id, addedRole.name);
}

// ════════════════════════════════════════════════════════════════
//  📨 ANTI-MASS-DM — منع الرسائل الجماعية المشبوهة
// ════════════════════════════════════════════════════════════════
const massDmTracker = new Map(); // userId → dm_count
const MASS_DM_THRESHOLD = 5;
const MASS_DM_WINDOW = 60_000;

async function trackDMAttempt(guild, user) {
    if (!systemStatus.antiMassDM) return;
    if (isTrusted(user.id, guild.ownerId)) return;

    const key = user.id;
    const now = Date.now();
    if (!massDmTracker.has(key)) massDmTracker.set(key, []);

    const times = massDmTracker.get(key);
    times.push(now);
    const recent = times.filter(t => now - t < MASS_DM_WINDOW);
    massDmTracker.set(key, recent);

    if (recent.length >= MASS_DM_THRESHOLD) {
        massDmTracker.delete(key);

        try {
            const member = await guild.members.fetch(user.id).catch(() => null);
            if (member) {
                await member.timeout(60 * 60 * 1000, '📨 Mass DM Spam: محاولة إرسال DM جماعي').catch(() => { });
            }

            await _sendSecurityLog(guild, {
                type: '📨 Mass DM Guard',
                color: '#9B59B6',
                user,
                action: `Timeout ساعة | ${recent.length} محاولة DM في دقيقة`,
                reason: 'إرسال رسائل خاصة جماعية مشبوه',
                critical: false
            });

            recordIncident('MassDM', guild.id, user.id, `${recent.length} DMs in 60s`);
        } catch (err) {
            console.error('[Mass-DM] خطأ:', err.message);
        }
    }
}

// ════════════════════════════════════════════════════════════════
//  🤖 BOT VERIFICATION — التحقق من البوتات الجديدة
// ════════════════════════════════════════════════════════════════
async function checkSuspiciousBot(member) {
    if (!systemStatus.antiBotAbuse) return;
    if (!member.user.bot) return;

    // تحقق: هل البوت أُضيف من قِبل صاحب السيرفر أو موثوق؟
    const guild = member.guild;
    const auditLogs = await guild.fetchAuditLogs({ limit: 1, type: 28 }).catch(() => null);
    const entry = auditLogs?.entries.first();
    const addedBy = entry?.executor;

    const isAuthorized = addedBy && isTrusted(addedBy.id, guild.ownerId);

    if (!isAuthorized) {
        await _alertOwner(guild, {
            title: '🤖 ⚠️ بوت جديد أُضيف للسيرفر!',
            color: '#F39C12',
            fields: [
                { name: '🤖 البوت', value: `${member.user.tag}\n\`${member.user.id}\``, inline: true },
                { name: '👤 أضافه', value: addedBy ? `${addedBy.tag}` : 'غير معروف', inline: true },
                { name: '⚠️ تحذير', value: 'راجع صلاحيات هذا البوت فوراً!', inline: false },
            ]
        });

        await _sendSecurityLog(guild, {
            type: '🤖 Bot Added',
            color: '#F39C12',
            user: member.user,
            action: `أضافه: ${addedBy?.tag || 'غير معروف'}`,
            reason: 'بوت جديد انضم للسيرفر',
            critical: false
        });

        recordIncident('BotAdded', guild.id, member.user.id, addedBy?.tag || 'unknown');
    }
}

// ════════════════════════════════════════════════════════════════
//  🔒 LOCKDOWN MODE — وضع الإغلاق الكامل
// ════════════════════════════════════════════════════════════════
async function enableLockdown(guild, reason = 'هجوم شامل على السيرفر') {
    if (systemStatus.lockdownMode) return; // تجنب التكرار
    systemStatus.lockdownMode = true;

    console.warn(`[🔒 LOCKDOWN] تفعيل في ${guild.name} | ${reason}`);

    const lockedChannels = [];
    const everyoneRole = guild.roles.everyone;

    for (const [, channel] of guild.channels.cache) {
        if (channel.type !== ChannelType.GuildText) continue;
        try {
            await channel.permissionOverwrites.edit(everyoneRole, {
                SendMessages: false,
                AddReactions: false,
            }, { reason: `🔒 Lockdown: ${reason}` });
            lockedChannels.push(channel.name);
        } catch { }
    }

    await _alertOwner(guild, {
        title: '🔒 LOCKDOWN مُفعَّل!',
        color: '#FF0000',
        fields: [
            { name: '⚠️ السبب', value: reason, inline: false },
            { name: '📣 القنوات المقفلة', value: `${lockedChannels.length} قناة`, inline: true },
            { name: '🔓 للإلغاء', value: '`!فك-الإغلاق`', inline: true },
        ]
    });

    recordIncident('Lockdown', guild.id, 'SYSTEM', reason);
    return lockedChannels.length;
}

async function disableLockdown(guild, executor) {
    if (!systemStatus.lockdownMode) return;
    systemStatus.lockdownMode = false;

    const everyoneRole = guild.roles.everyone;
    const guildClans = clanManager.getAllClans(guild.id);
    const guildData = db.getGuildData(guild.id);

    // تجميع معرفات القنوات التي يجب أن تبقى مغلقة
    const protectedChannelIds = new Set();

    // 1. قنوات الكلانات (الشركات)
    guildClans.forEach(clan => {
        if (clan.textChannelId) protectedChannelIds.add(clan.textChannelId);
        if (clan.adminChannelId) protectedChannelIds.add(clan.adminChannelId);
        if (clan.voiceChannelId) protectedChannelIds.add(clan.voiceChannelId);
    });

    // 2. قناة الألعاب من قاعدة البيانات
    if (guildData.gamesChannel) protectedChannelIds.add(guildData.gamesChannel);

    for (const [, channel] of guild.channels.cache) {
        if (channel.type !== ChannelType.GuildText) continue;

        // استثناء القنوات المحمية أو التي تحتوي على كلمات دالة
        const isSpecial = protectedChannelIds.has(channel.id) ||
            channel.name.includes('شركة') ||
            channel.name.includes('لعبة') ||
            channel.name.includes('game');

        if (isSpecial) continue;

        try {
            await channel.permissionOverwrites.edit(everyoneRole, {
                SendMessages: null,
                AddReactions: null,
            }, { reason: '🔓 Lockdown رُفع' });
        } catch { }
    }

    await _sendSecurityLog(guild, {
        type: '🔓 Lockdown Disabled',
        color: '#00FF00',
        user: executor,
        action: 'رُفع الإغلاق عن جميع القنوات',
        reason: 'تم رفع وضع الإغلاق يدوياً',
        critical: false
    });
}

// ════════════════════════════════════════════════════════════════
//  📡 HELPERS — دوال مساعدة
// ════════════════════════════════════════════════════════════════

/**
 * إرسال تنبيه أمني لقناة الحماية
 */
async function _sendSecurityLog(guild, { type, color, user, action, reason, critical = false }) {
    try {
        const logChannel = guild.channels.cache.find(ch =>
            ch.name === 'الحماية' ||
            ch.name === 'protection' ||
            ch.name === '🛡️┃الحماية' ||
            ch.name === 'security-log' ||
            ch.name === 'سجل-الأمان'
        );

        if (!logChannel) return;

        const embed = new EmbedBuilder()
            .setColor(color || '#FF0000')
            .setTitle(`${critical ? '🚨 ' : ''}${type}`)
            .addFields(
                { name: '👤 المستخدم', value: user ? `${user.tag}\n\`${user.id}\`` : 'نظام', inline: true },
                { name: '⚡ الإجراء', value: action, inline: true },
                { name: '📋 السبب', value: reason, inline: false }
            )
            .setTimestamp()
            .setFooter({ text: '🛡️ Security Monitor v2.0' });

        const content = critical ? `@here ⚠️ **تنبيه أمني طارئ!**` : '';
        await logChannel.send({ content: content || undefined, embeds: [embed] });
    } catch (err) {
        console.error('[SecurityLog] خطأ في إرسال السجل:', err.message);
    }
}

/**
 * إرسال تنبيه مباشر لصاحب السيرفر عبر DM
 */
async function _alertOwner(guild, { title, color, fields }) {
    try {
        const owner = await guild.fetchOwner().catch(() => null);
        if (!owner) return;

        const embed = new EmbedBuilder()
            .setColor(color || '#FF0000')
            .setTitle(title)
            .addFields(...fields)
            .addFields({ name: '🏠 السيرفر', value: guild.name, inline: true })
            .setTimestamp()
            .setFooter({ text: '🛡️ Security Monitor — تنبيه طارئ' });

        await owner.send({ embeds: [embed] }).catch(() => {
            // إذا لم يُمكن الإرسال عبر DM، نبحث عن قناة الأونر
            const ownerChannel = guild.channels.cache.find(ch =>
                ch.name?.includes('owner') || ch.name?.includes('أونر')
            );
            if (ownerChannel) ownerChannel.send({ content: `<@${owner.id}>`, embeds: [embed] }).catch(() => { });
        });
    } catch (err) {
        console.error('[Alert-Owner] خطأ:', err.message);
    }
}

// ─── تنظيف دوري لمنع Memory Leak ─────────────────────────────────────────────
const _cleanup = setInterval(() => {
    const now = Date.now();
    for (const [k, data] of nukeTracker) {
        data.actions = data.actions.filter(a => now - a.time < NUKE_WINDOW);
        if (data.actions.length === 0 && !data.sanctioned) nukeTracker.delete(k);
    }
    for (const [k, times] of adminActionTracker) {
        const fresh = times.filter(t => now - t < ADMIN_ABUSE_WINDOW);
        if (fresh.length === 0) adminActionTracker.delete(k);
        else adminActionTracker.set(k, fresh);
    }
    for (const [k, times] of massDmTracker) {
        const fresh = times.filter(t => now - t < MASS_DM_WINDOW);
        if (fresh.length === 0) massDmTracker.delete(k);
        else massDmTracker.set(k, fresh);
    }
}, 60_000);
_cleanup.unref?.();

// ════════════════════════════════════════════════════════════════
//  📊 STATUS — حالة الأنظمة والإحصائيات
// ════════════════════════════════════════════════════════════════
function getSystemStatus() {
    return { ...systemStatus };
}

function getIncidentLog(guildId, limit = 5) {
    return getRecentIncidents(guildId, limit);
}

function toggleSystem(systemName, enabled) {
    if (systemName in systemStatus) {
        systemStatus[systemName] = enabled;
        return true;
    }
    return false;
}

// ════════════════════════════════════════════════════════════════
//  📤 EXPORTS
// ════════════════════════════════════════════════════════════════
module.exports = {
    // Anti-Nuke
    trackNukeAction,
    // Anti-Phishing
    checkPhishing,
    // Anti-Token
    checkTokenSniffing,
    // Admin Abuse
    checkAdminAbuse,
    checkPermissionEscalation,
    // Mass DM
    trackDMAttempt,
    // Bot verification
    checkSuspiciousBot,
    // Lockdown
    enableLockdown,
    disableLockdown,
    // Whitelist
    addTrustedUser,
    removeTrustedUser,
    isTrusted,
    // Status & Logs
    getSystemStatus,
    getIncidentLog,
    toggleSystem,
    // Internal (reusable)
    _sendSecurityLog,
    _alertOwner,
};
