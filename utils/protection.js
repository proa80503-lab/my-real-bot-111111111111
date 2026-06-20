const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const config = require('../config');
const db = require('./database');
const clanManager = require('./clan-manager');
const { sendPunishmentToChannel } = require('./punishments');

// نظام Anti-Spam
const spamMap = new Map();
const SPAM_THRESHOLD = 5; // عدد الرسائل
const SPAM_TIME = 5000; // في 5 ثوان

async function checkSpam(message) {
    if (message.author.bot) return false;
    if (!message.guild) return false; // تجاهل الرسائل الخاصة
    if (!message.member || message.member.permissions.has(PermissionFlagsBits.Administrator)) return false;

    const userId = message.author.id;
    const now = Date.now();

    if (!spamMap.has(userId)) {
        spamMap.set(userId, []);
    }

    const userMessages = spamMap.get(userId);
    userMessages.push(now);

    // تنظيف الرسائل القديمة
    const recentMessages = userMessages.filter(time => now - time < SPAM_TIME);
    spamMap.set(userId, recentMessages);

    if (recentMessages.length >= SPAM_THRESHOLD) {
        // اكتشاف سبام!
        try {
            await message.delete();

            const warning = await message.channel.send(`⚠️ ${message.author} توقف عن الإزعاج! تم حذف رسائلك.`);
            setTimeout(() => warning.delete().catch(() => { }), 5000);

            // إعطاء تايم أوت 5 دقائق
            await message.member.timeout(5 * 60 * 1000, 'Spam detection');

            // لوق الحماية
            logProtection(message.guild, {
                type: 'Anti-Spam',
                user: message.author,
                action: 'Timeout 5 minutes',
                reason: 'Sending too many messages quickly'
            });

            spamMap.delete(userId);
            return true;
        } catch (error) {
            console.error('خطأ في Anti-Spam:', error);
        }
    }

    return false;
}

// نظام Auto-Mod للكلمات السيئة
const badWords = [
    'كلب', 'حمار', 'غبي', 'احمق', 'قحبة', 'كس', 'عير', 'زب',
    'شرموطة', 'منيوك', 'قحبه', 'كسك', 'بكس', 'بكسك', 'كسي',
    'زبك', 'زبي', 'قحبتي', 'قحبتك', 'شرموطه', 'قحاب', 'شراميط',
    'عير بكس اختك', 'عير بامك'
];

