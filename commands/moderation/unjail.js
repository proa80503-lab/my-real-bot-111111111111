const { PermissionFlagsBits } = require('discord.js');
const { PremiumEmbedBuilder } = require('../../utils/embed-builder');
const { hasPermOrOwner, getAuthor } = require('../../utils/permissions');

module.exports = {
    name: 'unjail',
    aliases: ['فك_سجن', 'افراج'],
    description: 'فك السجن عن عضو',
    usage: 'unjail @user',
    permissions: [PermissionFlagsBits.ModerateMembers],

    async execute(context, args) {
        const isInteraction = context.isCommand?.() || context.isButton?.();
        const author = getAuthor(context);

        // صاحب البوت يتخطى فحص الصلاحيات
        if (!hasPermOrOwner(context.member, PermissionFlagsBits.ModerateMembers)) {
            const msg = '❌ ليس لديك صلاحية لفك السجن!';
            return isInteraction ? context.reply({ content: msg, ephemeral: true }) : context.reply(msg);
        }

        const target = context.mentions?.members?.first() || (isInteraction ? context.options?.getMember('user') : null);
        const db = require('../../utils/database');
        const guildData = db.getGuildData(context.guild.id);
        let jailRole = guildData.jailRole ? context.guild.roles.cache.get(guildData.jailRole) : null;
        if (!jailRole) jailRole = context.guild.roles.cache.find(r => r.name === '🔒┃سجين' || r.name === 'Jailed' || r.name === 'مسجون');

        if (!target) {
            return isInteraction ? context.reply({ content: '❌ منشن الشخص!', ephemeral: true }) : context.reply('❌ منشن الشخص!');
        }
        if (!jailRole) {
            return isInteraction ? context.reply({ content: '❌ رتبة السجن غير موجودة!', ephemeral: true }) : context.reply('❌ رتبة السجن غير موجودة!');
        }

        await target.roles.remove(jailRole);

        const embed = PremiumEmbedBuilder.success(
            '⚖️ إفراج',
            `تم فك السجن عن **${target.user.username}** بنجاح.`,
            []
        );

        if (isInteraction) await context.reply({ embeds: [embed] });
        else context.reply({ embeds: [embed] });
    }
};
