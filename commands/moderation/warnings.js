'use strict';

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');
const db = require('../../utils/database');
const { hasPermOrOwner } = require('../../utils/permissions');

module.exports = {
    name: 'warnings',
    aliases: ['تحذيرات', 'انذارات'],
    description: 'عرض تحذيرات عضو معين وإمكانية إزالتها',
    usage: 'تحذيرات @user',
    
    async execute(message, args) {
        if (!hasPermOrOwner(message.member, PermissionFlagsBits.ModerateMembers)) {
            return message.reply('❌ ليس لديك صلاحية عرض/إدارة التحذيرات!');
        }

        const target = message.mentions.users.first();
        if (!target) {
            return message.reply('❌ الرجاء منشن العضو لعرض تحذيراته.\nمثال: `تحذيرات @شخص`');
        }

        const userData = db.getUserData(target.id);
        const warnings = userData.warnings || 0;
        const warnLogs = userData.warnLogs || [];

        if (warnings === 0 || warnLogs.length === 0) {
            return message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor('#57F287')
                        .setTitle('✅ سجل نظيف')
                        .setDescription(`> العضو ${target} ليس لديه أي تحذيرات.`)
                        .setTimestamp()
                ]
            });
        }

        const embed = new EmbedBuilder()
            .setColor('#FFA500')
            .setTitle(`⚠️ سجل تحذيرات: ${target.username}`)
            .setDescription(`> الإجمالي: **${warnings}** تحذيرات\n\n**تفاصيل التحذيرات:**`)
            .setThumbnail(target.displayAvatarURL())
            .setTimestamp();

        warnLogs.forEach((log, index) => {
            const dateStr = log.date ? `<t:${Math.floor(log.date / 1000)}:R>` : 'تاريخ غير معروف';
            embed.addFields({
                name: `التحذير #${index + 1}`,
                value: `> 📝 **السبب:** ${log.reason}\n> 👮 **المسؤول:** <@${log.author}>\n> 📅 **التاريخ:** ${dateStr}`,
                inline: false
            });
        });

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`clear_warns_${target.id}_${message.author.id}`)
                .setLabel('🗑️ إزالة جميع التحذيرات')
                .setStyle(ButtonStyle.Danger)
        );

        await message.reply({ embeds: [embed], components: [row] });
    }
};