function createBadWordRegex(word) {
    const chars = word.split('').map(c => c === ' ' ? '\\s+' : (c.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&') + '+'));
    const pattern = chars.join('[\\sـ]*');
    return new RegExp(`(^|[^\\u0600-\\u06FFa-zA-Z0-9_])(${pattern})(?=$|[^\\u0600-\\u06FFa-zA-Z0-9_])`, 'i');
}

const badWordRegexes = badWords.map(createBadWordRegex);

async function checkBadWords(message) {
    if (message.author.bot) return false;
    if (!message.guild) return false; // تجاهل الرسائل الخاصة
    if (!message.member || message.member.permissions.has(PermissionFlagsBits.Administrator)) return false;

    const content = message.content.toLowerCase();
    const normalizedContent = content.replace(/[ًٌٍَُِّْ]/g, '');

    const hasBadWord = badWordRegexes.some(regex => regex.test(normalizedContent));

    if (hasBadWord) {
        try {
            await message.delete();

            // تطبيق عقوبة السجن 10 دقائق
            const guildData = db.getGuildData(message.guild.id);
            if (guildData.jailRole) {
                const jailRole = message.guild.roles.cache.get(guildData.jailRole);
                if (jailRole) {
                    await message.member.roles.add(jailRole);

                    const duration = 10 * 60 * 1000; // 10 دقائق
                    db.updateUserData(message.author.id, { jailTime: Date.now() + duration });

                    // فك السجن تلقائياً
                    setTimeout(async () => {
                        if (message.member.roles.cache.has(jailRole.id)) {
                            await message.member.roles.remove(jailRole);
                        }
                    }, duration);

                    // إرسال للعقوبات
                    await sendPunishmentToChannel(message.guild, {
                        type: 'jail', // نوع العقوبة لإظهار زر الإزالة المناسب
                        userId: message.author.id,
                        color: '#FF0000',
                        title: '🔒 سجن تلقائي (ألفاظ نابية)',
                        reason: `استخدام كلمات محظورة: ${content}`, // إظهار الكلمة للمودريتور
                        duration: '10 دقائق',
                        moderator: 'Auto-Mod'
                    });
                }
            }

            const warning = await message.channel.send(`🚫 ${message.author} **تم سجنك لمدة 10 دقائق بسبب استخدام ألفاظ نابية!**`);
            setTimeout(() => warning.delete().catch(() => { }), 10000);

            // لوق الحماية (يبقى كما هو للتسجيل العام)
            logProtection(message.guild, {
                type: 'Auto-Mod (Bad Words)',
                user: message.author,
                action: 'Jail 10m',
                reason: 'Bad words detected'
            });

            return true;
        } catch (error) {
            console.error('خطأ في Auto-Mod:', error);
        }
    }

    return false;
}

// نظام Anti-Raid
const joinMap = new Map();
const RAID_THRESHOLD = 5; // عدد الأعضاء
const RAID_TIME = 10000; // في 10 ثوان

async function checkRaid(member) {
    const guildId = member.guild.id;
    const now = Date.now();

    if (!joinMap.has(guildId)) {
        joinMap.set(guildId, []);
    }

    const joins = joinMap.get(guildId);
    joins.push(now);

    // تنظيف القديم
    const recentJoins = joins.filter(time => now - time < RAID_TIME);
    joinMap.set(guildId, recentJoins);

    if (recentJoins.length >= RAID_THRESHOLD) {
        // اكتشاف raid!
        try {
            // طرد العضو
            await member.kick('Raid detection - Auto protection');

            // لوق الحماية
            logProtection(member.guild, {
                type: 'Anti-Raid',
                user: member.user,
                action: 'Kicked',
                reason: `${recentJoins.length} users joined in ${RAID_TIME / 1000} seconds`
            });

            return true;
        } catch (error) {
            console.error('خطأ في Anti-Raid:', error);
        }
    }

    return false;
}

// نظام Anti-Link - حماية من الروابط
async function checkLinks(message) {
    if (message.author.bot) return false;
    if (!message.guild) return false;
    if (!message.member || message.member.permissions.has(PermissionFlagsBits.Administrator)) return false;

    const linkPatterns = [
        /discord\.gg\/\w+/gi,
        /discordapp\.com\/invite\/\w+/gi,
        /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/gi
    ];

    const hasLink = linkPatterns.some(pattern => pattern.test(message.content));

    if (hasLink) {
        try {
            await message.delete();

            const warning = await message.channel.send(`⚠️ ${message.author} الروابط ممنوعة هنا!`);
            setTimeout(() => warning.delete().catch(() => { }), 5000);

            logProtection(message.guild, {
                type: 'Anti-Link',
                user: message.author,
                action: 'Message deleted',
                reason: 'Link detected'
            });

            return true;
        } catch (error) {
            console.error('خطأ في Anti-Link:', error);
        }
    }

    return false;
}

// نظام Anti-Caps - حماية من الحروف الكبيرة
async function checkCaps(message) {
    if (message.author.bot) return false;
    if (!message.guild) return false;
    if (!message.member || message.member.permissions.has(PermissionFlagsBits.Administrator)) return false;
    if (message.content.length < 10) return false;

    const capsCount = (message.content.match(/[A-Z]/g) || []).length;
    const totalLetters = (message.content.match(/[a-zA-Z]/g) || []).length;

    if (totalLetters > 0) {
        const capsPercentage = (capsCount / totalLetters) * 100;

        if (capsPercentage > 70) {
            try {
                await message.delete();

                const warning = await message.channel.send(`⚠️ ${message.author} لا تستخدم الكثير من الحروف الكبيرة!`);
                setTimeout(() => warning.delete().catch(() => { }), 5000);

                logProtection(message.guild, {
                    type: 'Anti-Caps',
                    user: message.author,
                    action: 'Message deleted',
                    reason: `${capsPercentage.toFixed(0)}% caps`
                });

                return true;
            } catch (error) {
                console.error('خطأ في Anti-Caps:', error);
            }
        }
    }

    return false;
}

// نظام Anti-Mention Spam - حماية من mention spam
async function checkMentionSpam(message) {
    if (message.author.bot) return false;
    if (!message.guild) return false;
    if (!message.member || message.member.permissions.has(PermissionFlagsBits.Administrator)) return false;

    const mentions = message.mentions.users.size + message.mentions.roles.size;

    if (mentions >= 5) {
        try {
            await message.delete();

            const warning = await message.channel.send(`⚠️ ${message.author} لا تذكر الكثير من الأشخاص/الرتب!`);
            setTimeout(() => warning.delete().catch(() => { }), 5000);

            // timeout 10 دقائق
            await message.member.timeout(10 * 60 * 1000, 'Mention spam');

            logProtection(message.guild, {
                type: 'Anti-Mention Spam',
                user: message.author,
                action: 'Timeout 10 minutes',
                reason: `${mentions} mentions`
            });

            return true;
        } catch (error) {
            console.error('خطأ في Anti-Mention Spam:', error);
        }
    }

    return false;
}

// نظام Anti-Emoji Spam - حماية من emoji spam
async function checkEmojiSpam(message) {
    if (message.author.bot) return false;
    if (!message.guild) return false;
    if (!message.member || message.member.permissions.has(PermissionFlagsBits.Administrator)) return false;

    const emojiCount = (message.content.match(/<a?:\w+:\d+>|[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}]/gu) || []).length;

    if (emojiCount >= 10) {
        try {
            await message.delete();

            const warning = await message.channel.send(`⚠️ ${message.author} لا تضع الكثير من الإيموجي!`);
            setTimeout(() => warning.delete().catch(() => { }), 5000);

            logProtection(message.guild, {
                type: 'Anti-Emoji Spam',
                user: message.author,
                action: 'Message deleted',
                reason: `${emojiCount} emojis`
            });

            return true;
        } catch (error) {
            console.error('خطأ في Anti-Emoji Spam:', error);
        }
    }

    return false;
}

// لوق أحداث الحماية
async function logProtection(guild, data) {
    try {
        const logChannel = guild.channels.cache.find(
            ch => ch.name === 'الحماية' || ch.name === 'protection' || ch.name === '🛡️┃الحماية'
        );

        if (!logChannel) return;

        const embed = new EmbedBuilder()
            .setColor('#FF0000')
            .setTitle(`🛡️ ${data.type}`)
            .addFields(
                { name: 'المستخدم', value: `${data.user.tag} (${data.user.id})`, inline: true },
                { name: 'الإجراء', value: data.action, inline: true },
                { name: 'السبب', value: data.reason }
            )
            .setTimestamp();

        await logChannel.send({ embeds: [embed] });
    } catch (error) {
        console.error('خطأ في لوق الحماية:', error);
    }
}

// ============================
// Advanced Protection Features
// ============================

// 1. Duplicate Message Detection - كشف الرسائل المكررة
const userMessageHistory = new Map();

// ─── تنظيف دوري لجميع المaps لمنع Memory Leak (كل 60 ثانية) ──────────────
const _cleanup = setInterval(() => {
    const now = Date.now();
    for (const [userId, msgs] of spamMap) {
        const fresh = msgs.filter(t => now - t < SPAM_TIME);
        if (fresh.length === 0) spamMap.delete(userId);
        else spamMap.set(userId, fresh);
    }
    for (const [gId, joins] of joinMap) {
        const fresh = joins.filter(t => now - t < RAID_TIME);
        if (fresh.length === 0) joinMap.delete(gId);
        else joinMap.set(gId, fresh);
    }
    for (const [uid, history] of userMessageHistory) {
        const fresh = history.filter(m => now - m.time < 60000);
        if (fresh.length === 0) userMessageHistory.delete(uid);
        else userMessageHistory.set(uid, fresh);
    }
}, 60000);
_cleanup.unref?.();

async function checkDuplicateMessages(message) {
    if (!message.guild) return false;
    if (!message.member || message.member.permissions.has(PermissionFlagsBits.Administrator)) return false;

    const userId = message.author.id;
    const messageContent = message.content.toLowerCase().trim();

    // تجاهل الرسائل القصيرة جداً
    if (!messageContent || messageContent.length < 2) return false;

    if (!userMessageHistory.has(userId)) {
        userMessageHistory.set(userId, []);
    }

    const history = userMessageHistory.get(userId);
    const now = Date.now();

    const recentMessages = history.filter(msg => now - msg.time < 60000);
    userMessageHistory.set(userId, recentMessages);

    const duplicateCount = recentMessages.filter(msg => msg.content === messageContent).length;

    if (duplicateCount >= 3) {
        try {
            await message.delete();
            await message.member.timeout(5 * 60 * 1000, 'Duplicate messages');

            const warning = await message.channel.send(`⚠️ ${message.author} تم كتم صوتك 5 دقائق بسبب الرسائل المكررة!`);
            setTimeout(() => warning.delete().catch(() => { }), 5000);

            logProtection(message.guild, {
                type: 'Anti-Spam (Duplicate)',
                user: message.author,
                action: 'Timeout 5 minutes',
                reason: 'Sending duplicate messages'
            });

            return true;
        } catch (error) {
            console.error('Error in Duplicate Messages:', error);
        }
    }

    recentMessages.push({ content: messageContent, time: now });
    return false;
}

// 2. Account Age Filter - فلتر عمر الحساب
async function checkAccountAge(member) {
    const minAccountAge = 7 * 24 * 60 * 60 * 1000; // 7 أيام
    const accountAge = Date.now() - member.user.createdTimestamp;

    if (accountAge < minAccountAge) {
        const daysOld = Math.floor(accountAge / (24 * 60 * 60 * 1000));

        try {
            await member.send(`⚠️ حسابك جديد جداً (${daysOld} يوم). الحد الأدنى: 7 أيام.`);
            await member.kick('New account protection');

            logProtection(member.guild, {
                type: 'Anti-Raid (Account Age)',
                user: member.user,
                action: 'Kick',
                reason: `Account age: ${daysOld} days (Min: 7 days)`
            });

            return true;
        } catch (error) {
            console.error('Error in Account Age:', error);
        }
    }

    return false;
}

// 3. Custom Auto-Mod Rules - قواعد مخصصة
const customRules = new Map();

function addCustomRule(guildId, rule) {
    if (!customRules.has(guildId)) {
        customRules.set(guildId, []);
    }
    customRules.get(guildId).push(rule);
}

async function checkCustomRules(message) {
    if (!message.guild) return false;
    if (!message.member || message.member.permissions.has(PermissionFlagsBits.Administrator)) return false;

    const guildRules = customRules.get(message.guild.id) || [];

    for (const rule of guildRules) {
        if (rule.enabled === false) continue;

        let matched = false;

        if (rule.type === 'regex') {
            try {
                matched = new RegExp(rule.pattern, 'i').test(message.content);
            } catch (e) {
                console.error('Invalid Regex Rule:', rule);
            }
        } else if (rule.type === 'keyword') {
            matched = message.content.toLowerCase().includes(rule.keyword.toLowerCase());
        } else if (rule.type === 'length') {
            matched = message.content.length > rule.maxLength;
        }

        if (matched) {
            try {
                if (rule.action === 'delete' || rule.action === 'warn' || rule.action === 'timeout') {
                    await message.delete();
                }

                if (rule.action === 'warn') {
                    const warning = await message.channel.send(`⚠️ ${message.author} ${rule.message || 'تحذير!'}`);
                    setTimeout(() => warning.delete().catch(() => { }), 5000);
                } else if (rule.action === 'timeout') {
                    await message.member.timeout(rule.duration || 5 * 60 * 1000, rule.reason || 'Custom Rule').catch(() => { });
                }

                logProtection(message.guild, {
                    type: `Custom Rule (${rule.name || 'Rule'})`,
                    user: message.author,
                    action: rule.action,
                    reason: rule.reason || 'Custom rule violation'
                });

                return true;
            } catch (error) {
                console.error('Error in Custom Rules:', error);
            }
        }
    }

    return false;
}

/**
 * فحص ما إذا كانت القناة محظورة من تفاعلات الشخصية (الشركات، السجلات، إلخ)
 */
function isPersonalChatRestricted(channel) {
    if (!channel || !channel.guild) return false;

    // 1. قنوات الكلانات (الشركات)
    const guildClans = clanManager.getAllClans(channel.guild.id);
    const isClanChannel = guildClans.some(c =>
        c.textChannelId === channel.id ||
        c.adminChannelId === channel.id
    );
    if (isClanChannel) return true;

    // 2. قنوات السجلات والأوامر الإدارية من الإعدادات
    const guildData = db.getGuildData(channel.guild.id);
    if (guildData.logChannel === channel.id ||
        guildData.punishmentsChannel === channel.id ||
        guildData.bankChannel === channel.id) return true;

    // 3. فحص أسماء القنوات الشائعة للسجلات والشركات
    const restrictedNames = [
        config.logChannelName, config.bankChannelName, config.punishmentsChannelName,
        'rules', 'قوانين', 'announcements', 'اعلانات', 'news', 'admin', 'staff',
        'اداره', 'سجل', 'الحماية', 'protection', 'logs', 'bot-logs', 'الشركة', 'شركة', 'تجارية'
    ];
    const channelName = channel.name.toLowerCase();
    if (restrictedNames.some(n => channelName.includes(n.toLowerCase()))) return true;

    return false;
}

module.exports = {
    checkSpam,
    checkBadWords,
    checkRaid,
    checkLinks,
    checkCaps,
    checkMentionSpam,
    checkEmojiSpam,
    checkDuplicateMessages,
    checkAccountAge,
    checkCustomRules,
    addCustomRule,
    logProtection,
    isPersonalChatRestricted
};
