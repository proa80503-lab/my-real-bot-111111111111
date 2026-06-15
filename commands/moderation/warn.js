const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../../utils/database');
const { sendPunishmentToChannel } = require('../../utils/punishments');

module.exports = {
    name: 'warn',
    aliases: ['تحذير', 'انذار'],
    description: 'تحذير عضو في السيرفر',
    usage: 'تحذير @user [السبب]',

    async execute(context, args) {
        const isInteraction = context.isCommand?.() || context.isButton?.();
        const author = isInteraction ? context.user : context.author;
        const member = isInteraction ? context.member : context.member;

        if (!member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
            return context.reply('❌ ليس لديك صلاحية لاستخدام هذا الأمر!');
        }

        const target = context.mentions?.members?.first() || (isInteraction ? context.options?.getMember('user') : null);
        if (!target) return context.reply('❌ يجب عليك منشن العضو!');
        if (target.id === author.id) return context.reply('❌ لا يمكنك تحذير نفسك!');
        if (target.user.bot) return context.reply('❌ لا يمكنك تحذير البوتات!');

        const reason = args.slice(1).join(' ') || 'لا يوجد سبب محدد';

        const userData = db.getUserData(target.id);
        userData.warnings = (userData.warnings || 0) + 1;
        db.updateUserData(target.id, userData);

        const { PremiumEmbedBuilder } = require('../../utils/embed-builder');
        const embed = PremiumEmbedBuilder.admin(
            '⚠️ تحذير جديد',
            `تم توجيه تحذير رسمي للعضو ${target}`,
            [
                { name: 'السبب', value: reason, inline: true },
                { name: 'عدد التحذيرات', value: `${userData.warnings}`, inline: true },
                { name: 'المسؤول', value: `${author}`, inline: true }
            ],
            author
        );

        if (isInteraction) await context.reply({ embeds: [embed] });
        else context.channel.send({ embeds: [embed] });

        // إرسال إلى روم العقوبات
        await sendPunishmentToChannel(context.guild, {
            type: 'warn',
            userId: target.id,
            color: '#FFA500',
            title: '⚠️ تحذير',
            reason: reason,
            duration: `التحذير رقم ${userData.warnings}`,
            moderator: `${author}`
        });

        try {
            await target.send(`⚠️ تم تحذيرك في ${context.guild.name}\nالسبب: ${reason}\nعدد تحذيراتك: ${userData.warnings}`);
        } catch (error) {
            console.log('لا يمكن إرسال رسالة خاصة للعضو');
        }
    }
};
