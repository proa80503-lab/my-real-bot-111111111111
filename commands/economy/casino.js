const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const db = require('../../utils/database');
const config = require('../../config');

module.exports = {
    name: 'casino',
    aliases: ['كازينو'],
    description: 'نظام الكازينو المتقدم (VIP وألعاب احترافية)',
    usage: 'casino / كازينو',

    async execute(context, args) {
        const isInteraction = context.isCommand?.() || context.isButton?.();

        const embed = new EmbedBuilder()
            .setColor('#E74C3C')
            .setTitle('🎰 كازينو VIP')
            .setDescription('اختر اللعبة التي تريدها من خلال القائمة أو الأزرار!');

        if (isInteraction) await context.reply({ embeds: [embed] });
        else context.reply({ embeds: [embed] });
    }
};
