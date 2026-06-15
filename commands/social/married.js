const { EmbedBuilder } = require('discord.js');
const db = require('../../utils/database');
const config = require('../../config');

module.exports = {
    name: 'married',
    aliases: ['couples', 'partners', 'المتزوجين', 'ازواج'],
    description: 'List all married couples / قائمة المتزوجين',
    usage: '!married',

    async execute(message, args) {
        const users = db.getAllUsers();
        const couples = [];
        const processed = new Set();

        for (const [userId, userData] of Object.entries(users)) {
            if (userData.partner && !processed.has(userId) && !processed.has(userData.partner)) {
                // تأكد من أن الشريك موجود في قاعدة البيانات أيضاً
                const partnerData = users[userData.partner];
                if (partnerData && partnerData.partner === userId) {
                    couples.push({
                        partner1: userId,
                        partner2: userData.partner,
                        date: userData.marriageDate
                    });
                    processed.add(userId);
                    processed.add(userData.partner);
                }
            }
        }

        if (couples.length === 0) {
            return message.reply('💔 | There are no married couples yet.\n💔 | لا يوجد متزوجين بعد.');
        }

        // ترتيب حسب تاريخ الزواج (الأقدم أولاً)
        couples.sort((a, b) => a.date - b.date);

        const description = await Promise.all(couples.map(async (couple, index) => {
            const p1 = await message.client.users.fetch(couple.partner1).catch(() => ({ username: 'Unknown' }));
            const p2 = await message.client.users.fetch(couple.partner2).catch(() => ({ username: 'Unknown' }));
            const date = couple.date ? new Date(couple.date).toLocaleDateString('ar-SA') : 'Unknown';
            return `**${index + 1}.** ${p1.username} ❤️ ${p2.username} (${date})`;
        }));

        const embed = new EmbedBuilder()
            .setColor('#FF69B4')
            .setTitle(`💍 Married Couples / قائمة المتزوجين (${couples.length})`)
            .setDescription(description.join('\n'))
            .setFooter({ text: message.guild.name, iconURL: message.guild.iconURL() })
            .setTimestamp();

        message.reply({ embeds: [embed] });
    }
};
