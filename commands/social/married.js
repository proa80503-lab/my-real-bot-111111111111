'use strict';

const { EmbedBuilder } = require('discord.js');
const db = require('../../utils/database');

module.exports = {
    name: 'married',
    aliases: ['couples', 'partners', 'المتزوجين', 'ازواج', 'زواجي'],
    description: 'قائمة المتزوجين / List all married couples',
    usage: 'المتزوجين',

    async execute(message, args) {
        const users = db.getAllUsers();
        const couples = [];
        const processed = new Set();

        for (const [userId, userData] of Object.entries(users)) {
            // دعم الحقلين القديم والجديد
            const partnerId = userData.marriedTo || userData.partner || null;
            const since = userData.marriedSince || userData.marriageDate || null;

            if (partnerId && !processed.has(userId) && !processed.has(partnerId)) {
                // تأكد من أن الشريك يشير لنفس العلاقة
                const partnerData = users[partnerId];
                const partnerRef = partnerData?.marriedTo || partnerData?.partner || null;

                if (partnerData && partnerRef === userId) {
                    couples.push({
                        partner1: userId,
                        partner2: partnerId,
                        date: since
                    });
                    processed.add(userId);
                    processed.add(partnerId);
                }
            }
        }

        if (couples.length === 0) {
            return message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor('#ED4245')
                        .setTitle('💔 لا يوجد متزوجين')
                        .setDescription('لا يوجد أزواج حالياً. استخدم `زواج @شخص` للزواج!')
                        .setTimestamp()
                ]
            });
        }

        // ترتيب حسب تاريخ الزواج (الأقدم أولاً)
        couples.sort((a, b) => (a.date || 0) - (b.date || 0));

        const description = await Promise.all(
            couples.slice(0, 20).map(async (couple, index) => {
                const p1 = await message.client.users.fetch(couple.partner1).catch(() => ({ username: 'Unknown' }));
                const p2 = await message.client.users.fetch(couple.partner2).catch(() => ({ username: 'Unknown' }));
                const date = couple.date
                    ? `<t:${Math.floor(couple.date / 1000)}:D>`
                    : 'تاريخ غير معروف';
                return `**${index + 1}.** ${p1.username} ❤️ ${p2.username} — ${date}`;
            })
        );

        const embed = new EmbedBuilder()
            .setColor('#FF69B4')
            .setTitle(`💍 قائمة المتزوجين (${couples.length})`)
            .setDescription(description.join('\n'))
            .setFooter({ text: message.guild.name, iconURL: message.guild.iconURL() || undefined })
            .setTimestamp();

        message.reply({ embeds: [embed] });
    }
};
