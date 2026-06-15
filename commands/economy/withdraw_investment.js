const { EmbedBuilder } = require('discord.js');
const db = require('../../utils/database');
const config = require('../../config');
const levels = require('../../utils/levels');

module.exports = {
    name: 'withdraw_investment',
    aliases: ['سحب_استثمار', 'wi'],
    description: 'سحب رأس مال الاستثمار',
    usage: '!سحب_استثمار',

    async execute(message, args) {
        const userData = db.getUserData(message.author.id);

        if (!userData.investment || userData.investment === 0) {
            return message.reply('❌ ليس لديك أي استثمارات لسحبها!');
        }

        const amount = userData.investment;
        userData.balance += amount;
        userData.investment = 0;

        db.updateUserData(message.author.id, userData);
        db.addTransaction(message.author.id, 'withdraw_investment', amount, 'Investment Withdrawal');

        const embed = new EmbedBuilder()
            .setColor('#FFD700')
            .setTitle('📉 سحب استثمار')
            .setDescription(`✅ تم سحب **${amount.toLocaleString()} ${config.currency}** من رأس مال الاستثمار!`)
            .addFields(
                { name: '💰 المحفظة', value: `${userData.balance.toLocaleString()} ${config.currency}`, inline: true }
            )
            .setFooter({ text: 'نصيحة: الاستثمار طويل المدى أفضل للربح!' })
            .setTimestamp();

        message.reply({ embeds: [embed] });
    }
};
