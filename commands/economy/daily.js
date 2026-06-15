const db = require('../../utils/database');
const config = require('../../config');
const { PremiumEmbedBuilder, ICONS } = require('../../utils/embed-builder');

module.exports = {
    name: 'daily',
    aliases: ['يومي', 'راتب_يومي', 'هدية_يومية', 'd', 'gift'],
    description: 'الحصول على المكافأة اليومية',
    usage: 'daily',

    async execute(message) {
        try {
            const userData = db.getUserData(message.author.id);
            const now = Date.now();
            const cooldown = 24 * 60 * 60 * 1000;

            if (userData.lastDaily && (now - userData.lastDaily) < cooldown) {
                const timeLeft = cooldown - (now - userData.lastDaily);
                const hours = Math.floor(timeLeft / (60 * 60 * 1000));
                const minutes = Math.floor((timeLeft % (60 * 60 * 1000)) / (60 * 1000));
                return message.reply(`⏰ يمكنك الحصول على مكافأتك اليومية بعد **${hours}** ساعة و **${minutes}** دقيقة!`);
            }

            let dailyAmount = config.dailyAmount || 500;
            const streak = (userData.dailyStreak || 0) + 1;
            const bonus = Math.min(streak * (config.streakBonus || 50), config.maxStreakBonus || 500);
            dailyAmount = Math.min(dailyAmount + bonus, config.maxDailyAmount || 10000);

            // تأثير daily_boost من المتجر
            const inv = userData.inventory || {};
            const hasDailyBoost = inv.daily_boost && inv.daily_boost.expiresAt > now;
            if (hasDailyBoost) {
                dailyAmount = Math.floor(dailyAmount * 2);
            }

            // تأكيد الحد الأقصى للمحفظة
            const currentBal = userData.balance || 0;
            const maxWallet = config.maxWalletBalance || 5000000;
            if (currentBal >= maxWallet) {
                return message.reply(`❌ محفظتك ممتلئة! (**${currentBal.toLocaleString()} ${config.currency}**)\n> 💡 ضع بعض المال في البنك أولاً باستخدام \`إيداع\`!`);
            }
            dailyAmount = Math.min(dailyAmount, maxWallet - currentBal);

            db.updateFields(message.author.id, {
                balance: (userData.balance || 0) + dailyAmount,
                lastDaily: now,
                dailyStreak: streak
            });

            db.addTransaction(message.author.id, 'daily', dailyAmount, `Daily Bonus (Streak: ${streak})`);

            const embed = PremiumEmbedBuilder.economy(
                '🎁 مكافأة يومية!',
                `تم إضافة **${dailyAmount.toLocaleString()} ${config.currency}** إلى محفظتك!`,
                [
                    { name: '🔥 Daily Streak', value: `${streak} يوم متتالٍ`, inline: true },
                    { name: '💰 رصيدك الحالي', value: `${((userData.balance || 0) + dailyAmount).toLocaleString()} ${config.currency}`, inline: true }
                ]
            );

            message.reply({ embeds: [embed] });
        } catch (error) {
            console.error('[daily error]:', error);
            message.reply('❌ حدث خطأ في أمر المكافأة اليومية.').catch(() => { });
        }
    }
};
