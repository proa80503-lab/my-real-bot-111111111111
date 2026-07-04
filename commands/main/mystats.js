'use strict';

/**
 * إحصائياتي الشخصية — لوحة بيانات متكاملة لكل لاعب
 * تعرض: رصيد، مستوى، إنجازات، ألعاب، سمعة، زواج، والمزيد
 */

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const db = require('../../utils/database');
const levels = require('../../utils/levels');
const config = require('../../config');

module.exports = {
    name: 'mystats',
    aliases: ['إحصائياتي', 'احصائياتي', 'stats', 'ستاتس', 'معلوماتي'],
    description: 'عرض إحصائياتك الشخصية التفصيلية',
    usage: 'إحصائياتي',

    async execute(message, args) {
        // يمكن عرض إحصائيات شخص آخر إذا تم منشنه
        const targetUser = message.mentions.users.first() || message.author;
        const isOther = targetUser.id !== message.author.id;

        const userData = db.getUserData(targetUser.id);
        const lvlInfo = levels.getLevelProgress(targetUser.id);
        const now = Date.now();

        // ── حساب الثروة الكلية ─────────────────────────────────────────
        const wallet = userData.balance || 0;
        const bank   = userData.bank    || 0;
        const total  = wallet + bank;

        // ── حساب رتبة الثروة ───────────────────────────────────────────
        const allUsers = db.getAllUsers();
        const wealthRank = Object.values(allUsers)
            .map(u => (u.balance || 0) + (u.bank || 0))
            .sort((a, b) => b - a)
            .findIndex(w => w <= total) + 1;
        const xpRank = Object.values(allUsers)
            .map(u => u.xp || 0)
            .sort((a, b) => b - a)
            .findIndex(x => x <= (userData.xp || 0)) + 1;

        // ── الإحصائيات ──────────────────────────────────────────────────
        const stats = userData.stats || {};
        const gamesPlayed = stats.gamesPlayed  || 0;
        const gamesWon    = stats.gamesWon     || 0;
        const winRate     = gamesPlayed > 0 ? Math.round((gamesWon / gamesPlayed) * 100) : 0;
        const biggestWin  = stats.biggestWin   || 0;

        // ── نظام الزواج ─────────────────────────────────────────────────
        let marriageInfo = '> 💔 غير متزوج/ة';
        if (userData.marriedTo) {
            try {
                const partner = await message.client.users.fetch(userData.marriedTo);
                const days = userData.marriedSince
                    ? Math.floor((now - userData.marriedSince) / 86_400_000)
                    : 0;
                marriageInfo = `> 💍 **${partner.username}** — ${days} يوم`;
            } catch {
                marriageInfo = '> 💍 شريك (غير متاح حالياً)';
            }
        }

        // ── حالة الكولداونات ────────────────────────────────────────────
        const dailyCd = userData.lastDaily
            ? Math.max(0, 86_400_000 - (now - userData.lastDaily))
            : 0;
        const workCd = userData.lastWork
            ? Math.max(0, (config.workCooldown || 3_600_000) - (now - userData.lastWork))
            : 0;

        const _fmt = (ms) => {
            if (ms <= 0) return '✅ جاهز';
            const h = Math.floor(ms / 3_600_000);
            const m = Math.floor((ms % 3_600_000) / 60_000);
            return h > 0 ? `${h}س ${m}د` : `${m} دقيقة`;
        };

        // ── شريط XP ─────────────────────────────────────────────────────
        const xpBar = levels.createProgressBar(lvlInfo.percentage, 12);

        // ── عدد العناصر في الحقيبة ──────────────────────────────────────
        const inv = userData.inventory || {};
        const invCount = Object.keys(inv).length;
        const activeItems = Object.values(inv).filter(item => item.expiresAt > now).length;

        // ── التحذيرات ────────────────────────────────────────────────────
        const warnings = userData.warnings || 0;

        // ── بناء الـ Embed ──────────────────────────────────────────────
        const embed = new EmbedBuilder()
            .setColor(isOther ? '#5865F2' : '#FFD700')
            .setTitle(`📊 إحصائيات ${targetUser.username}`)
            .setThumbnail(targetUser.displayAvatarURL({ size: 256 }))
            .setDescription(
                isOther
                    ? `> إحصائيات **${targetUser.username}** التفصيلية`
                    : '> لوحة إحصائياتك الشخصية الكاملة'
            )
            .addFields(
                // ── القسم المالي ──────────────────────────────────────────
                {
                    name: '💰 الوضع المالي',
                    value: [
                        `> 👛 المحفظة: **${wallet.toLocaleString()}** ${config.currency}`,
                        `> 🏦 البنك: **${bank.toLocaleString()}** ${config.currency}`,
                        `> 💎 الثروة الكلية: **${total.toLocaleString()}** ${config.currency}`,
                        `> 🏅 رتبة الثروة: **#${wealthRank}**`,
                    ].join('\n'),
                    inline: false,
                },
                // ── القسم الإحصائي ────────────────────────────────────────
                {
                    name: '⭐ المستوى والخبرة',
                    value: [
                        `> 🎯 المستوى: **${lvlInfo.level}**`,
                        `> 📈 XP: **${(userData.xp || 0).toLocaleString()}** (رتبة **#${xpRank}**)`,
                        `> ${xpBar} ${lvlInfo.percentage}%`,
                        `> ⬆️ للمستوى التالي: **${lvlInfo.progressXP}/${lvlInfo.requiredXP}** XP`,
                    ].join('\n'),
                    inline: false,
                },
                // ── الألعاب ───────────────────────────────────────────────
                {
                    name: '🎮 الألعاب',
                    value: [
                        `> 🎲 ألعاب مُلعبة: **${gamesPlayed}**`,
                        `> 🏆 انتصارات: **${gamesWon}** (${winRate}%)`,
                        `> 💸 أكبر ربح: **${biggestWin.toLocaleString()}** ${config.currency}`,
                    ].join('\n'),
                    inline: true,
                },
                // ── الحقيبة ───────────────────────────────────────────────
                {
                    name: '🎒 الحقيبة',
                    value: [
                        `> 📦 عدد العناصر: **${invCount}**`,
                        `> ⚡ نشطة الآن: **${activeItems}**`,
                        `> ⚠️ تحذيرات: **${warnings}**`,
                    ].join('\n'),
                    inline: true,
                },
                // ── الحالة الاجتماعية ─────────────────────────────────────
                {
                    name: '❤️ الحياة الاجتماعية',
                    value: [
                        `**الزواج:**`,
                        marriageInfo,
                        `> 🔥 Streak اليومي: **${userData.dailyStreak || 0}** يوم`,
                    ].join('\n'),
                    inline: false,
                },
                // ── الكولداونات ───────────────────────────────────────────
                {
                    name: '⏰ الكولداونات',
                    value: [
                        `> 🎁 اليومي: **${_fmt(dailyCd)}**`,
                        `> 💼 العمل: **${_fmt(workCd)}**`,
                    ].join('\n'),
                    inline: false,
                }
            )
            .setFooter({
                text: `${message.guild?.name || 'السيرفر'} • ${new Date().toLocaleDateString('ar-SA')}`,
                iconURL: message.guild?.iconURL() || undefined,
            })
            .setTimestamp();

        // أزرار التنقل
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('daily_work')
                .setLabel('💼 عمل')
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId('daily_balance')
                .setLabel('💰 رصيد')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('daily_casino')
                .setLabel('🎰 كازينو')
                .setStyle(ButtonStyle.Danger)
        );

        await message.reply({ embeds: [embed], components: [row] });
    },
};
