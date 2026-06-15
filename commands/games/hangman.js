const { PremiumEmbedBuilder } = require('../../utils/embed-builder');

module.exports = {
    name: 'hangman',
    aliases: ['شنق', 'الرجل_المشنوق', 'كلمات'],
    description: 'لعبة الرجل المشنوق - خمن الكلمة',
    usage: 'hangman',

    async execute(message) {
        const words = ['هاتف', 'كمبيوتر', 'مملكة', 'برمجة', 'دسكورد', 'سيرفر', 'عدالة', 'تطوير'];
        const word = words[Math.floor(Math.random() * words.length)];
        let guessed = new Set();
        let display = word.split('').map(() => '_').join(' ');
        let attempts = 6;

        const embed = PremiumEmbedBuilder.game(
            '😵 الرجل المشنوق',
            `الكلمة: \`${display}\`\nالمحاولات المتبقية: **${attempts}**`,
            []
        );

        const msg = await message.reply({ embeds: [embed] });

        const filter = m => m.author?.id === message.author.id && m.content.length === 1;
        const collector = message.channel.createMessageCollector({ filter, time: 60000 });

        collector.on('collect', m => {
            const char = m.content.toLowerCase();
            if (guessed.has(char)) return m.reply('❌ خمنت هذا الحرف مسبقاً!');
            guessed.add(char);

            if (word.includes(char)) {
                display = word.split('').map(c => guessed.has(c) ? c : '_').join(' ');
                if (!display.includes('_')) {
                    collector.stop('win');
                } else {
                    embed.setDescription(`الكلمة: \`${display}\`\nالمحاولات المتبقية: **${attempts}**`);
                    msg.edit({ embeds: [embed] });
                }
            } else {
                attempts--;
                if (attempts === 0) {
                    collector.stop('lose');
                } else {
                    embed.setDescription(`الكلمة: \`${display}\`\nالمحاولات المتبقية: **${attempts}**`);
                    msg.edit({ embeds: [embed] });
                }
            }
        });

        collector.on('end', (collected, reason) => {
            if (reason === 'win') message.reply(`🎉 مبروك! لقد فزت، الكلمة كانت **${word}**.`);
            else if (reason === 'lose') message.reply(`💀 للأسف خسرت! الكلمة كانت **${word}**.`);
            else message.reply('⏰ انتهى الوقت.');
        });
    }
};
