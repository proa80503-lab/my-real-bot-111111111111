const { PermissionFlagsBits } = require('discord.js');
const { PremiumEmbedBuilder } = require('../../utils/embed-builder');
const { hasPermOrOwner, getAuthor } = require('../../utils/permissions');

module.exports = {
    name: 'jail',
    aliases: ['سجن', 'حبس'],
    description: 'سجن عضو ومنعه من رؤية الرومات',
    usage: 'jail @user [reason]',
    permissions: [PermissionFlagsBits.ModerateMembers],

    async execute(context, args) {
        const isInteraction = context.isCommand?.() || context.isButton?.();
        const author = getAuthor(context);

        // صاحب البوت يتخطى فحص الصلاحيات
        if (!hasPermOrOwner(context.member, PermissionFlagsBits.ModerateMembers)) {
            const msg = '❌ ليس لديك صلاحية لاستخدام هذا الأمر!';
            return isInteraction ? context.reply({ content: msg, ephemeral: true }) : context.reply(msg);
        }

        const target = context.mentions?.members?.first() || (isInteraction ? context.options?.getMember('user') : null);
        const reason = args.slice(1).join(' ') || 'بدون سبب';
        const db = require('../../utils/database');
        const guildData = db.getGuildData(context.guild.id);
        let jailRole = guildData.jailRole ? context.guild.roles.cache.get(guildData.jailRole) : null;
        if (!jailRole) jailRole = context.guild.roles.cache.find(r => r.name === '🔒┃سجين' || r.name === 'Jailed' || r.name === 'مسجون');

        if (!target) return context.reply('❌ منشن الشخص!');
        if (!jailRole) return context.reply('❌ رتبة السجن غير موجودة! استخدم `!setup` أولاً.');

        await target.roles.add(jailRole, reason);

        // طرد من الروم الصوتي إذا كان متصلاً
        if (target.voice?.channel) {
            await target.voice.disconnect(reason).catch(() => {});
        }

        const embed = PremiumEmbedBuilder.moderation(
            '⚖️ سجن عضو',
            `تم إرسال العضو **${target.user.username}** إلى السجن.`,
            [{ name: '📝 السبب', value: reason }],
            author
        );

        if (isInteraction) await context.reply({ embeds: [embed] });
        else context.reply({ embeds: [embed] });
    }
};
