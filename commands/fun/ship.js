const { PremiumEmbedBuilder } = require('../../utils/embed-builder');

module.exports = {
    name: 'ship',
    aliases: ['توافق'],
    description: 'حساب نسبة التوافق بين شخصين',
    usage: 'ship @user',

    async execute(message, args) {
        const user1 = message.author;
        const user2 = message.mentions.users.first();

        if (!user2) {
            return message.reply('❌ منشن شخصاً!');
        }

        const combined = user1.id + user2.id;
        let hash = 0;
        for (let i = 0; i < combined.length; i++) {
            hash = ((hash << 5) - hash) + combined.charCodeAt(i);
        }
        const percentage = Math.abs(hash % 101);

        const hearts = '❤️'.repeat(Math.floor(percentage / 10));
        const emptyHearts = '🤍'.repeat(10 - Math.floor(percentage / 10));

        let description;
        if (percentage < 25) description = '💔 لا توافق... ربما في حياة أخرى!';
        else if (percentage < 50) description = '💛 توافق ضعيف، لكن هناك أمل!';
        else if (percentage < 75) description = '💚 توافق جيد! استمروا';
        else if (percentage < 90) description = '💖 توافق رائع! علاقة قوية';
        else description = '💕 توافق مثالي! توأم الروح!';

        const embed = PremiumEmbedBuilder.custom({
            color: '#FF69B4',
            title: '💘 نسبة التوافق',
            description: `${user1.username} 💕 ${user2.username}`,
            fields: [
                { name: 'النسبة', value: `**${percentage}%**` },
                { name: 'التقييم', value: `${hearts}${emptyHearts}` },
                { name: '📝 الوصف', value: description }
            ]
        });

        return message.reply({ embeds: [embed] });
    }
};
