const { PermissionFlagsBits } = require('discord.js');
const { PremiumEmbedBuilder, ICONS } = require('../../utils/embed-builder');

module.exports = {
    name: 'mute',
    aliases: ['اسكات', 'ميوت', 'كتم', 'timeout'],
    description: 'كتم عضو مؤقتاً (Timeout)',
    usage: 'mute @user <duration_minutes> [reason]',
    permissions: [PermissionFlagsBits.ModerateMembers],

    async execute(context, args) {
        const isInteraction = context.isCommand?.() || context.isButton?.();
        const author = isInteraction ? context.user : context.author;

        const target = context.mentions?.members?.first() || (isInteraction ? context.options?.getMember('user') : null);
        const duration = parseInt(args[1]) || 10;
        const reason = args.slice(2).join(' ') || 'بدون سبب';

        if (!target) return context.reply('❌ يرجى منشن العضو!');
        if (!target.moderatable) return context.reply('❌ لا يمكنني كتم هذا العضو!');

        await target.timeout(duration * 60 * 1000, `بواسطة ${author.tag}: ${reason}`);

        const embed = PremiumEmbedBuilder.moderation(
            '🤐 كتم عضو',
            `تم كتم **${target.user.tag}** لمدة **${duration}** دقيقة.`,
            [{ name: '📝 السبب', value: reason }],
            author
        );

        if (isInteraction) await context.reply({ embeds: [embed] });
        else context.reply({ embeds: [embed] });
    }
};
