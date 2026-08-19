'use strict';

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║  🌟 ADVANCED PROFILE v3.0 — بطاقة الهوية المتطورة من المستقبل          ║
 * ║  بطاقة غنية بالمعلومات | شارات ديناميكية | إحصائيات مفصلة             ║
 * ║  نظام العناوين | سجل الإنجازات | تاريخ النشاط                          ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const db = require('../../utils/database');
const config = require('../../config');
const analytics = require('../../utils/analytics');
const { getTrustScore, getTrustBadge } = require('../../utils/advanced-security');

// ─── نظام الشارات ─────────────────────────────────────────────────────────────
const BADGES = {
    // شارات المستوى
    level10:    { emoji: '🥉', name: 'مستوى 10',       condition: u => u.level >= 10 },
    level25:    { emoji: '🥈', name: 'مستوى 25',       condition: u => u.level >= 25 },
    level50:    { emoji: '🥇', name: 'مستوى 50',       condition: u => u.level >= 50 },
    level100:   { emoji: '🏆', name: 'أسطورة',          condition: u => u.level >= 100 },

    // شارات المال
    rich:       { emoji: '💎', name: 'ثري',            condition: u => (u.balance + u.bank) >= 100000 },
    millionaire:{ emoji: '👑', name: 'مليونير',         condition: u => (u.balance + u.bank) >= 1000000 },
    saver:      { emoji: '🏦', name: 'مدخّر',           condition: u => u.bank >= 50000 },

    // شارات الألعاب
    gamer:      { emoji: '🎮', name: 'لاعب',            condition: u => (u.stats?.gamesPlayed || 0) >= 50 },
    champion:   { emoji: '🎯', name: 'بطل',             condition: u => (u.stats?.gamesWon || 0) >= 25 },
    winner:     { emoji: '🌟', name: 'فائز كبير',       condition: u => (u.stats?.biggestWin || 0) >= 10000 },

    // شارات اجتماعية
    married:    { emoji: '💍', name: 'متزوج',           condition: u => u.partner !== null || u.marriedTo !== null },
    streaker:   { emoji: '🔥', name: 'ملتزم',           condition: u => (u.dailyStreak || 0) >= 7 },
    veteran:    { emoji: '⚔️', name: 'محارب قديم',       condition: u => (u.dailyStreak || 0) >= 30 },

    // شارات الاقتصاد
    investor:   { emoji: '📈', name: 'مستثمر',          condition: u => u.investments && Object.keys(u.investments).length > 0 },
    trader:     { emoji: '🏪', name: 'تاجر',            condition: u => u.inventory && Object.keys(u.inventory).length >= 5 },
};

function getUserBadges(userData) {
    return Object.entries(BADGES)
        .filter(([, badge]) => {
            try { return badge.condition(userData); } catch { return false; }
        })
        .map(([, badge]) => `${badge.emoji} ${badge.name}`);
}

// ─── مستويات الألقاب ─────────────────────────────────────────────────────────
function getUserTitle(userData) {
    const totalWealth = (userData.balance || 0) + (userData.bank || 0);
    const level = userData.level || 1;

    if (level >= 100) return { title: '🌌 إله', color: '#FFD700' };
    if (level >= 75)  return { title: '🔮 حكيم', color: '#9B59B6' };
    if (level >= 50)  return { title: '⚡ أسطورة', color: '#FF6B6B' };
    if (level >= 25)  return { title: '🌟 متمرس', color: '#3498DB' };
    if (level >= 10)  return { title: '🎯 متقدم', color: '#27AE60' };
    if (totalWealth >= 1000000) return { title: '💰 مليونير', color: '#FFD700' };
    if (totalWealth >= 100000) return { title: '💎 ثري', color: '#00BFFF' };
    return { title: '🌱 مبتدئ', color: '#95A5A6' };
}

// ─── حساب التقدم للمستوى القادم ──────────────────────────────────────────────
function getLevelProgress(xp, level) {
    const xpForCurrent = Math.max(0, level * level * 100);
    const xpForNext = (level + 1) * (level + 1) * 100;
    const diff = xpForNext - xpForCurrent;
    const rawProgress = diff > 0 ? ((xp - xpForCurrent) / diff) * 100 : 100;
    const progress = Math.min(100, Math.max(0, Math.floor(rawProgress)));
    const filled = Math.floor(progress / 10);
    const bar = '█'.repeat(filled) + '░'.repeat(10 - filled);
    const xpNeeded = Math.max(0, xpForNext - xp);
    return { progress, bar, xpNeeded };
}

