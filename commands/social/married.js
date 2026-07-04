'use strict';

const { EmbedBuilder } = require('discord.js');
const db = require('../../utils/database');

module.exports = {
    name: 'married',
    aliases: ['couples', 'partners', 'المتزوجين', 'ازواج', 'زواجي'],
    description: 'قائمة المتزوجين في السيرفر',
    usage: 'المتزوجين',

    async execute(message) {
        const users = db.getAllUsers();
        const couples = [];
        const processed = new Set();

        for (const [userId, userData] of Object.entries(users)) {
            // دعم الحقول القديمة والجديدة
            const partnerId = userData.marriedTo || userData.partner || null;
            const since = userData.marriedSince || userData.marriageDate || null;

            if (!partnerId || processed.has(userId) || processed.has(partnerId)) continue;

            // تأكد من أن الشريك يشير لنفس العلاقة
            const partnerData = users[partnerId];
            const partnerRef = partnerData?.marriedTo || partnerData?.partner || null;

            if (partnerData && partnerRef === userId) {
                couples.push({ partner1: userId, partner2: partnerId, since });
                processed.add(userId);
                processed.add(partnerId);
            }
        }

        if (couples.length === 0) {
            return message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor('#ED4245')
                        .setTitle('💔 لا يوجد أزواج حالياً')
                        .setDescription(
                            '> لم يتزوج أحد بعد في هذا السيرفر.\n> استخدم `زواج @شخص` لتكون الأول!'
                        )
                        .setTimestamp(),
                ],
            });
        }

        // ترتيب: الأقدم أولاً
        couples.sort((a, b) => (a.since || 0) - (b.since || 0));

        // جلب أسماء المستخدمين
        const rows = await Promise.all(
            couples.slice(0, 20).map(async (couple, i) => {
                const [p1, p2] = await Promise.all([
                    message.client.users.fetch(couple.partner1).catch(() => ({ username: 'مستخدم مجهول' })),
                    message.client.users.fetch(couple.partner2).catch(() => ({ username: 'مستخدم مجهول' })),
                ]);
                const days = couple.since
                    ? Math.floor((Date.now() - couple.since) / 86_400_000)
                    : null;
                const dateStr = couple.since
                    ? `<t:${Math.floor(couple.since / 1000)}:D>`
                    : 'تاريخ غير معروف';
                const durationStr = days !== null ? ` — **${days}** يوم` : '';
                const medal = i === 0 ? '👑' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
                return `${medal} **${p1.username}** ❤️ **${p2.username}** ${dateStr}${durationStr}`;
            })
        );

        const embed = new EmbedBuilder()
            .setColor('#FF69B4')
            .setTitle(`💍 قائمة الأزواج (${couples.length} زوج)`)
            .setDescription(rows.join('\n'))
            .setFooter({
                text: message.guild.name,
                iconURL: message.guild.iconURL() || undefined,
            })
            .setTimestamp();

        message.reply({ embeds: [embed] });
    },
};
