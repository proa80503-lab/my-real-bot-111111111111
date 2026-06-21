'use strict';

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║  🎁 DAILY v3.0 — مكافأة يومية بأزرار احترافية                         ║
 * ║  Streak | Boost | زر العمل | زر الرصيد | زر المتجر                    ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const db = require('../../utils/database');
const config = require('../../config');
let analytics = null; try { analytics = require('../../utils/analytics'); } catch {}
let achievementsCmd = null; try { achievementsCmd = require('../main/achievements-cmd'); } catch {}

function buildStreakBar(streak) {
    const days = Math.min(streak, 7);
    const filled = '🟨'.repeat(days);
    const empty = '⬛'.repeat(7 - days);
    return `${filled}${empty}`;
}

module.exports = {
    name: 'daily',
    aliases: ['يومي', 'راتب_يومي', 'هدية_يومية', 'd', 'gift'],
    description: 'الحصول على المكافأة اليومية',
    usage: 'يومي',

    async execute(message) {
        try {
            const userId = message.author.id;
            const userData = db.getUserData(userId);
            const now = Date.now();
            const cooldown = 24 * 60 * 60 * 1000;

            // ── كولداون ─────────────────────────────────────────────
            if (userData.lastDaily && (now - userData.lastDaily) < cooldown) {
                const timeLeft = cooldown - (now - userData.lastDaily);
                const hours = Math.floor(timeLeft / 3600000);
                const minutes = Math.floor((timeLeft % 3600000) / 60000);
                const seconds = Math.floor((timeLeft % 60000) / 1000);

                const waitEmbed = new EmbedBuilder()
                    .setColor('#ED4245')
                    .setTitle('⏰ مكافأتك اليومية غير جاهزة!')
                    .setDescription([
                        `> يمكنك الحصول عليها بعد:`,
                        `> ## ⌛ ${hours}س ${minutes}د ${seconds}ث`,
                    ].join('\n'))
                    .addFields(
                        { name: '🔥 Streak الحالي', value: `**${userData.dailyStreak || 0}** يوم`, inline: true },
                        { name: '📊 شريط الأسبوع', value: buildStreakBar(userData.dailyStreak || 0), inline: true },
                    )
                    .setFooter({ text: 'تأكد من العودة يومياً لتحافظ على Streak!' });

                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('daily_work').setLabel('💼 اذهب للعمل').setStyle(ButtonStyle.Primary),
                    new ButtonBuilder().setCustomId('daily_balance').setLabel('💰 عرض الرصيد').setStyle(ButtonStyle.Secondary),
                );

                return message.reply({ embeds: [waitEmbed], components: [row] });
            }

            // ── حساب المكافأة ─────────────────────────────────────
            let dailyAmount = config.dailyAmount || 500;
            const streak = (userData.dailyStreak || 0) + 1;
            const bonus = Math.min(streak * (config.streakBonus || 50), config.maxStreakBonus || 500);
            dailyAmount = Math.min(dailyAmount + bonus, config.maxDailyAmount || 10000);

            // بوست اليومي من المتجر
            const inv = userData.inventory || {};
            const hasDailyBoost = inv.daily_boost && inv.daily_boost.expiresAt > now;
            if (hasDailyBoost) dailyAmount = Math.floor(dailyAmount * 2);

            // بوست الريفكس اليومي
            if (userData.dailyBoostUntil && now < userData.dailyBoostUntil) {
                dailyAmount = Math.floor(dailyAmount * 1.25);
            }

            // فحص حد المحفظة
            const currentBal = userData.balance || 0;
            const maxWallet = config.maxWalletBalance || 5000000;
            if (currentBal >= maxWallet) {
                return message.reply(`❌ محفظتك ممتلئة! (**${currentBal.toLocaleString()} ${config.currency}**)\n> 💡 استخدم \`إيداع\` لوضع المال في البنك!`);
            }
            dailyAmount = Math.min(dailyAmount, maxWallet - currentBal);

            // ── حفظ البيانات ─────────────────────────────────────────
            db.updateFields(userId, {
                balance: currentBal + dailyAmount,
                lastDaily: now,
                dailyStreak: streak
            });
            db.addTransaction(userId, 'daily', dailyAmount, `Daily Bonus (Streak: ${streak})`);

            // ── Milestone Streaks ─────────────────────────────────────
            const milestones = { 7: '🥈', 14: '🥇', 30: '💎', 100: '👑' };
            const milestone = milestones[streak];

            // ── بناء الـ Embed ─────────────────────────────────────────
            const newBalance = currentBal + dailyAmount;
            const streakEmoji = streak >= 30 ? '👑' : streak >= 14 ? '🔥🔥' : streak >= 7 ? '🔥' : '✨';

            const embed = new EmbedBuilder()
                .setColor('#FFD700')
                .setTitle('🎁 مكافأتك اليومية!')
                .setThumbnail(message.author.displayAvatarURL())
                .setDescription([
                    `> ${message.author} — تم إضافة مكافأتك!`,
                    '',
                    `# +${dailyAmount.toLocaleString()} ${config.currency}`,
                    '',
                    milestone ? `> ${milestone} **مبروك! وصلت ${streak} يوم متتالٍ!**` : '',
                ].filter(Boolean).join('\n'))
                .addFields(
                    { name: `${streakEmoji} Daily Streak`, value: `**${streak}** يوم متتالٍ`, inline: true },
                    { name: '💰 رصيدك الجديد', value: `**${newBalance.toLocaleString()}** ${config.currency}`, inline: true },
                    { name: '📊 شريط الأسبوع', value: buildStreakBar(streak), inline: false },
                );

            if (bonus > 0) embed.addFields({ name: '🎯 مكافأة Streak', value: `+${bonus} ${config.currency}`, inline: true });
            if (hasDailyBoost) embed.addFields({ name: '⚡ بوست اليومي', value: 'x2 مفعّل!', inline: true });

            embed.setFooter({ text: `⏰ عُد غداً للحفاظ على Streak — الحد الأقصى 7 أيام!` }).setTimestamp();

            // ── أزرار التنقل السريع ────────────────────────────────────
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('daily_work').setLabel('💼 اعمل الآن').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId('daily_balance').setLabel('💰 رصيدي').setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId('daily_shop').setLabel('🛒 المتجر').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('daily_casino').setLabel('🎰 كازينو').setStyle(ButtonStyle.Danger),
            );

            await message.reply({ embeds: [embed], components: [row] });

            // ── التحليلات والإنجازات ──────────────────────────────────
            analytics?.trackEconomy('earn', dailyAmount, userId);
            achievementsCmd?.checkAchievements(userId, 'daily', {}, message).catch(() => {});
            achievementsCmd?.checkAchievements(userId, 'balance_check', {}, message).catch(() => {});

        } catch (error) {
            console.error('[daily error]:', error);
            message.reply('❌ حدث خطأ في أمر المكافأة اليومية.').catch(() => {});
        }
    },

    // ── معالج الأزرار ─────────────────────────────────────────────────
    async handleDailyInteraction(interaction) {
        const { MessageFlags } = require('discord.js');
        const id = interaction.customId;

        if (id === 'daily_work') {
            await interaction.reply({ content: `> 💼 اكتب \`عمل\` للحصول على راتبك!`, flags: MessageFlags.Ephemeral });
        } else if (id === 'daily_balance') {
            const userData = db.getUserData(interaction.user.id);
            await interaction.reply({
                content: `> 💰 رصيدك: **${(userData.balance || 0).toLocaleString()} ${config.currency}**\n> 🏦 البنك: **${(userData.bank || 0).toLocaleString()} ${config.currency}**`,
                flags: MessageFlags.Ephemeral
            });
        } else if (id === 'daily_shop') {
            await interaction.reply({ content: `> 🛒 اكتب \`متجر\` لعرض المتجر!`, flags: MessageFlags.Ephemeral });
        } else if (id === 'daily_casino') {
            await interaction.reply({ content: `> 🎰 اكتب \`كازينو\` لفتح الكازينو!`, flags: MessageFlags.Ephemeral });
        }
    }
};