// ─── رسم شريط التقدم ─────────────────────────────────────────────────────────
function drawBar(value, max, length = 10) {
    const filled = Math.round((value / Math.max(max, 1)) * length);
    return '█'.repeat(filled) + '░'.repeat(length - filled);
}

module.exports = {
    name: 'profile',
    aliases: ['بروفايل', 'prof', 'ملف', 'بطاقة', 'هوية', ],
    description: 'عرض بطاقة الهوية المتطورة',
    usage: 'بروفايل [@مستخدم]',

    async execute(message, args) {
        const target = message.mentions.users.first() || message.author;
        const userData = db.getUserData(target.id);
        const userStats = analytics.getUserStats(target.id);
        const trustScore = getTrustScore(target.id);
        const titleInfo = getUserTitle(userData);
        const badges = getUserBadges(userData);
        const levelInfo = getLevelProgress(userData.xp || 0, userData.level || 1);

        const totalWealth = (userData.balance || 0) + (userData.bank || 0);
        const winRate = userData.stats?.gamesPlayed > 0
            ? Math.round((userData.stats.gamesWon / userData.stats.gamesPlayed) * 100)
            : 0;

        const inventoryCount = Object.keys(userData.inventory || {}).length;
        const achievementCount = (userData.achievements || []).length;

        // ─── Embed الرئيسي
        const embed = new EmbedBuilder()
            .setColor(titleInfo.color)
            .setAuthor({
                name: `${titleInfo.title}  ${target.username}`,
                iconURL: target.displayAvatarURL({ size: 128 })
            })
            .setThumbnail(target.displayAvatarURL({ size: 256 }))
            .setDescription([
                badges.length > 0
                    ? `**الشارات:** ${badges.slice(0, 6).join(' • ')}`
                    : '*لا توجد شارات بعد — العب واربح لتحصل على شارات!*',
                '',
                userData.marriedTo || userData.partner
                    ? `💍 **متزوج من:** <@${userData.marriedTo || userData.partner}>`
                    : '',
            ].filter(Boolean).join('\n'))
            .addFields(
                // الصف الأول: المستوى والـ XP
                {
                    name: '⭐ المستوى والخبرة',
                    value: [
                        `\`Lv.${userData.level || 1}\` ${levelInfo.bar} \`${levelInfo.progress}%\``,
                        `> XP: \`${(userData.xp || 0).toLocaleString()}\` | يحتاج: \`${levelInfo.xpNeeded.toLocaleString()}\` للمستوى القادم`
                    ].join('\n'),
                    inline: false
                },
                // الصف الثاني: المال
                {
                    name: '💰 الثروة',
                    value: [
                        `> 👛 **المحفظة:** \`${(userData.balance || 0).toLocaleString()}\` ${config.currency}`,
                        `> 🏦 **البنك:** \`${(userData.bank || 0).toLocaleString()}\` ${config.currency}`,
                        `> 💎 **الإجمالي:** \`${totalWealth.toLocaleString()}\` ${config.currency}`,
                    ].join('\n'),
                    inline: true
                },
                // الصف الثالث: الإحصائيات
                {
                    name: '🎮 إحصائيات الألعاب',
                    value: [
                        `> 🎯 **الألعاب:** \`${userData.stats?.gamesPlayed || 0}\``,
                        `> 🏆 **الانتصارات:** \`${userData.stats?.gamesWon || 0}\``,
                        `> 📊 **معدل الفوز:** \`${winRate}%\``,
                        `> 💰 **أكبر ربح:** \`${(userData.stats?.biggestWin || 0).toLocaleString()}\``,
                    ].join('\n'),
                    inline: true
                },
                // الصف الرابع: النشاط
                {
                    name: '📊 النشاط العام',
                    value: [
                        `> 💬 **الرسائل:** \`${(userStats.messages || 0).toLocaleString()}\``,
                        `> ⌨️ **الأوامر:** \`${(userStats.commands || 0).toLocaleString()}\``,
                        `> 🔥 **Daily Streak:** \`${userData.dailyStreak || 0}\` يوم`,
                        `> 🛡️ **الثقة:** \`${trustScore}/100\` ${getTrustBadge(trustScore)}`,
                    ].join('\n'),
                    inline: true
                },
                // الصف الخامس: المقتنيات والإنجازات
                {
                    name: '🎒 المخزون والإنجازات',
                    value: [
                        `> 🎒 **العناصر:** \`${inventoryCount}\` عنصر`,
                        `> 🏅 **الإنجازات:** \`${achievementCount}\` إنجاز`,
                        `> 📅 **انضم:** \`${userData.joinDate ? new Date(userData.joinDate).toLocaleDateString('ar-SA') : 'غير معروف'}\``,
                    ].join('\n'),
                    inline: true
                }
            )
            .setFooter({
                text: `📊 بطاقة هوية متطورة • ${target.username}`,
                iconURL: message.client.user.displayAvatarURL()
            })
            .setTimestamp();

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`prof_refresh_${target.id}`)
                .setLabel('🔄 تحديث')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId(`prof_badges_${target.id}`)
                .setLabel('🏅 الشارات الكاملة')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId(`prof_history_${target.id}`)
                .setLabel('📋 سجل المعاملات')
                .setStyle(ButtonStyle.Secondary)
        );

        const reply = await message.reply({ embeds: [embed], components: [row] });

        // معالجة أزرار البروفايل
        const collector = reply.createMessageComponentCollector({ time: 120000 });
        collector.on('collect', async (btnInteraction) => {
            if (btnInteraction.user.id !== message.author.id) {
                return btnInteraction.reply({ content: '❌ هذه الأزرار لصاحب الأمر فقط', flags: MessageFlags.Ephemeral });
            }

            try {
                if (btnInteraction.customId.startsWith('prof_badges_')) {
                    const allBadges = getUserBadges(db.getUserData(target.id));
                    const badgeEmbed = new EmbedBuilder()
                        .setColor(titleInfo.color)
                        .setTitle(`🏅 شارات ${target.username}`)
                        .setDescription(
                            allBadges.length > 0
                                ? allBadges.map(b => `> ${b}`).join('\n')
                                : '> *لا توجد شارات بعد! العب الألعاب وراكم الثروة للحصول على شارات.*'
                        )
                        .setThumbnail(target.displayAvatarURL())
                        .addFields({
                            name: '📋 كيفية الحصول على الشارات',
                            value: [
                                '`🥉🥈🥇🏆` — ارفع مستواك',
                                '`💎👑` — اجمع ثروة',
                                '`🎮🎯🌟` — العب وافز',
                                '`💍🔥⚔️` — تزوج وحافظ على التتابع',
                            ].join('\n')
                        });
                    await btnInteraction.update({ embeds: [badgeEmbed], components: [row] });

                } else if (btnInteraction.customId.startsWith('prof_history_')) {
                    const freshData = db.getUserData(target.id);
                    const transactions = (freshData.transactions || []).slice(0, 10);

                    const histEmbed = new EmbedBuilder()
                        .setColor('#3498DB')
                        .setTitle(`📋 آخر معاملات ${target.username}`)
                        .setDescription(
                            transactions.length > 0
                                ? transactions.map(t => {
                                    const date = new Date(t.timestamp).toLocaleDateString('ar-SA');
                                    const sign = t.type.includes('win') || t.type === 'daily' || t.type === 'earn' ? '+' : '-';
                                    const color = sign === '+' ? '🟢' : '🔴';
                                    return `${color} \`${sign}${t.amount.toLocaleString()}\` — ${t.description} *(${date})*`;
                                }).join('\n')
                                : '*لا توجد معاملات بعد*'
                        );
                    await btnInteraction.update({ embeds: [histEmbed], components: [row] });

                } else if (btnInteraction.customId.startsWith('prof_refresh_')) {
                    // إعادة بناء الـ embed بأحدث البيانات
                    const freshUser = db.getUserData(target.id);
                    const freshStats = analytics.getUserStats(target.id);
                    const freshTrust = getTrustScore(target.id);
                    const freshTitle = getUserTitle(freshUser);
                    const freshBadges = getUserBadges(freshUser);
                    const freshLevel = getLevelProgress(freshUser.xp || 0, freshUser.level || 1);
                    const freshWealth = (freshUser.balance || 0) + (freshUser.bank || 0);
                    const freshWinRate = freshUser.stats?.gamesPlayed > 0
                        ? Math.round((freshUser.stats.gamesWon / freshUser.stats.gamesPlayed) * 100)
                        : 0;

                    const refreshedEmbed = new EmbedBuilder()
                        .setColor(freshTitle.color)
                        .setAuthor({
                            name: `${freshTitle.title}  ${target.username}`,
                            iconURL: target.displayAvatarURL({ size: 128 })
                        })
                        .setThumbnail(target.displayAvatarURL({ size: 256 }))
                        .setDescription([
                            freshBadges.length > 0
                                ? `**الشارات:** ${freshBadges.slice(0, 6).join(' • ')}`
                                : '*لا توجد شارات بعد — العب واربح لتحصل على شارات!*',
                            '',
                            freshUser.marriedTo
                                ? `💍 **متزوج من:** <@${freshUser.marriedTo}>`
                                : (freshUser.partner ? `💍 **متزوج من:** <@${freshUser.partner}>` : ''),
                        ].filter(Boolean).join('\n'))
                        .addFields(
                            {
                                name: '⭐ المستوى والخبرة',
                                value: [
                                    `\`Lv.${freshUser.level || 1}\` ${freshLevel.bar} \`${freshLevel.progress}%\``,
                                    `> XP: \`${(freshUser.xp || 0).toLocaleString()}\` | يحتاج: \`${freshLevel.xpNeeded.toLocaleString()}\` للمستوى القادم`
                                ].join('\n'),
                                inline: false
                            },
                            {
                                name: '💰 الثروة',
                                value: [
                                    `> 👛 **المحفظة:** \`${(freshUser.balance || 0).toLocaleString()}\` ${config.currency}`,
                                    `> 🏦 **البنك:** \`${(freshUser.bank || 0).toLocaleString()}\` ${config.currency}`,
                                    `> 💎 **الإجمالي:** \`${freshWealth.toLocaleString()}\` ${config.currency}`,
                                ].join('\n'),
                                inline: true
                            },
                            {
                                name: '🎮 إحصائيات الألعاب',
                                value: [
                                    `> 🎯 **الألعاب:** \`${freshUser.stats?.gamesPlayed || 0}\``,
                                    `> 🏆 **الانتصارات:** \`${freshUser.stats?.gamesWon || 0}\``,
                                    `> 📊 **معدل الفوز:** \`${freshWinRate}%\``,
                                    `> 💰 **أكبر ربح:** \`${(freshUser.stats?.biggestWin || 0).toLocaleString()}\``,
                                ].join('\n'),
                                inline: true
                            },
                            {
                                name: '📊 النشاط العام',
                                value: [
                                    `> 💬 **الرسائل:** \`${(freshStats.messages || 0).toLocaleString()}\``,
                                    `> ⌨️ **الأوامر:** \`${(freshStats.commands || 0).toLocaleString()}\``,
                                    `> 🔥 **Daily Streak:** \`${freshUser.dailyStreak || 0}\` يوم`,
                                    `> 🛡️ **الثقة:** \`${freshTrust}/100\` ${getTrustBadge(freshTrust)}`,
                                ].join('\n'),
                                inline: true
                            },
                            {
                                name: '🎒 المخزون والإنجازات',
                                value: [
                                    `> 🎒 **العناصر:** \`${Object.keys(freshUser.inventory || {}).length}\` عنصر`,
                                    `> 🏅 **الإنجازات:** \`${(freshUser.achievements || []).length}\` إنجاز`,
                                    `> 📅 **انضم:** \`${freshUser.joinDate ? new Date(freshUser.joinDate).toLocaleDateString('ar-SA') : 'غير معروف'}\``,
                                ].join('\n'),
                                inline: true
                            }
                        )
                        .setFooter({
                            text: `📊 بطاقة هوية متطورة • ${target.username}`,
                            iconURL: message.client.user.displayAvatarURL()
                        })
                        .setTimestamp();

                    await btnInteraction.update({ embeds: [refreshedEmbed], components: [row] });
                }
            } catch (err) {
                console.error('[Profile Button Error]:', err);
                if (!btnInteraction.replied && !btnInteraction.deferred) {
                    btnInteraction.reply({ content: '❌ حدث خطأ في معالجة الزر.', flags: MessageFlags.Ephemeral }).catch(() => {});
                }
            }
        });

        collector.on('end', () => {
            reply.edit({ components: [] }).catch(() => {});
        });
    }
};
