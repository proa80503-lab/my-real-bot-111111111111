const { PermissionFlagsBits } = require('discord.js');
const { PremiumEmbedBuilder } = require('../../utils/embed-builder');
const { hasPermOrOwner, getAuthor } = require('../../utils/permissions');

module.exports = {
    name: 'kick',
    aliases: ['طرد', 'كيك'],
    description: 'طرد عضو من السيرفر',
    usage: 'kick @user [reason]',
    permissions: [PermissionFlagsBits.KickMembers],

    async execute(context, args) {
        try {
            const isInteraction = context.isCommand?.() || context.isButton?.();
            const author = getAuthor(context);

            // صاحب البوت يتخطى فحص الصلاحيات
            if (!hasPermOrOwner(context.member, PermissionFlagsBits.KickMembers)) {
                const msg = '❌ ليس لديك صلاحية لطرد الأعضاء!';
                return isInteraction ? context.reply({ content: msg, ephemeral: true }) : context.reply(msg);
            }

            const target = context.mentions?.members?.first() || (isInteraction ? context.options?.getMember('user') : null);
            const reason = args.slice(1).join(' ') || 'بدون سبب';

            if (!target) {
                const msg = '❌ يرجى منشن العضو المراد طرده!';
                return isInteraction ? context.reply({ content: msg, ephemeral: true }) : context.reply(msg);
            }
            if (!target.kickable) {
                const msg = '❌ لا يمكنني طرد هذا العضو (قد يكون أعلى مني في الصلاحيات)!';
                return isInteraction ? context.reply({ content: msg, ephemeral: true }) : context.reply(msg);
            }

            await target.kick(`بواسطة ${author.username}: ${reason}`);

            const embed = PremiumEmbedBuilder.moderation(
                '👢 طرد عضو',
                `تم طرد العضو **${target.user.username}** من السيرفر.`,
                [{ name: '📝 السبب', value: reason }],
                author
            );

            if (isInteraction) await context.reply({ embeds: [embed] });
            else context.reply({ embeds: [embed] });
        } catch (error) {
            console.error('[kick error]:', error);
            context.reply(`❌ تعذر تنفيذ الطرد: ${error.message || 'خطأ غير متوقع'}`).catch(() => {});
        }
    }
};
