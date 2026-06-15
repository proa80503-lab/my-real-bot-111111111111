const { PermissionFlagsBits } = require('discord.js');
const { PremiumEmbedBuilder, ICONS } = require('../../utils/embed-builder');

module.exports = {
    name: 'unmute',
    aliases: ['الغاء_الكتم', 'ان_ميوت', 'untimeout'],
    description: 'فك الكتم عن عضو',
    usage: 'unmute @user',
    permissions: [PermissionFlagsBits.ModerateMembers],

    async execute(message, args) {
        const target = message.mentions.members.first();

        if (!target) return message.reply('❌ يرجى منشن العضو!');
        if (!target.isCommunicationDisabled()) return message.reply('❌ هذا العضو غير مكتوم بالفعل!');

        await target.timeout(null, `تم فك الكتم بواسطة ${message.author.tag}`);

        const embed = PremiumEmbedBuilder.success(
            '🔊 فك الكتم',
            `تم فك الكتم عن **${target.user.tag}** بنجاح.`,
            []
        );

        message.reply({ embeds: [embed] });
    }
};
