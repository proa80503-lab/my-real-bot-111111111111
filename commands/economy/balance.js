const db = require('../../utils/database');
const config = require('../../config');
const { PremiumEmbedBuilder, ICONS } = require('../../utils/embed-builder');
const { MessageFlags } = require('discord.js');
const ecoHub = require('./economy-hub');

module.exports = {
    name: 'balance',
    aliases: ['bal_view', 'رصيد_عرض'],
    description: 'عرض رصيد مستخدم آخر (بدون منشن = لوحة الاقتصاد)',
    usage: 'balance @user',

    async execute(context, args) {
        const isInteraction = context.isCommand?.() || context.isButton?.();
        const author = isInteraction ? context.user : context.author;

        const target = isInteraction
            ? (context.options?.getUser?.('user') || null)
            : (context.mentions?.users?.first() || null);

        // بدون منشن أو منشن نفسك → لوحة الاقتصاد الكاملة
        if (!target || target.id === author.id) {
            const panel = await ecoHub.buildMainPanel(author.id, context.client);
            if (isInteraction) return context.reply({ ...panel });
            return context.reply({ ...panel });
        }

        // عرض رصيد شخص آخر فقط
        const userData = db.getUserData(target.id);
        const levels = require('../../utils/levels');
        const balance = userData?.balance || 0;
        const bank = userData?.bank || 0;
        const lvlInfo = levels.getLevelProgress(target.id);

        const embed = PremiumEmbedBuilder.economy(
            `محفظة ${target.username}`,
            null,
            [
                { name: `${ICONS.MONEY} المحفظة`, value: `\`${balance.toLocaleString()} ${config.currency}\``, inline: true },
                { name: '🏦 البنك', value: `\`${bank.toLocaleString()} ${config.currency}\``, inline: true },
                { name: '💎 الثروة', value: `\`${(balance + bank).toLocaleString()} ${config.currency}\``, inline: true },
                { name: `⭐ المستوى ${lvlInfo.level}`, value: `${lvlInfo.progressXP}/${lvlInfo.requiredXP} XP`, inline: false }
            ]
        ).setThumbnail(target.displayAvatarURL({ size: 128 }));

        if (isInteraction) await context.reply({ embeds: [embed] });
        else context.reply({ embeds: [embed] });
    },

    async handleEconomyInteraction(interaction) {
        await ecoHub.handleEcoButton(interaction);
    }
};
