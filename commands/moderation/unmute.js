const { PermissionFlagsBits } = require('discord.js');
const { PremiumEmbedBuilder } = require('../../utils/embed-builder');
const { hasPermOrOwner, getAuthor } = require('../../utils/permissions');

module.exports = {
    name: 'unmute',
    aliases: ['الغاء_الكتم', 'ان_ميوت', 'untimeout'],
    description: 'فك الكتم عن عضو',
    usage: 'unmute @user',
    permissions: [PermissionFlagsBits.ModerateMembers],

    async execute(context, args) {
        const isInteraction = context.isCommand?.() || context.isButton?.();
        const author = getAuthor(context);

        // صاحب البوت يتخطى فحص الصلاحيات
        if (!hasPermOrOwner(context.member, PermissionFlagsBits.ModerateMembers)) {
            const msg = '❌ ليس لديك صلاحية لفك الكتم!';
            return isInteraction ? context.reply({ content: msg, ephemeral: true }) : context.reply(msg);
        }

        const target = context.mentions?.members?.first() || (isInteraction ? context.options?.getMember('user') : null);

        if (!target) {
            return isInteraction ? context.reply({ content: '❌ يرجى منشن العضو!', ephemeral: true }) : context.reply('❌ يرجى منشن العضو!');
        }
        if (!target.isCommunicationDisabled()) {
            return isInteraction ? context.reply({ content: '❌ هذا العضو غير مكتوم بالفعل!', ephemeral: true }) : context.reply('❌ هذا العضو غير مكتوم بالفعل!');
        }

        await target.timeout(null, `تم فك الكتم بواسطة ${author.username}`);

        const embed = PremiumEmbedBuilder.success(
            '🔊 فك الكتم',
            `تم فك الكتم عن **${target.user.username}** بنجاح.`,
            []
        );

        if (isInteraction) await context.reply({ embeds: [embed] });
        else context.reply({ embeds: [embed] });
    }
};
