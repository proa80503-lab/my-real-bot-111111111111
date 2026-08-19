const db = require('../../utils/database');
const config = require('../../config');
const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'withdraw',
    aliases: ['سحب', 'تسحب', 'with', 'wd', 'سحب_بنك'],
    description: 'سحب الأموال من البنك إلى المحفظة',
    usage: 'سحب <مبلغ | كامل | نصف | ربع>',

    async execute(context, args) {
        try {
            const userId = context.user?.id ?? context.author?.id;
            if (!userId) return;

            const userData = db.getUserData(userId);
            const bankBal = userData.bank || 0;

            if (!args || args.length === 0) {
                return context.reply(
                    bankBal <= 0
                        ? '❌ رصيد بنكك فارغ! أودع أولاً.'
                        : `❌ الاستخدام: \`سحب <مبلغ | كامل | نصف | ربع>\`\n🏦 بنكك: **${bankBal.toLocaleString()}** ${config.currency}`
                );
            }

            const input = String(args[0]).toLowerCase().trim();

            let amount;
            if (['كامل', 'كل', 'كلها', 'all'].includes(input)) amount = bankBal;
            else if (['نصف', 'half'].includes(input)) amount = Math.floor(bankBal / 2);
            else if (['ربع', 'quarter'].includes(input)) amount = Math.floor(bankBal / 4);
            else if (['ثلث', 'third'].includes(input)) amount = Math.floor(bankBal / 3);
            else amount = Number(input.replace(/,/g, ''));

            // حماية صارمة من الثغرات
            if (isNaN(amount) || !Number.isFinite(amount) || amount <= 0 || amount % 1 !== 0) {
                return context.reply('❌ يرجى إدخال مبلغ صحيح وصالح! (لا يمكن استخدام الكسور أو الأرقام السالبة).');
            }
            if (amount > bankBal)
                return context.reply(`❌ بنكك فيه **${bankBal.toLocaleString()}** ${config.currency} فقط!`);

            const newBank = bankBal - amount;
            const newBalance = (userData.balance || 0) + amount;

            db.updateFields(userId, { balance: newBalance, bank: newBank });
            db.addTransaction(userId, 'withdraw', amount, 'Withdrew from bank');

            const embed = new EmbedBuilder()
                .setColor('#3498DB')
                .setTitle('💸 سحب نقدي')
                .setDescription(`تم سحب **${amount.toLocaleString()} ${config.currency}** من بنكك إلى محفظتك. ✅`)
                .addFields(
                    { name: '💰 المحفظة', value: `${newBalance.toLocaleString()} ${config.currency}`, inline: true },
                    { name: '🏦 البنك', value: `${newBank.toLocaleString()} ${config.currency}`, inline: true }
                )
                .setTimestamp();

            context.reply({ embeds: [embed] });
        } catch (error) {
            console.error('[withdraw error]:', error);
            context.reply('❌ حدث خطأ في السحب.').catch(() => { });
        }
    }
};
