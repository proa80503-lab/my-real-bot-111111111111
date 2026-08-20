'use strict';

const {
    ActionRowBuilder, ButtonBuilder, ButtonStyle,
    EmbedBuilder, MessageFlags
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

            const embed = new EmbedBuilder()
                .setColor('#9B59B6')
                .setTitle('⚖️ المزاد العلني')
                .setDescription('مرحباً بك في المزاد العلني! يمكنك هنا بيع ممتلكاتك أو المزايدة على ممتلكات الآخرين بواجهة ويب احترافية.\n\nاضغط على الزر أدناه للدخول إلى المزاد.')
                .addFields({
                    name: '💰 رصيدك في المحفظة',
                    value: `**${balance.toLocaleString()}** ${config.currency}`,
                    inline: false
                })
                .setImage('https://images.unsplash.com/photo-1534080556114-1e0e7cdbb6aa?q=80&w=800') // صورة ترحيبية للمزاد
                .setFooter({ text: 'هذا الرابط خاص بك وينتهي بعد ساعتين.' })
                .setTimestamp();

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setLabel('🌐 الدخول للمزاد').setStyle(ButtonStyle.Link).setURL(auctionUrl)
            );

            await message.reply({ embeds: [embed], components: [row] });
        } catch (err) {
            console.error('[Auction Error]', err);
            message.reply('حدث خطأ أثناء فتح المزاد.').catch(()=>{});
        }
    }
};
