'use strict';

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require('../../utils/database');
const config = require('../../config');

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
            const COOLDOWN = 24 * 60 * 60 * 1000; // 24 ساعة
            const STREAK_RESET_AFTER = 48 * 60 * 60 * 1000; // 48 ساعة — ما بعدها يُعاد الـ streak

            // ── كولداون ─────────────────────────────────────────────────
            if (userData.lastDaily && (now - userData.lastDaily) < COOLDOWN) {
                const timeLeft = COOLDOWN - (now - userData.lastDaily);
                const hours = Math.floor(timeLeft / 3_600_000);
                const minutes = Math.floor((timeLeft % 3_600_000) / 60_000);
                const seconds = Math.floor((timeLeft % 60_000) / 1000);

                const waitEmbed = new EmbedBuilder()
                    .setColor('#ED4245')
                    .setTitle('⏰ مكافأتك اليومية غير جاهزة بعد')
                    .setDescription(
                        [
                            `> يمكنك الحصول عليها خلال:`,
                            `> ## ⌛ ${hours}س ${minutes}د ${seconds}ث`,
                        ].join('\n')
                    )
                    .addFields(
                        { name: '🔥 Streak الحالي', value: `**${userData.dailyStreak || 0}** يوم`, inline: true },
                        { name: '📊 شريط الأسبوع', value: _buildStreakBar(userData.dailyStreak || 0), inline: true }
                    )
                    .setFooter({ text: 'عُد يومياً للحفاظ على Streak!' });

                const row = _buildNavRow();
                return message.reply({ embeds: [waitEmbed], components: [row] });
            }

            // ── حساب الـ streak الصحيح ────────────────────────────────
            // إذا انقطع أكثر من 48 ساعة → يبدأ من جديد
            // إذا كان بين 24-48 ساعة → يزيد
            let streak = userData.dailyStreak || 0;
            if (userData.lastDaily) {
                const gap = now - userData.lastDaily;
                if (gap > STREAK_RESET_AFTER) {
                    streak = 1; // انقطع الـ streak
                } else {
                    streak += 1; // متتالي
                }
            } else {
                streak = 1; // أول مرة
            }

            // ── حساب المبلغ ──────────────────────────────────────────
            let dailyAmount = config.dailyAmount || 500;
            const bonus = Math.min(streak * (config.streakBonus || 50), config.maxStreakBonus || 500);
            dailyAmount = Math.min(dailyAmount + bonus, config.maxDailyAmount || 10_000);

            // بوست من المتجر
            const inv = userData.inventory || {};
            const hasDailyBoost = inv.daily_boost?.expiresAt > now;
            if (hasDailyBoost) dailyAmount = Math.floor(dailyAmount * 2);

            // بوست اليومي من مكان آخر
            if (userData.dailyBoostUntil && now < userData.dailyBoostUntil) {
                dailyAmount = Math.floor(dailyAmount * 1.25);
            }

            // حد المحفظة
            const currentBal = userData.balance || 0;
            const maxWallet = config.maxWalletBalance || 5_000_000;
            if (currentBal >= maxWallet) {
                return message.reply(
                    `❌ محفظتك ممتلئة! (**${currentBal.toLocaleString()} ${config.currency}**)\n` +
                    `> 💡 استخدم \`إيداع\` لوضع المال في البنك أولاً.`
                );
            }
            dailyAmount = Math.min(dailyAmount, maxWallet - currentBal);

            // ── حفظ البيانات ─────────────────────────────────────────
            db.updateFields(userId, {
                balance: currentBal + dailyAmount,
                lastDaily: now,
                dailyStreak: streak,
            });
            db.addTransaction(userId, 'daily', dailyAmount, `Daily (Streak: ${streak})`);

            // ── Milestone ─────────────────────────────────────────────
            const milestones = { 7: '🥈 أسبوع كامل!', 14: '🥇 أسبوعان!', 30: '💎 شهر كامل!', 100: '👑 100 يوم!' };
            const milestone = milestones[streak];
            const streakEmoji = streak >= 30 ? '👑' : streak >= 14 ? '🔥🔥' : streak >= 7 ? '🔥' : '✨';

            // ── بناء الـ Embed ─────────────────────────────────────────
            const newBalance = currentBal + dailyAmount;
            const embed = new EmbedBuilder()
                .setColor('#FFD700')
                .setTitle('🎁 مكافأتك اليومية')
                .setThumbnail(message.author.displayAvatarURL())
                .setDescription(
                    [
                        `> ${message.author} — تم إضافة مكافأتك!`,
                        '',
                        `# +${dailyAmount.toLocaleString()} ${config.currency}`,
                        '',
                        milestone ? `> ${milestone}` : null,
                    ]
                        .filter(Boolean)
                        .join('\n')
                )
                .addFields(
                    { name: `${streakEmoji} Daily Streak`, value: `**${streak}** يوم`, inline: true },
                    { name: '💰 رصيدك الجديد', value: `**${newBalance.toLocaleString()}** ${config.currency}`, inline: true },
                    { name: '📊 شريط الأسبوع', value: _buildStreakBar(streak), inline: false }
                );

            if (bonus > 0) embed.addFields({ name: '🎯 مكافأة Streak', value: `+${bonus.toLocaleString()} ${config.currency}`, inline: true });
            if (hasDailyBoost) embed.addFields({ name: '⚡ بوست اليومي', value: 'x2 مفعّل!', inline: true });

            embed
                .setFooter({ text: 'عُد غداً للحفاظ على Streak — الانقطاع فوق 48 ساعة يُعيده للصفر!' })
                .setTimestamp();

            const row = _buildNavRow();
            await message.reply({ embeds: [embed], components: [row] });

            // ── التحليلات والإنجازات ──────────────────────────────────
            try {
                const analytics = require('../../utils/analytics');
                analytics?.trackEconomy?.('earn', dailyAmount, userId);
            } catch { /* اختياري */ }

            try {
                const achievementsCmd = require('../main/achievements-cmd');
                achievementsCmd?.checkAchievements?.(userId, 'daily', {}, message).catch(() => {});
            } catch { /* اختياري */ }

        } catch (err) {
            console.error('[daily] خطأ:', err);
            message.reply('❌ حدث خطأ غير متوقع في أمر المكافأة اليومية.').catch(() => {});
        }
    },

    // ── معالج الأزرار ─────────────────────────────────────────────────
    async handleDailyInteraction(interaction) {
        const { MessageFlags } = require('discord.js');
        const id = interaction.customId;

        if (id === 'daily_work') {
            return interaction.reply({ content: '> 💼 اكتب `عمل` للحصول على راتبك!', flags: MessageFlags.Ephemeral });
        }
        if (id === 'daily_balance') {
            const userData = db.getUserData(interaction.user.id);
            return interaction.reply({
                content: [
                    `> 💰 رصيدك: **${(userData.balance || 0).toLocaleString()} ${config.currency}**`,
                    `> 🏦 البنك: **${(userData.bank || 0).toLocaleString()} ${config.currency}**`,
                ].join('\n'),
                flags: MessageFlags.Ephemeral,
            });
        }
        if (id === 'daily_shop') {
            return interaction.reply({ content: '> 🛒 اكتب `متجر` لعرض المتجر!', flags: MessageFlags.Ephemeral });
        }
        if (id === 'daily_casino') {
            return interaction.reply({ content: '> 🎰 اكتب `كازينو` لفتح الكازينو!', flags: MessageFlags.Ephemeral });
        }
    },
};

// ─── شريط الـ Streak ──────────────────────────────────────────────────────────
function _buildStreakBar(streak) {
    const days = Math.min(streak, 7);
    const filled = '🟨'.repeat(days);
    const empty = '⬛'.repeat(7 - days);
    return `${filled}${empty}`;
}

// ─── أزرار التنقل السريع ──────────────────────────────────────────────────────
function _buildNavRow() {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('daily_work').setLabel('💼 اعمل الآن').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('daily_balance').setLabel('💰 رصيدي').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('daily_shop').setLabel('🛒 المتجر').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('daily_casino').setLabel('🎰 كازينو').setStyle(ButtonStyle.Danger)
    );
}
