const { PremiumEmbedBuilder } = require('../../utils/embed-builder');

module.exports = {
    name: 'meme',
    aliases: ['ميم', 'ميمي'],
    description: 'إنشاء ميم نصي بسيط',
    usage: 'meme <نص علوي> | <نص سفلي>',

    async execute(message, args) {
        if (args.length < 2) return message.reply('❌ الاستخدام: `meme <نص علوي> | <نص سفلي>`');
        const text = args.join(' ');
        const [topText, bottomText] = text.split('|').map(t => t?.trim() || '');
        if (!topText || !bottomText) return message.reply('❌ استخدم | للفصل بين النصين!');

        const embed = PremiumEmbedBuilder.custom({
            color: '#FF6B35',
            title: '😂 Meme',
            description: `**${topText.toUpperCase()}**\n\n━━━━━━━━━━━━━━\n\n**${bottomText.toUpperCase()}**`
        });
        return message.reply({ embeds: [embed] });
    }
};
