const { PremiumEmbedBuilder } = require('../../utils/embed-builder');

module.exports = {
    name: 'fortune',
    aliases: ['حظك', 'حظي'],
    description: 'توقع حظك لهذا اليوم',
    usage: 'fortune',

    async execute(message, args) {
        const fortunes = [
            '⭐ يوم رائع ينتظرك!', '💎 فرصة ذهبية ستأتي اليوم', '🌟 الحظ في صفك اليوم',
            '🎯 ستحقق أهدافك إذا ثابرت', '🌈 توقع مفاجأة سارة قريباً', '⚡ طاقة إيجابية عالية!',
            '🎲 الحظ معك في الألعاب', '💰 فرصة ربح مادي قريبة', '🎊 يوم مميز للقاءات', '📚 يوم جيد للتعلم'
        ];

        const fortune = fortunes[Math.floor(Math.random() * fortunes.length)];
        const luckyNumber = Math.floor(Math.random() * 100) + 1;

        const embed = PremiumEmbedBuilder.custom({
            color: '#FFD700',
            title: `🔮 حظ ${message.author.username} اليوم`,
            fields: [
                { name: '✨ توقعات اليوم', value: fortune },
                { name: '🎲 رقمك المحظوظ', value: `${luckyNumber}`, inline: true }
            ]
        });

        return message.reply({ embeds: [embed] });
    }
};
