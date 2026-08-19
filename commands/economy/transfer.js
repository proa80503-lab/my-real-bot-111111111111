const db = require('../../utils/database');
const config = require('../../config');
const { PremiumEmbedBuilder, ICONS } = require('../../utils/embed-builder');

module.exports = {
    name: 'transfer',
    aliases: ['تحويل', 'حول', 'اعط', 'send', 'pay'],
    description: 'تحويل الأموال من محفظتك إلى مستخدم آخر',
    usage: 'transfer @user <amount>',

    async execute(message, args) {
        const target = message.mentions.users.first();
        let amount = Number(args.find(arg => !arg.includes('<@')));

        if (!target) {
            return message.reply(`❌ الاستخدام الصحيح: \`${config.prefix}transfer @user <amount>\``);
        }

        // حماية صارمة من الثغرات
        if (isNaN(amount) || !Number.isFinite(amount) || amount <= 0 || amount % 1 !== 0) {
            return message.reply('❌ يرجى إدخال مبلغ صحيح وصالح! (لا يمكن استخدام الكسور أو الأرقام السالبة).');
        }

        if (target.id === message.author.id) {
            return message.reply('❌ لا يمكنك التحويل لنفسك!');
        }

        const userData = db.getUserData(message.author.id);
        if (userData.balance < amount) {
            return message.reply(`❌ رصيدك غير كافٍ! لديك فقط **${userData.balance.toLocaleString()} ${config.currency}**.`);
        }

        // تحريك الأموال
        db.removeMoney(message.author.id, amount);
        db.addMoney(target.id, amount);

        const embed = PremiumEmbedBuilder.success(
            '✅ تم التحويل بنجاح!',
            `قام ${message.author} بتحويل **${amount.toLocaleString()} ${config.currency}** إلى ${target}.`,
            [{ name: '💰 رصيدك المتبقي', value: `${(userData.balance - amount).toLocaleString()} ${config.currency}` }]
        );

        message.reply({ embeds: [embed] });
    }
};
