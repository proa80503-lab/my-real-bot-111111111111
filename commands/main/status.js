const { ActivityType, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const fs = require('fs');
const path = require('path');
const config = require('../../config');

const statusPath = path.join(__dirname, '../../data/status.json');

const ACTIVITY_TYPES = {
    'play': { type: ActivityType.Playing, str: 'PLAYING', label: 'يلعب', emoji: '🎮' },
    'playing': { type: ActivityType.Playing, str: 'PLAYING', label: 'يلعب', emoji: '🎮' },
    'يلعب': { type: ActivityType.Playing, str: 'PLAYING', label: 'يلعب', emoji: '🎮' },
    'watch': { type: ActivityType.Watching, str: 'WATCHING', label: 'يشاهد', emoji: '📺' },
    'watching': { type: ActivityType.Watching, str: 'WATCHING', label: 'يشاهد', emoji: '📺' },
    'يشاهد': { type: ActivityType.Watching, str: 'WATCHING', label: 'يشاهد', emoji: '📺' },
    'listen': { type: ActivityType.Listening, str: 'LISTENING', label: 'يستمع إلى', emoji: '🎧' },
    'listening': { type: ActivityType.Listening, str: 'LISTENING', label: 'يستمع إلى', emoji: '🎧' },
    'يستمع': { type: ActivityType.Listening, str: 'LISTENING', label: 'يستمع إلى', emoji: '🎧' },
    'compete': { type: ActivityType.Competing, str: 'COMPETING', label: 'يتنافس في', emoji: '🏆' },
    'competing': { type: ActivityType.Competing, str: 'COMPETING', label: 'يتنافس في', emoji: '🏆' },
    'يتنافس': { type: ActivityType.Competing, str: 'COMPETING', label: 'يتنافس في', emoji: '🏆' }
};

module.exports = {
    name: 'status',
    aliases: ['حالة', 'وضع'],
    description: 'تغيير حالة البوت (للمالك فقط)',
    usage: 'status [type] [text]',

    async execute(message, args) {
        if (message.author.id !== config.ownerId) {
            return message.reply('توكل لك بس لصاحب البوت هذا');
        }

        if (args.length === 0) {
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('status_btn_playing').setLabel('يلعب').setEmoji('🎮').setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId('status_btn_watching').setLabel('يشاهد').setEmoji('📺').setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId('status_btn_listening').setLabel('يستمع').setEmoji('🎧').setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId('status_btn_competing').setLabel('يتنافس').setEmoji('🏆').setStyle(ButtonStyle.Primary)
            );
            return message.reply({ content: '👇 **اختر نوع النشاط لتغيير الحالة:**', components: [row] });
        }

        const firstArg = args[0].toLowerCase();
        let activityType, typeString, text;

        if (ACTIVITY_TYPES[firstArg]) {
            activityType = ACTIVITY_TYPES[firstArg].type;
            typeString = ACTIVITY_TYPES[firstArg].str;
            text = args.slice(1).join(' ');
        } else {
            let currentStatus = { type: 'WATCHING' };
            if (fs.existsSync(statusPath)) {
                try { currentStatus = JSON.parse(fs.readFileSync(statusPath, 'utf8')); } catch (e) { }
            }
            const typeMap = { 'PLAYING': ActivityType.Playing, 'WATCHING': ActivityType.Watching, 'LISTENING': ActivityType.Listening, 'COMPETING': ActivityType.Competing };
            activityType = typeMap[currentStatus.type] || ActivityType.Watching;
            typeString = currentStatus.type || 'WATCHING';
            text = args.join(' ');
        }

        if (!text) return message.reply('❌ يجب كتابة نص الحالة!');
        await updateStatus(message.client, activityType, typeString, text);
        await message.reply(`✅ تم تغيير الحالة بنجاح إلى: **${typeString} ${text}**`);
    },

    async handleStatusInteraction(interaction) {
        if (interaction.user.id !== config.ownerId) return interaction.reply({ content: '❌ هذا الأمر مخصص لصاحب البوت فقط!', ephemeral: true });

        if (interaction.customId.startsWith('status_btn_')) {
            const typeKey = interaction.customId.replace('status_btn_', '');
            const modal = new ModalBuilder().setCustomId(`status_modal_${typeKey}`).setTitle('تغيير نص الحالة');
            const textInput = new TextInputBuilder().setCustomId('status_text').setLabel("النص الذي سيظهر").setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(128);
            modal.addComponents(new ActionRowBuilder().addComponents(textInput));
            await interaction.showModal(modal);
        } else if (interaction.customId.startsWith('status_modal_')) {
            const typeKey = interaction.customId.replace('status_modal_', '');
            const text = interaction.fields.getTextInputValue('status_text');
            const typeConfig = ACTIVITY_TYPES[typeKey] || ACTIVITY_TYPES['watching'];
            await updateStatus(interaction.client, typeConfig.type, typeConfig.str, text);
            await interaction.reply({ content: `✅ **تم تحديث الحالة!**\n${typeConfig.emoji} ${typeConfig.label}: ${text}`, ephemeral: true });
        }
    }
};

async function updateStatus(client, activityType, typeString, text) {
    client.user.setPresence({ activities: [{ name: text, type: activityType }], status: 'online' });
    const statusData = { type: typeString, text: text, status: 'online' };
    if (!fs.existsSync(path.dirname(statusPath))) fs.mkdirSync(path.dirname(statusPath), { recursive: true });
    fs.writeFileSync(statusPath, JSON.stringify(statusData, null, 4));
}
