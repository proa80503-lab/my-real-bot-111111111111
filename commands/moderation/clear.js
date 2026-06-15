const { PermissionFlagsBits } = require('discord.js');
const { PremiumEmbedBuilder, ICONS } = require('../../utils/embed-builder');

module.exports = {
    name: 'clear',
    aliases: ['مسح', 'تنظيف', 'حذف_رسائل', 'purge', 'clean'],
    description: 'حذف عدد معين من الرسائل',
    usage: 'clear <number>',
    permissions: [PermissionFlagsBits.ManageMessages],

    async execute(message, args) {
        const amount = parseInt(args[0]);

        if (isNaN(amount) || amount <= 0 || amount > 100) {
            return message.reply('❌ يرجى تحديد عدد رسائل بين 1 و 100!');
        }

        await message.channel.bulkDelete(amount, true);

        const embed = PremiumEmbedBuilder.info(
            '🧹 تنظيف الرسائل',
            `تم حذف **${amount}** رسالة بنجاح.`
        );

        const msg = await message.channel.send({ embeds: [embed] });
        setTimeout(() => msg.delete().catch(() => { }), 5000);
    }
};
