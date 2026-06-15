const { PermissionFlagsBits } = require('discord.js');
const { PremiumEmbedBuilder, ICONS } = require('../../utils/embed-builder');

module.exports = {
    name: 'jail',
    aliases: ['سجن', 'حبس'],
    description: 'سجن عضو ومنعه من رؤية الرومات',
    usage: 'jail @user [reason]',
    permissions: [PermissionFlagsBits.ModerateMembers],

    async execute(context, args) {
        const isInteraction = context.isCommand?.() || context.isButton?.();
        const author = isInteraction ? context.user : context.author;

        const target = context.mentions?.members?.first() || (isInteraction ? context.options?.getMember('user') : null);
        const reason = args.slice(1).join(' ') || 'بدون سبب';
        const jailRole = context.guild.roles.cache.find(r => r.name === 'Jailed' || r.name === 'مسجون');

        if (!target) return context.reply('❌ منشن الشخص!');
        if (!jailRole) return context.reply('❌ رتبة السجن غير موجودة! استخدم `!setup` أولاً.');

        await target.roles.add(jailRole, reason);

        const embed = PremiumEmbedBuilder.moderation(
            '⚖️ سجن عضو',
            `تم إرسال **${target.user.tag}** إلى السجن.`,
            [{ name: '📝 السبب', value: reason }],
            author
        );

        if (isInteraction) await context.reply({ embeds: [embed] });
        else context.reply({ embeds: [embed] });
    }
};
