const { PremiumEmbedBuilder } = require('../../utils/embed-builder');

module.exports = {
    name: 'math',
    aliases: ['رياضيات', 'حساب', 'مسألة'],
    description: 'حل مسائل رياضية سريعة لكسب المال',
    usage: 'math',

    async execute(message) {
        const operators = ['+', '-', '*'];
        const op = operators[Math.floor(Math.random() * operators.length)];
        let n1, n2;

        if (op === '*') {
            n1 = Math.floor(Math.random() * 12) + 1;
            n2 = Math.floor(Math.random() * 12) + 1;
        } else {
            n1 = Math.floor(Math.random() * 100) + 1;
            n2 = Math.floor(Math.random() * 100) + 1;
        }

        const answer = op === '+' ? n1 + n2 : op === '-' ? n1 - n2 : n1 * n2;
        const reward = op === '*' ? 200 : 100;

        const embed = PremiumEmbedBuilder.game(
            '🧮 مسألة رياضية',
            `أجب بسرعة: **${n1} ${op} ${n2} = ?**`,
            [{ name: '💰 الجائزة', value: `${reward} عملة` }]
        );

        message.reply({ embeds: [embed] });

        const filter = m => m.author.id === message.author.id && m.content === answer.toString();
        const collector = message.channel.createMessageCollector({ filter, time: 15000, max: 1 });

        collector.on('collect', () => {
            const db = require('../../utils/database');
            db.addMoney(message.author.id, reward);
            message.reply(`✅ أحسنت! إجابة صحيحة. حصلت على **${reward}** عملة.`);
        });

        collector.on('end', (collected) => {
            if (collected.size === 0) message.reply(`⏰ انتهى الوقت! الإجابة الصحيحة كانت **${answer}**.`);
        });
    }
};
