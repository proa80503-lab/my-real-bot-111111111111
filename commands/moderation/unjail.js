const { PermissionFlagsBits } = require('discord.js');
const { PremiumEmbedBuilder, ICONS } = require('../../utils/embed-builder');

module.exports = {
    name: 'unjail',
    aliases: ['فك_سجن', 'افراج'],
    description: 'فك السجن عن عضو',
    usage: 'unjail @user',
    permissions: [PermissionFlagsBits.ModerateMembers],

    async execute(message, args) {
        const target = message.mentions.members.first();
        const jailRole = message.guild.roles.cache.find(r => r.name === 'Jailed' || r.name === 'مسجون');

        if (!target) return message.reply('❌ منشن الشخص!');
        if (!jailRole) return message.reply('❌ رتبة السجن غير موجودة!');

        await target.roles.remove(jailRole);

        const embed = PremiumEmbedBuilder.success(
            '⚖️ إفراج',
            `تم فك السجن عن **${target.user.tag}** بنجاح.`,
            []
        );

        message.reply({ embeds: [embed] });
    }
};
