const { PremiumEmbedBuilder } = require('../../utils/embed-builder');

module.exports = {
    name: 'roll',
    aliases: ['نرد'],
    description: 'رمي النرد',
    usage: 'roll [sides]',

    async execute(message, args) {
        const sides = parseInt(args[0]) || 6;
        if (sides < 2 || sides > 100) return message.reply('❌ عدد الأوجه بين 2 و 100!');
        const result = Math.floor(Math.random() * sides) + 1;
        const embed = PremiumEmbedBuilder.game('🎲 رمي النرد', `نرد بـ ${sides} أوجه: **${result}**`);
        return message.reply({ embeds: [embed] });
    }
};
