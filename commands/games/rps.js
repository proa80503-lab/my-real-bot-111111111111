const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { PremiumEmbedBuilder } = require('../../utils/embed-builder');

module.exports = {
    name: 'rps',
    aliases: ['حجر_ورقة_مقص', 'ركس'],
    description: 'لعبة حجر ورقة مقص ضد البوت',
    usage: 'rps',

    async execute(message) {
        const embed = PremiumEmbedBuilder.game(
            'Rock Paper Scissors',
            'اختر حركتك: 🪨 حجر، 📄 ورقة، أو ✂️ مقص',
            []
        );

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder().setCustomId('rps_rock').setLabel('حجر 🪨').setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId('rps_paper').setLabel('ورقة 📄').setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId('rps_scissors').setLabel('مقص ✂️').setStyle(ButtonStyle.Primary)
            );

        await message.reply({ embeds: [embed], components: [row] });
    },

    async handleRPSInteraction(interaction) {
        if (!interaction.customId.startsWith('rps_')) return;

        const choices = {
            'rps_rock': 'حجر 🪨',
            'rps_paper': 'ورقة 📄',
            'rps_scissors': 'مقص ✂️'
        };

        const userChoiceKey = interaction.customId;
        const userChoiceRef = userChoiceKey.replace('rps_', '');

        const keys = Object.keys(choices);
        const botChoiceKey = keys[Math.floor(Math.random() * keys.length)];
        const botChoiceRef = botChoiceKey.replace('rps_', '');

        let resultMsg = '';
        let color = '#0099ff';

        if (userChoiceKey === botChoiceKey) {
            resultMsg = 'تعادل! 🤝';
            color = '#FFA500';
        } else if (
            (userChoiceRef === 'rock' && botChoiceRef === 'scissors') ||
            (userChoiceRef === 'paper' && botChoiceRef === 'rock') ||
            (userChoiceRef === 'scissors' && botChoiceRef === 'paper')
        ) {
            resultMsg = 'أنت فزت! 🎉';
            color = '#00FF00';
        } else {
            resultMsg = 'أنا فزت! 😜';
            color = '#FF0000';
        }

        const embed = PremiumEmbedBuilder.custom({
            title: 'Rock Paper Scissors',
            description: `🧑 **أنت:** ${choices[userChoiceKey]}\n🤖 **البوت:** ${choices[botChoiceKey]}\n\n**النتيجة:** ${resultMsg}`,
            color: color
        });

        await interaction.update({ embeds: [embed], components: [] });
    }
};
