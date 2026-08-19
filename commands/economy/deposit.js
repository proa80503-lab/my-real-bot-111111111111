const db = require('../../utils/database');
const config = require('../../config');
const { PremiumEmbedBuilder, ICONS } = require('../../utils/embed-builder');

module.exports = {
    name: 'deposit',
    aliases: ['ايداع', 'ادخر', 'dep'],
    description: 'تحويل الأموال من المحفظة إلى البنك',
    usage: 'deposit <amount | all>',

    async execute(message, args) {
        try {
            const userData = db.getUserData(message.author.id);
            let amount;
            const input = (args[0] || '').toLowerCase();
            const bal = userData.balance || 0;

            if (input === 'all' || input === 'كل' || input === 'كامل') {
                amount = bal;
            } else if (input === 'half' || input === 'نصف') {
                amount = Math.floor(bal / 2);
            } else if (input === 'quarter' || input === 'ربع') {
                amount = Math.floor(bal / 4);
            } else if (input === 'third' || input === 'ثلث') {
                amount = Math.floor(bal / 3);
            } else {
                amount = Number(args[0]);
            }

            // حماية صارمة من الثغرات
            if (isNaN(amount) || !Number.isFinite(amount) || amount <= 0 || amount % 1 !== 0) {
                return message.reply('❌ يرجى إدخال مبلغ صحيح وصالح! (لا يمكن استخدام الكسور أو الأرقام السالبة).');
            }
            if (bal < amount) return message.reply(`❌ رصيدك لا يكفي! محفظتك: **${bal.toLocaleString()}** ${config.currency}`);

            const newBalance = (userData.balance || 0) - amount;
            const newBank = (userData.bank || 0) + amount;

            db.updateFields(message.author.id, { balance: newBalance, bank: newBank });
            db.addTransaction(message.author.id, 'deposit', amount, 'Deposited to bank');

            const embed = PremiumEmbedBuilder.economy(
                '🏦 إيداع بنكي',
                `تم إيداع **${amount.toLocaleString()} ${config.currency}** في حسابك البنكي.`,
                [
                    { name: '💰 المحفظة', value: `${newBalance.toLocaleString()} ${config.currency}`, inline: true },
                    { name: '🏦 البنك', value: `${newBank.toLocaleString()} ${config.currency}`, inline: true }
                ]
            );

            message.reply({ embeds: [embed] });
        } catch (error) {
            console.error('[deposit error]:', error);
            message.reply('❌ حدث خطأ في أمر الإيداع.').catch(() => { });
        }
    }
};
