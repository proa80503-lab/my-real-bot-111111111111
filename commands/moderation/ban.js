const { PermissionFlagsBits } = require('discord.js');
const { PremiumEmbedBuilder, ICONS } = require('../../utils/embed-builder');

module.exports = {
    name: 'ban',
    aliases: ['باند', 'حظر', 'طرد_نهائي'],
    description: 'حظر عضو من السيرفر',
    usage: 'ban @user [reason]',
    permissions: [PermissionFlagsBits.BanMembers],

    async execute(context, args) {
        try {
            const isInteraction = context.isCommand?.() || context.isButton?.();
            const author = isInteraction ? context.user : context.author;

            const target = context.mentions?.members?.first() || (isInteraction ? context.options?.getMember('user') : null);
            const reason = args.slice(1).join(' ') || 'بدون سبب';

            if (!target) return context.reply('❌ يرجى منشن العضو المراد حظره!');
            if (!target.bannable) return context.reply('❌ لا يمكنني حظر هذا العضو (قد يكون أعلى مني في الصلاحيات)!');

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
            context.reply(`❌ تعذر تنفيذ الحظر: ${error.message || 'خطأ غير متوقع'}`).catch(() => { });
        }
    }
};
