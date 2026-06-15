const { PermissionFlagsBits } = require('discord.js');
const { PremiumEmbedBuilder, ICONS } = require('../../utils/embed-builder');

module.exports = {
    name: 'unlock',
    aliases: ['فتح', 'تشغيل', 'افتح'],
    description: 'فتح القناة المقفولة',
    usage: 'unlock',
    permissions: [PermissionFlagsBits.ManageChannels],

    async execute(context) {
        const isInteraction = context.isCommand?.() || context.isButton?.();
        const author = isInteraction ? context.user : context.author;

        await context.channel.permissionOverwrites.edit(context.guild.id, {
            SendMessages: true
        });

        const embed = PremiumEmbedBuilder.success(
            '🔓 فتح القناة',
            'تم فتح القناة والسماح للأعضاء بالكتابة مرة أخرى.',
            []
        );

        if (isInteraction) {
            if (context.replied || context.deferred) await context.followUp({ embeds: [embed] });
            else await context.reply({ embeds: [embed] });
        } else {
            context.reply({ embeds: [embed] });
        }
    }
};
