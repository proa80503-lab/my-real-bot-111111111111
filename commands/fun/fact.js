const { PremiumEmbedBuilder } = require('../../utils/embed-builder');

module.exports = {
    name: 'fact',
    aliases: ['حقيقة', 'هل_تعلم'],
    description: 'معلومة عشوائية ممتعة',
    usage: 'fact',

    async execute(message, args) {
        const facts = [
            '🐙 الأخطبوط لديه 3 قلوب!', '🍯 العسل لا يفسد أبداً', '🦒 صوت الزرافة صامت تقريباً',
            '🌙 القمر يبتعد عن الأرض 3.8 سم سنوياً', '🐌 الحلزون ينام لـ 3 سنوات', '⚡ البرق أسخن من الشمس'
        ];

        const fact = facts[Math.floor(Math.random() * facts.length)];
        const embed = PremiumEmbedBuilder.info('💡 هل تعلم؟', fact);
        return message.reply({ embeds: [embed] });
    }
};
