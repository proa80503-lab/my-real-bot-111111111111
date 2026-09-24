'use strict';

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║  🔧 ADMIN ADVANCED v2.0 — لوحة الإدارة المتقدمة للمالك               ║
 * ║  يُفعَّل بـ: !إدارة-متقدمة | !admin-panel                             ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

const {
    EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle,
    PermissionFlagsBits
} = require('discord.js');
const config      = require('../../config');
const db          = require('../../utils/database');
const botSettings = require('../../utils/bot-settings');

const C = {
    gold:   '#FFD700',
    red:    '#E74C3C',
    green:  '#2ECC71',
    blue:   '#3498DB',
    purple: '#9B59B6',
    dark:   '#2C3E50',
    orange: '#FF8C00',
};

// ─── بناء لوحة التحكم الرئيسية ──────────────────────────────────────────────
function buildMainPanel(guild, client) {
    const guildData  = db.getGuildData(guild?.id || '0');
    const allUsers   = db.getAllUsers();
    const userCount  = Object.keys(allUsers).length;
    const settings   = botSettings.getAll();
    const cmdCount   = client?.commands?.size ?? '?';

    const embed = new EmbedBuilder()
        .setColor(C.purple)
        .setTitle('🔧 لوحة الإدارة المتقدمة')
        .setDescription([
            '```ansi',
            '\u001b[1;35m═══════════════════════════════════════\u001b[0m',
            '\u001b[1;33m  نظام الإدارة المتقدم — الجيل القادم  \u001b[0m',
            '\u001b[1;35m═══════════════════════════════════════\u001b[0m',
            '```',
        ].join('\n'))
        .addFields(
            {
                name: '🤖 إحصائيات البوت',
                value: [
                    `> 📊 **الأوامر:** ${cmdCount}`,
                    `> 🌐 **السيرفرات:** ${client?.guilds?.cache?.size ?? '?'}`,
                    `> 👥 **المستخدمون:** ${userCount}`,
                    `> 🏓 **Ping:** ${client?.ws?.ping ?? '?'}ms`,
                ].join('\n'),
                inline: true,
            },
            {
                name: '⚙️ الإعدادات النشطة',
                value: [
                    `> 🤖 AI: ${settings.aiRandomReplyEnabled ? '✅' : '❌'}`,
                    `> 📢 رسائل تلقائية: ${settings.autoMessagesEnabled ? '✅' : '❌'}`,
                    `> 👻 Ghost Ping: ${settings.ghostPingEnabled ? '✅' : '❌'}`,
                    `> 🛡️ Anti-Raid: ${guildData.antiRaidEnabled ? '✅' : '❌'}`,
                ].join('\n'),
                inline: true,
            },
            {
                name: '💾 حالة التخزين',
                value: [
                    `> 🗄️ **MongoDB:** ✅ متصل`,
                    `> 🧠 **Cache:** ✅ نشط`,
                    `> 📁 **JSON قديم:** محذوف`,
                ].join('\n'),
                inline: true,
            },
        )
        .setTimestamp()
        .setFooter({ text: '🔧 لوحة الإدارة المتقدمة | للمالك فقط' });

    const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('adv_bot_info').setLabel('📊 معلومات البوت').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('adv_clear_cache').setLabel('🔄 تحديث Cache').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('adv_storage_audit').setLabel('💾 مراجعة التخزين').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('adv_reset_cooldowns').setLabel('⏰ إعادة Cooldowns').setStyle(ButtonStyle.Danger),
    );

    const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('adv_toggle_ai').setLabel('🤖 تبديل AI').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('adv_toggle_msgs').setLabel('📢 تبديل الرسائل').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('adv_toggle_ghostping').setLabel('👻 Ghost Ping').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('adv_maintenance').setLabel('🔒 وضع الصيانة').setStyle(ButtonStyle.Danger),
    );

    return { embeds: [embed], components: [row1, row2] };
}

