const { EmbedBuilder } = require('discord.js');
const db = require('../../utils/database');
const config = require('../../config');

module.exports = {
    name: 'give',
    aliases: ['اعطاء', 'اعطي', 'هبة'],
    description: 'إعطاء المال لمستخدم (للمطورين فقط)',
    usage: 'اعطي @user <المبلغ>',

    async execute(message, args) {
        if (message.author.id !== config.ownerId) {
            return message.reply('❌ هذا الأمر للمطورين فقط!');
        }

        const target = message.mentions.users.first();
        if (!target) return message.reply('❌ يجب عليك منشن الشخص!');

        const amount = parseInt(args[1]);
        if (!amount || isNaN(amount)) return message.reply('❌ يجب تحديد مبلغ صحيح!');

        db.addMoney(target.id, amount);
        db.addTransaction(target.id, 'admin_give', amount, `Admin gift from ${message.author.username}`);

        const embed = new EmbedBuilder()
            .setColor('#FFD700')
            .setTitle('🎁 هبة إدارية')
            .setDescription(`تم إعطاء **${amount.toLocaleString()} ${config.currency}** إلى ${target}`)
            .addFields(
                { name: '💰 رصيده الجديد', value: `${db.getUserData(target.id).balance.toLocaleString()} ${config.currency}` }
            )
            .setTimestamp();

        message.reply({ embeds: [embed] });
    }
};
