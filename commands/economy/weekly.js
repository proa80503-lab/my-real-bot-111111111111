const { EmbedBuilder } = require('discord.js');
const db = require('../../utils/database');
const config = require('../../config');
const levels = require('../../utils/levels');

module.exports = {
    name: 'weekly',
    aliases: ['اسبوعي', 'أسبوعي', 'راتب'],
    description: 'الحصول على الراتب الأسبوعي',
    usage: 'راتب',

    async execute(message) {
        try {
            const userData = db.getUserData(message.author.id);
            const now = Date.now();
            const cooldown = 7 * 24 * 60 * 60 * 1000;

            if (userData.lastWeekly && (now - userData.lastWeekly) < cooldown) {
                const timeLeft = cooldown - (now - userData.lastWeekly);
                const days = Math.floor(timeLeft / (24 * 60 * 60 * 1000));
                const hours = Math.floor((timeLeft % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));

                return message.reply(`⏰ يمكنك الحصول على راتبك الأسبوعي بعد **${days} يوم و ${hours} ساعة**!`);
            }

            let weeklyAmount = config.weeklyPayAmount || 2000;

            if (userData.inventory && userData.inventory['multiplier'] && userData.inventory['multiplier'].expiresAt > now) {
                weeklyAmount = Math.floor(weeklyAmount * 1.5);
            }

            db.updateFields(message.author.id, {
                balance: (userData.balance || 0) + weeklyAmount,
                lastWeekly: now
            });

            db.addTransaction(message.author.id, 'weekly', weeklyAmount, 'Weekly Salary');
            levels.addXP(message.author.id, 20, message);

            const embed = new EmbedBuilder()
                .setColor('#FFD700')
                .setTitle('💼 راتب أسبوعي!')
                .setDescription(`تم إضافة **${weeklyAmount.toLocaleString()} ${config.currency}** إلى محفظتك!`)
                .addFields(
                    { name: '💰 رصيدك الحالي', value: `${((userData.balance || 0) + weeklyAmount).toLocaleString()} ${config.currency}` }
                )
                .setTimestamp();

            message.reply({ embeds: [embed] });
        } catch (error) {
            console.error('[weekly error]:', error);
            message.reply('❌ حدث خطأ في أمر الراتب الأسبوعي.').catch(() => { });
        }
    }
};
