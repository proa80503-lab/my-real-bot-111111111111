const { EmbedBuilder } = require('discord.js');
const db = require('../../utils/database');
const levels = require('../../utils/levels');
const config = require('../../config');

// أمر توب - عرض المتصدرين
module.exports = {
    name: 'top',
    aliases: ['توب', 'الافضل'],
    description: 'عرض قائمة التوب في السيرفر',

    async execute(context) {
        const isInteraction = context.isCommand?.() || context.isButton?.();
        const author = isInteraction ? context.user : context.author;
        const allUsers = db.loadDatabase().users;

        // تصنيف حسب الثروة
        const wealthTop = Object.entries(allUsers)
            .map(([id, data]) => ({
                id,
                wealth: (data.balance || 0) + (data.bank || 0)
            }))
            .sort((a, b) => b.wealth - a.wealth)
            .slice(0, 10);

        // تصنيف حسب المستوى
        const levelTop = Object.entries(allUsers)
            .map(([id, data]) => ({
                id,
                level: data.level || 1,
                xp: data.xp || 0
            }))
            .sort((a, b) => b.level !== a.level ? b.level - a.level : b.xp - a.xp)
            .slice(0, 10);

        const embed = new EmbedBuilder()
            .setColor('#FFD700')
            .setTitle('🏆 لوحة المتصدرين - TOP 10')
            .setTimestamp();

        if (context.guild) embed.setThumbnail(context.guild.iconURL());

        // أغنى الأعضاء
        let wealthText = '';
        for (let i = 0; i < wealthTop.length; i++) {
            const user = wealthTop[i];
            const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
            const fetchedUser = await context.client.users.fetch(user.id).catch(() => null);
            const username = fetchedUser ? fetchedUser.username : 'مستخدم غير معروف';
            wealthText += `${medal} **${username}** - ${user.wealth.toLocaleString()} ${config.currency}\n`;
        }

        if (wealthText) embed.addFields({ name: '💰 الأغنى', value: wealthText, inline: false });

        // أعلى مستوى
        let levelText = '';
        for (let i = 0; i < levelTop.length; i++) {
            const user = levelTop[i];
            const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
            const fetchedUser = await context.client.users.fetch(user.id).catch(() => null);
            const username = fetchedUser ? fetchedUser.username : 'مستخدم غير معروف';
            levelText += `${medal} **${username}** - Level ${user.level}\n`;
        }

        if (levelText) embed.addFields({ name: '📊 أعلى مستوى', value: levelText, inline: false });

        embed.setFooter({ text: `المطلوب بواسطة ${author.tag}` });

        if (isInteraction) await context.reply({ embeds: [embed] });
        else context.reply({ embeds: [embed] });
    }
};
