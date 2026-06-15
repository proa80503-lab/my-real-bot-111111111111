const { PremiumEmbedBuilder, ICONS } = require('../../utils/embed-builder');
const db = require('../../utils/database');
const config = require('../../config');

module.exports = {
    name: 'scramble',
    aliases: ['تفكيك', 'بعثرة', 'slam'],
    description: 'لعبة تفكيك الكلمات - أعد ترتيب الأحرف',
    usage: 'تفكيك',

    async execute(message) {
        const words = ['سيارة', 'طائرة', 'مدرسة', 'برمجة', 'حاسوب', 'مفتاح', 'حديقة', 'قلم', 'كتاب', 'ديسكورد'];
        const word = words[Math.floor(Math.random() * words.length)];

        // تفكيك الكلمة
        const scrambled = word.split('').sort(() => Math.random() - 0.5).join(' ');

        const reward = 150;

        const embed = PremiumEmbedBuilder.game(
            '🧩 لعبة التفكيك (Slam)',
            `أعد ترتيب الأحرف لتكوين كلمة صحيحة:\n\n**${scrambled}**`,
            [
                { name: '💰 الجائزة', value: `${reward} ${config.currency}`, inline: true },
                { name: '⏰ الوقت', value: '20 ثانية', inline: true }
            ]
        );

        message.reply({ embeds: [embed] });

        const filter = m => m.content.trim() === word && !m.author.bot;
        const collector = message.channel.createMessageCollector({ filter, time: 20000, max: 1 });

        collector.on('collect', m => {
            db.addMoney(m.author.id, reward);
            const levels = require('../../utils/levels');
            levels.addXP(m.author.id, 10, m);

            const successEmbed = PremiumEmbedBuilder.success(
                'إجابة صحيحة! 🎉',
                `مبروك ${m.author}! لقد عرفت الكلمة: **${word}**\nحصلت على ${reward} ${config.currency}`
            );
            m.reply({ embeds: [successEmbed] });
        });

        collector.on('end', (collected, reason) => {
            if (reason === 'time') {
                const failEmbed = PremiumEmbedBuilder.error(
                    'انتهى الوقت! ⏰',
                    `لم يعرف أحد الكلمة.\nالكلمة كانت: **${word}**`
                );
                message.channel.send({ embeds: [failEmbed] });
            }
        });
    }
};
