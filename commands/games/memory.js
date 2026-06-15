const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { PremiumEmbedBuilder } = require('../../utils/embed-builder');

module.exports = {
    name: 'memory',
    aliases: ['ذاكرة', 'اختبار_الذاكرة', 'تذكر'],
    description: 'لعبة اختبار الذاكرة بالأرقام أو الرموز',
    usage: 'memory',

    async execute(message) {
        const emojis = ['🍎', '🍌', '🍇', '🍊', '🍋', '🍐', '🍓', '🍒'];
        const selected = emojis.sort(() => Math.random() - 0.5).slice(0, 4);
        const sequence = selected.join(' ');

        const embed = PremiumEmbedBuilder.game(
            '🧠 اختبار الذاكرة',
            `تذكر هذا الترتيب جيداً:\n\n**${sequence}**\n\nستختفي الرسالة بعد 5 ثوانٍ!`,
            []
        );

        const msg = await message.reply({ embeds: [embed] });

        setTimeout(async () => {
            embed.setDescription('اكتب الترتيب الآن (بالإيموجي أو أسمائهم)!');
            await msg.edit({ embeds: [embed] });

            const filter = m => m.author.id === message.author.id;
            const collector = message.channel.createMessageCollector({ filter, time: 15000, max: 1 });

            collector.on('collect', m => {
                if (m.content.replace(/\s+/g, '') === selected.join('')) {
                    message.reply('✅ ممتاز! ذاكرتك قوية جداً.');
                } else {
                    message.reply(`❌ للأسف خطأ. الترتيب الصحيح كان: **${sequence}**`);
                }
            });
        }, 5000);
    }
};
