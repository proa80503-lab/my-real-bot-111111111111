'use strict';

/**
 * ╔══════════════════════════════════════════════════════════╗
 * ║       👑 لوحة تحكم المالك الاحترافية — Owner Dashboard   ║
 * ║  ترسل عبر DM تلقائياً عند كتابة: داشبورد / هيلب / help  ║
 * ╚══════════════════════════════════════════════════════════╝
 */

const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    MessageFlags
} = require('discord.js');
const config = require('../../config');
const db = require('../../utils/database');
const fs = require('fs');
const path = require('path');

// ─────────────────────────────────────────────────────────────────────────────
// الألوان والثيمات المميزة للمالك
// ─────────────────────────────────────────────────────────────────────────────
const OWNER_COLOR = '#FFD700';   // ذهبي ملكي
const ACCENT_COLOR = '#FF6B35';  // برتقالي ناري
const SUCCESS_COLOR = '#00E676'; // أخضر نيون
const DANGER_COLOR = '#FF1744';  // أحمر خطر
const INFO_COLOR = '#40C4FF';    // أزرق معلومات

// ─────────────────────────────────────────────────────────────────────────────
// بناء Embed لوحة التحكم الرئيسية
// ─────────────────────────────────────────────────────────────────────────────
async function buildDashboardEmbed(client, ownerId) {
    const guilds = client.guilds.cache;
    const totalMembers = guilds.reduce((sum, g) => sum + g.memberCount, 0);
    const totalChannels = guilds.reduce((sum, g) => sum + g.channels.cache.size, 0);

    // حساب Uptime
    const uptimeMs = client.uptime || 0;
    const uptimeDays = Math.floor(uptimeMs / 86400000);
    const uptimeHours = Math.floor((uptimeMs % 86400000) / 3600000);
    const uptimeMins = Math.floor((uptimeMs % 3600000) / 60000);
    const uptimeSecs = Math.floor((uptimeMs % 60000) / 1000);
    const uptimeStr = uptimeDays > 0
        ? `${uptimeDays}د ${uptimeHours}س ${uptimeMins}ق`
        : `${uptimeHours}س ${uptimeMins}ق ${uptimeSecs}ث`;

    // قراءة حالة الصيانة
    let maintenanceActive = false;
    const maintPath = path.join(__dirname, '../../data/maintenance.json');
    if (fs.existsSync(maintPath)) {
        try {
            const d = JSON.parse(fs.readFileSync(maintPath, 'utf8'));
            maintenanceActive = d.active === true;
        } catch (_) {}
    }

    // إحصائيات قاعدة البيانات
    const allUsers = Object.keys(db.getAllUsers() || {}).length;

    // حالة البوت المحفوظة
    let botStatus = { type: 'WATCHING', text: 'الأوامر' };
    const statusPath = path.join(__dirname, '../../data/status.json');
    if (fs.existsSync(statusPath)) {
        try {
            botStatus = JSON.parse(fs.readFileSync(statusPath, 'utf8'));
        } catch (_) {}
    }

    const embed = new EmbedBuilder()
        .setColor(OWNER_COLOR)
        .setTitle('👑 لوحة تحكم المالك الملكية')
        .setDescription([
            '```',
            '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
            '   🤖  نظام التحكم الكامل للمالك  🤖',
            '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
            '```',
            '',
            '> هذه اللوحة حصرية لك فقط يا صاحب البوت 👑',
        ].join('\n'))
        .addFields(
            {
                name: '📊 إحصائيات البوت',
                value: [
                    `🌐 السيرفرات: **${guilds.size}**`,
                    `👥 إجمالي الأعضاء: **${totalMembers.toLocaleString()}**`,
                    `📂 القنوات: **${totalChannels}**`,
                    `🗄️ المستخدمون في DB: **${allUsers}**`,
                ].join('\n'),
                inline: true
            },
            {
                name: '⚙️ حالة النظام',
                value: [
                    `⏱️ Uptime: **${uptimeStr}**`,
                    `🏷️ الحالة: **${botStatus.type} ${botStatus.text}**`,
                    `🔧 الصيانة: ${maintenanceActive ? '🔴 **مفعلة**' : '🟢 **معطلة**'}`,
                    `💾 الذاكرة: **${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1)} MB**`,
                ].join('\n'),
                inline: true
            },
            {
                name: '\u200b',
                value: '\u200b',
                inline: false
            },
            {
                name: '🎮 أوامر التحكم السريع',
                value: [
                    '`!status` — تغيير حالة البوت',
                    '`!servers` — قائمة السيرفرات',
                    '`!broadcast` — رسالة لجميع السيرفرات',
                    '`!say <نص>` — البوت يكتب باسمك',
                ].join('\n'),
                inline: false
            }
        )
        .setThumbnail(client.user.displayAvatarURL({ size: 256 }))
        .setFooter({
            text: `🔐 رسالة خاصة • ${new Date().toLocaleString('ar-SA')}`,
            iconURL: client.user.displayAvatarURL()
        })
        .setTimestamp();

    return embed;
}

