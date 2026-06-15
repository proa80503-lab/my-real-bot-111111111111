'use strict';

/**
 * 🌐 أمر قائمة السيرفرات — للمالك فقط
 * يعرض كل السيرفرات مع إحصائيات وروابط الدعوة
 */

const { ChannelType, EmbedBuilder } = require('discord.js');
const config = require('../../config');

module.exports = {
    name: 'servers',
    aliases: ['السيرفرات', 'سيرفرات'],
    description: 'عرض السيرفرات التي يتواجد فيها البوت (للمالك فقط)',

    async execute(message) {
        // فحص المالك فقط
        if (message.author.id !== config.ownerId) return;

        const client = message.client;
        const guilds = client.guilds.cache;

        if (guilds.size === 0) {
            return message.reply('❌ البوت لا يتواجد في أي سيرفر حالياً.').catch(() => {});
        }

        try {
            await message.channel.sendTyping();
        } catch (e) {}

        const serverList = [];
        let totalMembers = 0;

        for (const [, guild] of guilds) {
            totalMembers += guild.memberCount;
            let inviteUrl = '`تعذر إنشاء رابط`';

            try {
                const channel = guild.channels.cache.find(ch =>
                    ch.type === ChannelType.GuildText &&
                    ch.permissionsFor(guild.members.me).has('CreateInstantInvite')
                );

                if (channel) {
                    const invite = await channel.createInvite({
                        maxAge: 0,
                        maxUses: 0,
                        unique: false,
                        reason: 'طلب قائمة السيرفرات من مالك البوت'
                    });
                    inviteUrl = invite.url;
                }
            } catch (_) {}

            serverList.push({
                name: guild.name,
                id: guild.id,
                members: guild.memberCount,
                invite: inviteUrl,
                icon: guild.iconURL({ size: 64 }) || null,
                createdAt: guild.createdAt.toLocaleDateString('ar-SA')
            });
        }

        // ترتيب حسب عدد الأعضاء (الأكبر أولاً)
        serverList.sort((a, b) => b.members - a.members);

        // إرسال embed رئيسي أولاً
        const mainEmbed = new EmbedBuilder()
            .setColor('#5865F2')
            .setTitle(`🌐 قائمة السيرفرات (${guilds.size})`)
            .setDescription([
                `> **إجمالي الأعضاء في كل السيرفرات:** ${totalMembers.toLocaleString()}`,
                `> **عدد السيرفرات:** ${guilds.size}`,
            ].join('\n'))
            .setTimestamp()
            .setFooter({ text: 'مرتبة حسب عدد الأعضاء (الأكبر أولاً)' });

        await message.reply({ embeds: [mainEmbed] }).catch(() => {});

        // إرسال السيرفرات في chunks
        const CHUNK_SIZE = 10;
        for (let i = 0; i < serverList.length; i += CHUNK_SIZE) {
            const chunk = serverList.slice(i, i + CHUNK_SIZE);

            const fields = chunk.map((s, idx) => ({
                name: `${i + idx + 1}. ${s.name}`,
                value: [
                    `👥 الأعضاء: **${s.members.toLocaleString()}**`,
                    `🆔 ID: \`${s.id}\``,
                    `📅 تأسس: ${s.createdAt}`,
                    `🔗 ${s.invite}`,
                ].join('\n'),
                inline: false
            }));

            const embed = new EmbedBuilder()
                .setColor('#2ECC71')
                .addFields(fields)
                .setTimestamp();

            await message.channel.send({ embeds: [embed] }).catch(e => {
                console.error('[Servers] خطأ:', e.message);
            });

            // تأخير صغير بين الرسائل
            if (i + CHUNK_SIZE < serverList.length) {
                await new Promise(r => setTimeout(r, 500));
            }
        }
    }
};
