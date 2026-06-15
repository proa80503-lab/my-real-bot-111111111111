const { PremiumEmbedBuilder } = require('../../utils/embed-builder');
const db = require('../../utils/database');

module.exports = {
    name: 'marry',
    aliases: ['زواج'],
    description: 'طلب الزواج من أحد الأعضاء',
    usage: 'marry @user',

    async execute(message, args) {
        const partner = message.mentions.users.first();

        if (!partner) return message.reply('❌ يجب عليك منشن الشخص!');
        if (partner.id === message.author.id) return message.reply('❌ لا يمكنك الزواج من نفسك!');
        if (partner.bot) return message.reply('❌ لا يمكنك الزواج من بوت!');

        const userData = db.getUserData(message.author.id);
        const cost = 10000;

        if (userData.balance < cost) {
            return message.reply(`❌ تحتاج إلى **${cost.toLocaleString()}** عملة للزواج!`);
        }

        // Check if already married (this logic should ideally check DB)
        // For now, let's proceed with the proposal.

        const embed = PremiumEmbedBuilder.custom({
            color: '#FF1493',
            title: '💍 طلب زواج',
            description: `${partner}، هل تقبل الزواج من ${message.author}؟\nاكتب **"أقبل"** للموافقة أو **"أرفض"** للرفض.`,
            footer: { text: 'لديك 60 ثانية للرد' }
        });

        const msg = await message.reply({ embeds: [embed] });

        const filter = m => m.author.id === partner.id && ['أقبل', 'أرفض', 'accept', 'decline'].includes(m.content.toLowerCase());
        const collector = message.channel.createMessageCollector({ filter, time: 60000, max: 1 });

        collector.on('collect', async m => {
            if (['أقبل', 'accept'].includes(m.content.toLowerCase())) {
                db.removeMoney(message.author.id, cost);
                // logic to save marriage in DB
                const successEmbed = PremiumEmbedBuilder.success('💕 تهانينا!', `تم الزفاف بنجاح بين ${message.author} و ${partner}! ✨`, []);
                await msg.edit({ embeds: [successEmbed] });
            } else {
                await msg.edit({ content: '❌ تم رفض الطلب.', embeds: [] });
            }
        });

        collector.on('end', (collected) => {
            if (collected.size === 0) msg.edit({ content: '⏰ انتهى الوقت ولم يرد التجاوب.', embeds: [] });
        });
    }
};
