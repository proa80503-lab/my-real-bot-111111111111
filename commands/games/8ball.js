const { PremiumEmbedBuilder } = require('../../utils/embed-builder');

const eightBallAnswers = [
    { text: 'نعم بالتأكيد! ✅', type: 'positive' },
    { text: 'الأمور تبدو جيدة! 👍', type: 'positive' },
    { text: 'بدون شك! 💯', type: 'positive' },
    { text: 'نعم - بالتأكيد! ⭐', type: 'positive' },
    { text: 'يمكنك الاعتماد عليه. 🎯', type: 'positive' },
    { text: 'الآن لا أستطيع التنبؤ. 🤔', type: 'neutral' },
    { text: 'اسأل مرة أخرى لاحقاً. ⏳', type: 'neutral' },
    { text: 'من الأفضل ألا أخبرك الآن. 🤐', type: 'neutral' },
    { text: 'لا تعتمد عليه. ❌', type: 'negative' },
    { text: 'توقعاتي تقول لا. 🚫', type: 'negative' },
    { text: 'مصادري تقول لا. ⛔', type: 'negative' },
    { text: 'غير محتمل. 📉', type: 'negative' }
];

module.exports = {
    name: '8ball',
    aliases: ['تنبؤ', 'كرة_الحظ'],
    description: 'اسأل الكرة السحرية عن مستقبلك',
    usage: '8ball [سؤال]',

    async execute(message, args) {
        if (!args || args.length === 0) {
            return message.reply('❌ يجب أن تسأل سؤالاً! مثال: `!8ball هل سأفوز اليوم؟`');
        }

        const question = args.join(' ');
        const answer = eightBallAnswers[Math.floor(Math.random() * eightBallAnswers.length)];

        const color = answer.type === 'positive' ? '#00FF00' : answer.type === 'negative' ? '#FF0000' : '#FFA500';

        const embed = PremiumEmbedBuilder.custom({
            color: color,
            title: '🔮 الكرة السحرية',
            fields: [
                { name: '❓ السؤال', value: question },
                { name: '💬 الجواب', value: answer.text }
            ],
            footer: { text: `سأل بواسطة ${message.author.tag}`, iconURL: message.author.displayAvatarURL() }
        });

        message.reply({ embeds: [embed] });
    }
};
