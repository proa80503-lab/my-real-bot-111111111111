const { PremiumEmbedBuilder } = require('../../utils/embed-builder');

module.exports = {
    name: 'wyr',
    aliases: ['هل_تفضل', 'تفضل'],
    description: 'لعبة ماذا تفضل؟',
    usage: 'wyr',

    async execute(message, args) {
        const questions = [
            ['تفضل أن تكون غنياً', 'تفضل أن تكون مشهوراً'],
            ['تفضل السفر للماضي', 'تفضل السفر للمستقبل'],
            ['تفضل القهوة', 'تفضل الشاي'],
            ['تفضل الصيف', 'تفضل الشتاء']
        ];
        const question = questions[Math.floor(Math.random() * questions.length)];
        const embed = PremiumEmbedBuilder.game('🤔 هل تفضل...', null, [
            { name: '1️⃣ الخيار الأول', value: question[0] },
            { name: '2️⃣ الخيار الثاني', value: question[1] }
        ]);
        return message.reply({ embeds: [embed] });
    }
};