// ─────────────────────────────────────────────────────────────────────────────
// بناء الأزرار الرئيسية للوحة التحكم
// ─────────────────────────────────────────────────────────────────────────────
function buildDashboardButtons() {
    const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('owner_status')
            .setLabel('🎮 تغيير الحالة')
            .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
            .setCustomId('owner_servers')
            .setLabel('🌐 السيرفرات')
            .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId('owner_broadcast')
            .setLabel('📢 بث رسالة')
            .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
            .setCustomId('owner_stats')
            .setLabel('📊 إحصائيات')
            .setStyle(ButtonStyle.Secondary)
    );

    const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('owner_maintenance_toggle')
            .setLabel('🔧 تبديل الصيانة')
            .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
            .setCustomId('owner_help_full')
            .setLabel('📋 جميع الأوامر')
            .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId('owner_refresh')
            .setLabel('🔄 تحديث')
            .setStyle(ButtonStyle.Secondary)
    );

    return [row1, row2];
}

// ─────────────────────────────────────────────────────────────────────────────
// إرسال لوحة التحكم للمالك عبر DM
// ─────────────────────────────────────────────────────────────────────────────
async function sendOwnerDashboard(message) {
    try {
        const embed = await buildDashboardEmbed(message.client, message.author.id);
        const buttons = buildDashboardButtons();

        // محاولة إرسال DM للمالك
        const dmChannel = await message.author.createDM();
        await dmChannel.send({
            embeds: [embed],
            components: buttons
        });

        // تأكيد في نفس القناة برسالة سريعة تختفي
        if (message.guild) {
            const confirmMsg = await message.reply({
                content: '📬 **تم إرسال لوحة التحكم للخاص!** تحقق من DM.',
                allowedMentions: { repliedUser: false }
            });
            setTimeout(() => confirmMsg.delete().catch(() => {}), 5000);
        }
    } catch (err) {
        console.error('[OwnerDashboard] فشل إرسال DM:', err.message);
        // إذا فشل الـ DM نرسله في نفس القناة
        if (message.guild) {
            const embed = await buildDashboardEmbed(message.client, message.author.id);
            const buttons = buildDashboardButtons();
            await message.reply({
                content: '⚠️ **تعذر إرسال DM** — عرض اللوحة هنا:',
                embeds: [embed],
                components: buttons
            });
        }
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// معالج أزرار لوحة المالك
// ─────────────────────────────────────────────────────────────────────────────
async function handleOwnerInteraction(interaction) {
    // التأكد أن المستخدم هو المالك فقط
    if (interaction.user.id !== config.ownerId) {
        return interaction.reply({
            content: '❌ هذه الأزرار حصرية لمالك البوت فقط!',
            flags: MessageFlags.Ephemeral
        });
    }

    const id = interaction.customId;

    // ── تحديث اللوحة
    if (id === 'owner_refresh') {
        const embed = await buildDashboardEmbed(interaction.client, interaction.user.id);
        const buttons = buildDashboardButtons();
        return interaction.update({ embeds: [embed], components: buttons });
    }

    // ── تغيير الحالة
    if (id === 'owner_status') {
        const statusCmd = interaction.client.commands.get('status');
        if (statusCmd) {
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('status_btn_playing').setLabel('يلعب').setEmoji('🎮').setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId('status_btn_watching').setLabel('يشاهد').setEmoji('📺').setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId('status_btn_listening').setLabel('يستمع').setEmoji('🎧').setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId('status_btn_competing').setLabel('يتنافس').setEmoji('🏆').setStyle(ButtonStyle.Primary)
            );
            return interaction.reply({
                content: '👇 **اختر نوع نشاط البوت:**',
                components: [row],
                flags: MessageFlags.Ephemeral
            });
        }
    }

    // ── قائمة السيرفرات
    if (id === 'owner_servers') {
        const guilds = interaction.client.guilds.cache;
        const lines = [];
        for (const [, guild] of guilds) {
            lines.push(`• **${guild.name}** — ${guild.memberCount} عضو (ID: \`${guild.id}\`)`);
        }

        const chunkedContent = lines.join('\n').slice(0, 3800);
        const embed = new EmbedBuilder()
            .setColor(INFO_COLOR)
            .setTitle(`🌐 قائمة السيرفرات (${guilds.size})`)
            .setDescription(chunkedContent || 'لا يوجد سيرفرات')
            .setTimestamp();

        return interaction.reply({
            embeds: [embed],
            flags: MessageFlags.Ephemeral
        });
    }

    // ── Broadcast — بث رسالة
    if (id === 'owner_broadcast') {
        const modal = new ModalBuilder()
            .setCustomId('owner_broadcast_modal')
            .setTitle('📢 بث رسالة لجميع السيرفرات');

        const titleInput = new TextInputBuilder()
            .setCustomId('broadcast_title')
            .setLabel('عنوان الرسالة')
            .setPlaceholder('إعلان مهم من مالك البوت')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setMaxLength(100);

        const msgInput = new TextInputBuilder()
            .setCustomId('broadcast_message')
            .setLabel('نص الرسالة')
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true)
            .setMaxLength(2000);

        modal.addComponents(
            new ActionRowBuilder().addComponents(titleInput),
            new ActionRowBuilder().addComponents(msgInput)
        );

        return interaction.showModal(modal);
    }

    // ── إحصائيات تفصيلية
    if (id === 'owner_stats') {
        const client = interaction.client;
        const guilds = client.guilds.cache;
        const allUsers = db.getAllUsers() || {};
        const usersCount = Object.keys(allUsers).length;

        // حساب مجموع الثروات
        let totalWealth = 0;
        for (const u of Object.values(allUsers)) {
            totalWealth += (u.balance || 0) + (u.bank || 0);
        }

        const embed = new EmbedBuilder()
            .setColor(ACCENT_COLOR)
            .setTitle('📊 إحصائيات تفصيلية')
            .addFields(
                { name: '🌐 السيرفرات', value: `${guilds.size}`, inline: true },
                { name: '👤 المستخدمون في DB', value: `${usersCount}`, inline: true },
                { name: '💰 إجمالي الثروات', value: `${totalWealth.toLocaleString()} ${config.currency}`, inline: true },
                { name: '⏱️ Uptime', value: `${Math.floor((client.uptime || 0) / 60000)} دقيقة`, inline: true },
                { name: '💾 RAM', value: `${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB`, inline: true },
                { name: '🖥️ Node.js', value: process.version, inline: true },
                { name: '📦 Discord.js', value: require('discord.js').version, inline: true },
                { name: '🔧 البيئة', value: process.env.NODE_ENV || 'production', inline: true }
            )
            .setTimestamp();

        return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    }

    // ── تبديل الصيانة
    if (id === 'owner_maintenance_toggle') {
        const maintPath = path.join(__dirname, '../../data/maintenance.json');
        let maintData = { active: false };

        if (fs.existsSync(maintPath)) {
            try {
                maintData = JSON.parse(fs.readFileSync(maintPath, 'utf8'));
            } catch (_) {}
        }

        maintData.active = !maintData.active;

        // إنشاء المجلد إذا لم يكن موجوداً
        const dataDir = path.dirname(maintPath);
        if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
        fs.writeFileSync(maintPath, JSON.stringify(maintData, null, 2));

        const status = maintData.active;
        return interaction.reply({
            content: status
                ? '🔴 **تم تفعيل وضع الصيانة!** البوت لن يستجيب للأوامر العادية.'
                : '🟢 **تم إلغاء وضع الصيانة!** البوت يعمل بشكل طبيعي.',
            flags: MessageFlags.Ephemeral
        });
    }

    // ── جميع الأوامر
    if (id === 'owner_help_full') {
        const cmds = interaction.client.commands;
        const categories = {};

        for (const [name, cmd] of cmds) {
            const cat = cmd.category || 'عام';
            if (!categories[cat]) categories[cat] = [];
            categories[cat].push(`\`${name}\``);
        }

        const lines = Object.entries(categories).map(([cat, list]) =>
            `**${cat}:** ${list.join(', ')}`
        ).join('\n');

        const embed = new EmbedBuilder()
            .setColor(OWNER_COLOR)
            .setTitle('📋 قائمة جميع الأوامر المحملة')
            .setDescription(lines.slice(0, 4000) || 'لا أوامر محملة')
            .setFooter({ text: `إجمالي: ${cmds.size} أمر` })
            .setTimestamp();

        return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// معالج مودالز المالك
// ─────────────────────────────────────────────────────────────────────────────
async function handleOwnerModal(interaction) {
    if (interaction.user.id !== config.ownerId) {
        return interaction.reply({
            content: '❌ هذا المودال حصري لمالك البوت!',
            flags: MessageFlags.Ephemeral
        });
    }

    const id = interaction.customId;

    // ── Broadcast Modal
    if (id === 'owner_broadcast_modal') {
        const title = interaction.fields.getTextInputValue('broadcast_title');
        const msg = interaction.fields.getTextInputValue('broadcast_message');

        const embed = new EmbedBuilder()
            .setColor(OWNER_COLOR)
            .setTitle(`📢 ${title}`)
            .setDescription(msg)
            .setAuthor({
                name: `رسالة من مالك البوت`,
                iconURL: interaction.user.displayAvatarURL()
            })
            .setTimestamp();

        let sent = 0;
        let failed = 0;

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        for (const [, guild] of interaction.client.guilds.cache) {
            try {
                // البحث عن أول قناة نصية متاحة
                const channel = guild.channels.cache.find(ch =>
                    ch.type === 0 && // GuildText
                    ch.permissionsFor(guild.members.me)?.has('SendMessages')
                );
                if (channel) {
                    await channel.send({ embeds: [embed] });
                    sent++;
                } else {
                    failed++;
                }
            } catch (e) {
                failed++;
            }
        }

        return interaction.editReply({
            content: `✅ **تم إرسال البث!**\n📤 نجح: **${sent}** سيرفر\n❌ فشل: **${failed}** سيرفر`
        });
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// إشعار المالك عند بدء تشغيل البوت
// ─────────────────────────────────────────────────────────────────────────────
async function notifyOwnerOnStartup(client) {
    try {
        const owner = await client.users.fetch(config.ownerId);
        if (!owner) return;

        const guilds = client.guilds.cache;
        const totalMembers = guilds.reduce((sum, g) => sum + g.memberCount, 0);

        const embed = new EmbedBuilder()
            .setColor(SUCCESS_COLOR)
            .setTitle('🚀 البوت انطلق بنجاح!')
            .setDescription([
                '```diff',
                '+ تم تشغيل البوت بنجاح تام!',
                '```',
                '',
                `🌐 يخدم **${guilds.size}** سيرفر`,
                `👥 إجمالي **${totalMembers.toLocaleString()}** عضو`,
                `⏰ الوقت: \`${new Date().toLocaleString('ar-SA')}\``,
            ].join('\n'))
            .setThumbnail(client.user.displayAvatarURL())
            .setFooter({ text: 'اكتب "داشبورد" أو "هيلب" للوحة التحكم' })
            .setTimestamp();

        const dmChannel = await owner.createDM();
        await dmChannel.send({ embeds: [embed] });
    } catch (err) {
        console.warn('[OwnerDashboard] لم يتم إرسال إشعار البدء للمالك:', err.message);
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// تصدير الوحدة
// ─────────────────────────────────────────────────────────────────────────────
module.exports = {
    name: 'owner-dashboard',
    aliases: ['ownerhelp'],
    description: 'لوحة تحكم المالك الاحترافية (DM فقط)',
    ownerOnly: true,

    async execute(message) {
        if (message.author.id !== config.ownerId) return;
        await sendOwnerDashboard(message);
    },

    sendOwnerDashboard,
    handleOwnerInteraction,
    handleOwnerModal,
    notifyOwnerOnStartup,
};
