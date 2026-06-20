const { PermissionFlagsBits } = require('discord.js');
const { PremiumEmbedBuilder } = require('../../utils/embed-builder');
const { hasPermOrOwner, getAuthor } = require('../../utils/permissions');

module.exports = {
    name: 'ban',
    aliases: ['باند', 'حظر', 'طرد_نهائي'],
    description: 'حظر عضو من السيرفر',
    usage: 'ban @user [reason]',
    permissions: [PermissionFlagsBits.BanMembers],

    async execute(context, args) {
        try {
            const isInteraction = context.isCommand?.() || context.isButton?.();
            const author = getAuthor(context);

            // صاحب البوت يتخطى فحص الصلاحيات
            if (!hasPermOrOwner(context.member, PermissionFlagsBits.BanMembers)) {
                const msg = '❌ ليس لديك صلاحية لحظر الأعضاء!';
                return isInteraction ? context.reply({ content: msg, ephemeral: true }) : context.reply(msg);
            }

            const target = context.mentions?.members?.first() || (isInteraction ? context.options?.getMember('user') : null);
            const reason = args.slice(1).join(' ') || 'بدون سبب';

            if (!target) {
                const msg = '❌ يرجى منشن العضو المراد حظره!';
                return isInteraction ? context.reply({ content: msg, ephemeral: true }) : context.reply(msg);
            }
            if (!target.bannable) {
                const msg = '❌ لا يمكنني حظر هذا العضو (قد يكون أعلى مني في الصلاحيات)!';
                return isInteraction ? context.reply({ content: msg, ephemeral: true }) : context.reply(msg);
            }

            await target.ban({ reason: `بواسطة ${author.username}: ${reason}` });

            const embed = PremiumEmbedBuilder.moderation(
                '🔨 حظر عضو',
                `تم حظر العضو **${target.user.username}** من السيرفر.`,
                [{ name: '📝 السبب', value: reason }],
                author
            );

            if (isInteraction) await context.reply({ embeds: [embed] });
            else context.reply({ embeds: [embed] });
        } catch (error) {
            console.error('[ban error]:', error);
            context.reply(`❌ تعذر تنفيذ الحظر: ${error.message || 'خطأ غير متوقع'}`).catch(() => {});
        }
    }
};
