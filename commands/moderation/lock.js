const { PermissionFlagsBits } = require('discord.js');
const { PremiumEmbedBuilder, ICONS } = require('../../utils/embed-builder');

module.exports = {
    name: 'lock',
    aliases: ['قفل', 'اغلاق', 'سكر'],
    description: 'قفل القناة الحالية',
    usage: 'lock',
    permissions: [PermissionFlagsBits.ManageChannels],

    async execute(context) {
        // دعم الرسائل والتفاعلات
        const isInteraction = context.isCommand?.() || context.isButton?.();
        const author = isInteraction ? context.user : context.author;

        await context.channel.permissionOverwrites.edit(context.guild.id, {
            SendMessages: false
        });

        const embed = PremiumEmbedBuilder.moderation(
            '🔒 قفل القناة',
            'تم قفل هذه القناة ومنع الأعضاء من الكتابة.',
            [],
            author
        );

        if (isInteraction) {
            if (context.replied || context.deferred) await context.followUp({ embeds: [embed] });
            else await context.reply({ embeds: [embed] });
        } else {
            context.reply({ embeds: [embed] });
        }
    }
};