// ─── معالج التفاعلات ──────────────────────────────────────────────────────────
async function handleInteraction(interaction) {
    if (interaction.user.id !== config.ownerId &&
        !interaction.member?.permissions.has(PermissionFlagsBits.Administrator)) {
        return interaction.reply({ content: '❌ هذه اللوحة للمالك والإدارة فقط!', ephemeral: true });
    }

    await interaction.deferUpdate().catch(() => {});
    const id = interaction.customId;

    if (id === 'adv_bot_info') {
        const uptime   = process.uptime();
        const hours    = Math.floor(uptime / 3600);
        const minutes  = Math.floor((uptime % 3600) / 60);
        const seconds  = Math.floor(uptime % 60);
        const memUsage = process.memoryUsage();

        const embed = new EmbedBuilder()
            .setColor(C.blue)
            .setTitle('📊 معلومات البوت التفصيلية')
            .addFields(
                { name: '⏱️ وقت التشغيل', value: `> ${hours}س ${minutes}د ${seconds}ث`, inline: true },
                { name: '🧠 RAM', value: `> ${Math.round(memUsage.heapUsed / 1024 / 1024)} MB`, inline: true },
                { name: '📦 Node.js', value: `> ${process.version}`, inline: true },
                { name: '🏓 Ping', value: `> ${interaction.client.ws.ping}ms`, inline: true },
                { name: '🌐 السيرفرات', value: `> ${interaction.client.guilds.cache.size}`, inline: true },
                { name: '👥 المستخدمون', value: `> ${interaction.client.users.cache.size}`, inline: true },
            )
            .setTimestamp();
        return interaction.editReply({ embeds: [embed], components: [] }).catch(() => {});
    }

    if (id === 'adv_clear_cache') {
        // إعادة تحميل البيانات من MongoDB
        try {
            const coreDb = require('../../src/database/db');
            await coreDb.loadDatabase();
            const botSettingsDb = require('../../src/database/bot-settings-db');
            await botSettingsDb.loadBotSettings();
            return interaction.editReply({
                embeds: [new EmbedBuilder().setColor(C.green).setTitle('✅ تم تحديث Cache').setDescription('> تم إعادة تحميل جميع البيانات من MongoDB')],
                components: []
            }).catch(() => {});
        } catch (err) {
            return interaction.editReply({
                embeds: [new EmbedBuilder().setColor(C.red).setTitle('❌ فشل تحديث Cache').setDescription(`> ${err.message}`)],
                components: []
            }).catch(() => {});
        }
    }

    if (id === 'adv_storage_audit') {
        const fs   = require('fs');
        const path = require('path');
        const root = path.join(__dirname, '../..');
        const dataDir = path.join(root, 'data');

        let files = [];
        try {
            files = fs.readdirSync(dataDir).map(f => {
                const stat = fs.statSync(path.join(dataDir, f));
                return `> 📁 \`${f}\` — ${(stat.size / 1024).toFixed(1)} KB`;
            });
        } catch {
            files = ['> ❌ لا يمكن قراءة مجلد data/'];
        }

        return interaction.editReply({
            embeds: [new EmbedBuilder()
                .setColor(C.dark)
                .setTitle('💾 مراجعة ملفات التخزين')
                .setDescription([
                    '**ملفات data/ الحالية:**',
                    ...files.slice(0, 15),
                    '',
                    '**التخزين الرئيسي:** 🗄️ MongoDB Atlas',
                ].join('\n'))
            ],
            components: []
        }).catch(() => {});
    }

    if (id === 'adv_toggle_ai') {
        const current = botSettings.get('aiRandomReplyEnabled');
        botSettings.set('aiRandomReplyEnabled', !current);
        return interaction.editReply({
            embeds: [new EmbedBuilder().setColor(current ? C.red : C.green)
                .setTitle(`🤖 AI ${current ? 'معطّل' : 'مفعّل'}`)
                .setDescription(`> الذكاء الاصطناعي الآن: **${current ? '❌ معطّل' : '✅ مفعّل'}**`)
            ],
            components: []
        }).catch(() => {});
    }

    if (id === 'adv_toggle_msgs') {
        const current = botSettings.get('autoMessagesEnabled');
        botSettings.set('autoMessagesEnabled', !current);
        return interaction.editReply({
            embeds: [new EmbedBuilder().setColor(current ? C.red : C.green)
                .setTitle(`📢 الرسائل التلقائية ${current ? 'معطّلة' : 'مفعّلة'}`)
                .setDescription(`> الرسائل التلقائية الآن: **${current ? '❌ معطّلة' : '✅ مفعّلة'}**`)
            ],
            components: []
        }).catch(() => {});
    }

    if (id === 'adv_toggle_ghostping') {
        const current = botSettings.get('ghostPingEnabled');
        botSettings.set('ghostPingEnabled', !current);
        return interaction.editReply({
            embeds: [new EmbedBuilder().setColor(current ? C.red : C.green)
                .setTitle(`👻 Ghost Ping ${current ? 'معطّل' : 'مفعّل'}`)
                .setDescription(`> Ghost Ping الآن: **${current ? '❌ معطّل' : '✅ مفعّل'}**`)
            ],
            components: []
        }).catch(() => {});
    }

    if (id === 'adv_maintenance') {
        const current = botSettings.get('maintenanceMode');
        botSettings.set('maintenanceMode', !current);
        return interaction.editReply({
            embeds: [new EmbedBuilder().setColor(current ? C.green : C.red)
                .setTitle(`🔒 وضع الصيانة ${current ? 'معطّل' : 'مفعّل'}`)
                .setDescription(`> وضع الصيانة الآن: **${current ? '❌ معطّل' : '⚠️ مفعّل — البوت لن يستجيب للأوامر العادية'}**`)
            ],
            components: []
        }).catch(() => {});
    }

    if (id === 'adv_reset_cooldowns') {
        return interaction.editReply({
            embeds: [new EmbedBuilder().setColor(C.orange)
                .setTitle('⏰ إعادة تعيين Cooldowns')
                .setDescription('> لا يمكن إعادة تعيين Cooldowns الفردية من هنا.\n> استخدم: `!admin reset-cooldown @شخص`')
            ],
            components: []
        }).catch(() => {});
    }
}

module.exports = {
    name: 'admin-advanced',
    aliases: ['إدارة-متقدمة', 'ادارة-متقدمة', 'adv'],
    description: 'لوحة الإدارة المتقدمة',
    category: 'إدارة',

    async execute(message, args) {
        if (message.author.id !== config.ownerId &&
            !message.member?.permissions.has(PermissionFlagsBits.Administrator)) {
            return message.reply('❌ هذا الأمر للمالك والإدارة فقط!');
        }
        const panel = buildMainPanel(message.guild, message.client);
        await message.reply(panel);
    },

    handleInteraction,
    buildMainPanel,
};
