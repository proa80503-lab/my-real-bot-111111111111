const { PermissionFlagsBits } = require('discord.js');
const { PremiumEmbedBuilder } = require('../../utils/embed-builder');
const { hasPermOrOwner, getAuthor } = require('../../utils/permissions');

module.exports = {
    name: 'lock',
    aliases: ['قفل', 'اغلاق', 'سكر'],
    description: 'قفل القناة الحالية',
    usage: 'lock',
    permissions: [PermissionFlagsBits.ManageChannels],

    async execute(context) {
        const isInteraction = context.isCommand?.() || context.isButton?.();
        const author = getAuthor(context);

        // صاحب البوت يتخطى فحص الصلاحيات
        if (!hasPermOrOwner(context.member, PermissionFlagsBits.ManageChannels)) {
            const msg = '❌ ليس لديك صلاحية قفل القنوات!';
            return isInteraction ? context.reply({ content: msg, ephemeral: true }) : context.reply(msg);
        }

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
