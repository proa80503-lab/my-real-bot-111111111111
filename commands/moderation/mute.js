const { PermissionFlagsBits } = require('discord.js');
const { PremiumEmbedBuilder } = require('../../utils/embed-builder');
const { hasPermOrOwner, getAuthor } = require('../../utils/permissions');

module.exports = {
    name: 'mute',
    aliases: ['اسكات', 'ميوت', 'كتم', 'timeout'],
    description: 'كتم عضو مؤقتاً (Timeout)',
    usage: 'mute @user <duration_minutes> [reason]',
    permissions: [PermissionFlagsBits.ModerateMembers],

    async execute(context, args) {
        const isInteraction = context.isCommand?.() || context.isButton?.();
        const author = getAuthor(context);

        // صاحب البوت يتخطى فحص الصلاحيات
        if (!hasPermOrOwner(context.member, PermissionFlagsBits.ModerateMembers)) {
            const msg = '❌ ليس لديك صلاحية لكتم الأعضاء!';
            return isInteraction ? context.reply({ content: msg, ephemeral: true }) : context.reply(msg);
        }

        const target = context.mentions?.members?.first() || (isInteraction ? context.options?.getMember('user') : null);
        const duration = parseInt(args[1]) || 10;
        const reason = args.slice(2).join(' ') || 'بدون سبب';

        if (!target) {
            const msg = '❌ يرجى منشن العضو!';
            return isInteraction ? context.reply({ content: msg, ephemeral: true }) : context.reply(msg);
        }
        if (!target.moderatable) {
            const msg = '❌ لا يمكنني كتم هذا العضو!';
            return isInteraction ? context.reply({ content: msg, ephemeral: true }) : context.reply(msg);
        }

        // إصلاح: استخدام username بدلاً من tag (tag مهجور في Discord.js v14)
        await target.timeout(duration * 60 * 1000, `بواسطة ${author.username}: ${reason}`);

        const embed = PremiumEmbedBuilder.moderation(
            '🤐 كتم عضو',
            `تم كتم **${target.user.username}** لمدة **${duration}** دقيقة.`,
            [{ name: '📝 السبب', value: reason }],
            author
        );

        if (isInteraction) await context.reply({ embeds: [embed] });
        else context.reply({ embeds: [embed] });
    }
};
