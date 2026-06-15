const { PermissionFlagsBits } = require('discord.js');
const { PremiumEmbedBuilder, ICONS } = require('../../utils/embed-builder');

module.exports = {
    name: 'kick',
    aliases: ['طرد', 'كيك'],
    description: 'طرد عضو من السيرفر',
    usage: 'kick @user [reason]',
    permissions: [PermissionFlagsBits.KickMembers],

    async execute(context, args) {
        try {
            const isInteraction = context.isCommand?.() || context.isButton?.();
            const author = isInteraction ? context.user : context.author;

            const target = context.mentions?.members?.first() || (isInteraction ? context.options?.getMember('user') : null);
            const reason = args.slice(1).join(' ') || 'بدون سبب';

            if (!target) return context.reply('❌ يرجى منشن العضو المراد طرده!');
            if (!target.kickable) return context.reply('❌ لا يمكنني طرد هذا العضو (قد يكون أعلى مني في الصلاحيات)!');

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
            context.reply(`❌ تعذر تنفيذ الطرد: ${error.message || 'خطأ غير متوقع'}`).catch(() => { });
        }
    }
};
