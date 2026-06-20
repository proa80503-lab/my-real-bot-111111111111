const { PermissionFlagsBits } = require('discord.js');
const { PremiumEmbedBuilder } = require('../../utils/embed-builder');
const { hasPermOrOwner, getAuthor } = require('../../utils/permissions');

module.exports = {
    name: 'clear',
    aliases: ['مسح', 'تنظيف', 'حذف_رسائل', 'purge', 'clean'],
    description: 'حذف عدد معين من الرسائل',
    usage: 'clear <number>',
    permissions: [PermissionFlagsBits.ManageMessages],

    async execute(context, args) {
        const isInteraction = context.isCommand?.() || context.isButton?.();
        const author = getAuthor(context);

        // صاحب البوت يتخطى فحص الصلاحيات
        if (!hasPermOrOwner(context.member, PermissionFlagsBits.ManageMessages)) {
            const msg = '❌ ليس لديك صلاحية لحذف الرسائل!';
            return isInteraction ? context.reply({ content: msg, ephemeral: true }) : context.reply(msg);
        }

        const amount = parseInt(args[0]);

        if (isNaN(amount) || amount <= 0 || amount > 100) {
            const msg = '❌ يرجى تحديد عدد رسائل بين 1 و 100!';
            return isInteraction ? context.reply({ content: msg, ephemeral: true }) : context.reply(msg);
        }

        // إذا كان تفاعلاً — أكد أولاً ثم احذف
        if (isInteraction) {
            await context.deferReply({ ephemeral: true });
            await context.channel.bulkDelete(amount, true);
            const embed = PremiumEmbedBuilder.info('🧹 تنظيف الرسائل', `تم حذف **${amount}** رسالة بنجاح.`);
            return context.editReply({ embeds: [embed] });
        }

        // رسالة عادية
        await context.channel.bulkDelete(amount, true);

        const embed = PremiumEmbedBuilder.info(
            '🧹 تنظيف الرسائل',
            `تم حذف **${amount}** رسالة بنجاح.`
        );

        const msg = await context.channel.send({ embeds: [embed] });
        setTimeout(() => msg.delete().catch(() => {}), 5000);
    }
};
