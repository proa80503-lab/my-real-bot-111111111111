'use strict';

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * status.js — تغيير حالة البوت (للمالك فقط)
 * ✅ التخزين: MongoDB عبر bot-settings (بدلاً من data/status.json)
 * ─────────────────────────────────────────────────────────────────────────────
 */

const {
    ActivityType, ActionRowBuilder, ButtonBuilder, ButtonStyle,
    ModalBuilder, TextInputBuilder, TextInputStyle, EmbedBuilder
} = require('discord.js');
const config = require('../../config');
const botSettings = require('../../utils/bot-settings');

const ACTIVITY_TYPES = {
    'play':       { type: ActivityType.Playing,   str: 'PLAYING',   label: 'يلعب',       emoji: '🎮' },
    'playing':    { type: ActivityType.Playing,   str: 'PLAYING',   label: 'يلعب',       emoji: '🎮' },
    'يلعب':       { type: ActivityType.Playing,   str: 'PLAYING',   label: 'يلعب',       emoji: '🎮' },
    'watch':      { type: ActivityType.Watching,  str: 'WATCHING',  label: 'يشاهد',      emoji: '📺' },
    'watching':   { type: ActivityType.Watching,  str: 'WATCHING',  label: 'يشاهد',      emoji: '📺' },
    'يشاهد':      { type: ActivityType.Watching,  str: 'WATCHING',  label: 'يشاهد',      emoji: '📺' },
    'listen':     { type: ActivityType.Listening, str: 'LISTENING', label: 'يستمع إلى',  emoji: '🎧' },
    'listening':  { type: ActivityType.Listening, str: 'LISTENING', label: 'يستمع إلى',  emoji: '🎧' },
    'يستمع':      { type: ActivityType.Listening, str: 'LISTENING', label: 'يستمع إلى',  emoji: '🎧' },
    'compete':    { type: ActivityType.Competing, str: 'COMPETING', label: 'يتنافس في',  emoji: '🏆' },
    'competing':  { type: ActivityType.Competing, str: 'COMPETING', label: 'يتنافس في',  emoji: '🏆' },
    'يتنافس':     { type: ActivityType.Competing, str: 'COMPETING', label: 'يتنافس في',  emoji: '🏆' },
};

// ─── تحديث الحالة وحفظها في MongoDB ──────────────────────────────────────────
async function updateStatus(client, activityType, typeString, text, statusType = 'online') {
    client.user.setPresence({
        activities: [{ name: text, type: activityType }],
        status: statusType,
    });
    // ✅ حفظ في MongoDB عبر bot-settings
    botSettings.set('botStatus', { type: typeString, text, status: statusType });
}

module.exports = {
    name: 'status',
    aliases: ['حالة', 'وضع'],
    description: 'تغيير حالة البوت (للمالك فقط)',
    usage: 'status [type] [text]',

    async execute(message, args) {
        if (message.author.id !== config.ownerId) {
            return message.reply('❌ هذا الأمر مخصص لصاحب البوت فقط!');
        }

        if (args.length === 0) {
            // عرض الحالة الحالية + أزرار التغيير
            const current = botSettings.get('botStatus');
            const embed = new EmbedBuilder()
                .setColor('#5865F2')
                .setTitle('🎭 إدارة حالة البوت')
                .setDescription([
                    '**الحالة الحالية:**',
                    current?.text
                        ? `> ${current.type}: **${current.text}**`
                        : '> لا توجد حالة محفوظة',
                    '',
                    '**اختر نوع النشاط الجديد:**',
                ].join('\n'));

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('status_btn_playing').setLabel('يلعب').setEmoji('🎮').setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId('status_btn_watching').setLabel('يشاهد').setEmoji('📺').setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId('status_btn_listening').setLabel('يستمع').setEmoji('🎧').setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId('status_btn_competing').setLabel('يتنافس').setEmoji('🏆').setStyle(ButtonStyle.Primary),
            );
            return message.reply({ embeds: [embed], components: [row] });
        }

        const firstArg = args[0].toLowerCase();
        let activityType, typeString, text;

        if (ACTIVITY_TYPES[firstArg]) {
            activityType = ACTIVITY_TYPES[firstArg].type;
            typeString   = ACTIVITY_TYPES[firstArg].str;
            text         = args.slice(1).join(' ');
        } else {
            // النص فقط بدون نوع — نستخدم آخر نوع محفوظ أو WATCHING افتراضياً
            const currentStatus = botSettings.get('botStatus') || { type: 'WATCHING' };
            const typeMap = {
                PLAYING:   ActivityType.Playing,
                WATCHING:  ActivityType.Watching,
                LISTENING: ActivityType.Listening,
                COMPETING: ActivityType.Competing,
            };
            activityType = typeMap[currentStatus.type] || ActivityType.Watching;
            typeString   = currentStatus.type || 'WATCHING';
            text         = args.join(' ');
        }

        if (!text) return message.reply('❌ يجب كتابة نص الحالة!');

        await updateStatus(message.client, activityType, typeString, text);
        await message.reply({
            embeds: [new EmbedBuilder()
                .setColor('#2ECC71')
                .setTitle('✅ تم تحديث الحالة')
                .setDescription(`> **${typeString}:** ${text}`)
                .setFooter({ text: '🗄️ محفوظة في MongoDB' })
            ]
        });
    },

    async handleStatusInteraction(interaction) {
        if (interaction.user.id !== config.ownerId) {
            return interaction.reply({ content: '❌ هذا الأمر مخصص لصاحب البوت فقط!', ephemeral: true });
        }

        if (interaction.customId.startsWith('status_btn_')) {
            const typeKey = interaction.customId.replace('status_btn_', '');
            const modal = new ModalBuilder()
                .setCustomId(`status_modal_${typeKey}`)
                .setTitle('تغيير نص الحالة');
            const textInput = new TextInputBuilder()
                .setCustomId('status_text')
                .setLabel('النص الذي سيظهر في حالة البوت')
                .setStyle(TextInputStyle.Short)
                .setRequired(true)
                .setMaxLength(128);
            modal.addComponents(new ActionRowBuilder().addComponents(textInput));
            await interaction.showModal(modal);

        } else if (interaction.customId.startsWith('status_modal_')) {
            const typeKey    = interaction.customId.replace('status_modal_', '');
            const text       = interaction.fields.getTextInputValue('status_text');
            const typeConfig = ACTIVITY_TYPES[typeKey] || ACTIVITY_TYPES['watching'];
            await updateStatus(interaction.client, typeConfig.type, typeConfig.str, text);
            await interaction.reply({
                embeds: [new EmbedBuilder()
                    .setColor('#2ECC71')
                    .setTitle('✅ تم تحديث الحالة')
                    .setDescription(`> ${typeConfig.emoji} **${typeConfig.label}:** ${text}`)
                    .setFooter({ text: '🗄️ محفوظة في MongoDB — تستمر بعد الريستارت' })
                ],
                ephemeral: true
            });
        }
    }
};
