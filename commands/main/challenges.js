'use strict';

/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║   📅 التحديات اليومية — أمر الأعضاء                           ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */

const { EmbedBuilder } = require('discord.js');
const dailyChallenges = require('../../utils/daily-challenges');

module.exports = {
    name: 'challenges',
    aliases: ['تحديات', 'تحدياتي'],
    description: 'عرض التحديات اليومية وتقدمك',
    category: 'عام',

    async execute(message, args) {
        const embed = dailyChallenges.buildChallengesEmbed(message.author.id);
        await message.reply({ embeds: [embed] });
    },
};
