'use strict';

const {
    ActionRowBuilder, ButtonBuilder, ButtonStyle,
    EmbedBuilder
} = require('discord.js');

const db = require('../../utils/database');
const config = require('../../config');
const dashboard = require('../../dashboard-server');

module.exports = {
    name: 'auction',
    aliases: ['مزاد'],
    description: 'المزاد العلني للممتلكات الفاخرة',
    usage: 'مزاد',

    async execute(message) {
        try {
            const user = message.author;
            const userData = db.getUserData(user.id);
            const balance = userData.balance || 0;

            const token = dashboard.generateWebToken(user);
            const auctionUrl = `${process.env.RENDER_EXTERNAL_URL || 'http://localhost:' + (process.env.PORT || 3000)}/auction?token=${token}`;

            const dmEmbed = new EmbedBuilder()
                .setColor('#9B59B6')
                .setTitle('⚖️ رابط مزادك الخاص')
                .setDescription('تم إرسال رابط المزاد بالخاص لحماية حسابك.\nيمكنك بيع ممتلكاتك أو المزايدة على ممتلكات الآخرين.')
                .addFields(
                    {
                        name: '💰 رصيدك في المحفظة',
                        value: `**${balance.toLocaleString()}** ${config.currency}`,
                        inline: false
                    },
                    {
                        name: '🔒 ملاحظة أمنية',
                        value: 'هذا الرابط **خاص بك فقط** — لا تشاركه!\nينتهي خلال **30 دقيقة**.',
                        inline: false
                    }
                )
                .setImage('https://images.unsplash.com/photo-1534080556114-1e0e7cdbb6aa?q=80&w=800')
                .setFooter({ text: '⏱️ ينتهي الرابط بعد 30 دقيقة' })
                .setTimestamp();

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setLabel('🌐 فتح المزاد').setStyle(ButtonStyle.Link).setURL(auctionUrl)
            );

            try {
                // ── محاولة الإرسال بالخاص ──────────────────────────────────
                await user.send({ embeds: [dmEmbed], components: [row] });
                await message.reply('📬 تم إرسال رابط المزاد **بالخاص** لحماية حسابك! تحقق من رسائلك الخاصة.').catch(() => {});
            } catch {
                // ── المستخدم أغلق DMs — نرسل في الروم مع تحذير ─────────────
                const publicEmbed = new EmbedBuilder()
                    .setColor('#9B59B6')
                    .setTitle('⚖️ المزاد العلني')
                    .setDescription('يمكنك بيع ممتلكاتك أو المزايدة على ممتلكات الآخرين.')
                    .addFields(
                        {
                            name: '💰 رصيدك في المحفظة',
                            value: `**${balance.toLocaleString()}** ${config.currency}`,
                            inline: false
                        },
                        {
                            name: '⚠️ تنبيه',
                            value: '🔒 لم أتمكن من إرسال الرابط بالخاص — هذا الرابط خاص بك، **لا تشاركه!**',
                            inline: false
                        }
                    )
                    .setFooter({ text: '⏱️ ينتهي الرابط بعد 30 دقيقة' })
                    .setTimestamp();

                await message.reply({ embeds: [publicEmbed], components: [row] });
            }

        } catch (err) {
            console.error('[Auction Error]', err);
            message.reply('حدث خطأ أثناء فتح المزاد.').catch(() => {});
        }
    }
};
