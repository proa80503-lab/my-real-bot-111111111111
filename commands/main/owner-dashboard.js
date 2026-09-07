'use strict';

/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║  👑 OWNER DASHBOARD v3.0 — لوحة تحكم المالك الشاملة المتزامنة            ║
 * ║  6 أقسام حقيقية • كل زر = تغيير فوري محفوظ • ذكاء في التعرف على القنوات ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */

const {
    EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle,
    ModalBuilder, TextInputBuilder, TextInputStyle, MessageFlags,
    StringSelectMenuBuilder, ChannelType
} = require('discord.js');
const config      = require('../../config');
const db          = require('../../utils/database');
const botSettings = require('../../utils/bot-settings');
const channelResolver = require('../../utils/channel-resolver');
const fs   = require('fs');
const path = require('path');

// ─── ثيم ملكي ─────────────────────────────────────────────────────────────────
const COLORS = {
    main:    '#FFD700',   // ذهبي ملكي
    danger:  '#FF1744',
    success: '#00E676',
    info:    '#40C4FF',
    warning: '#FF8F00',
    purple:  '#AA00FF',
    dark:    '#1a1a2e',
};

// ══════════════════════════════════════════════════════════════════════════════
// ── بناء Embed اللوحة الرئيسية ──────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════
async function buildMainDashboard(client) {
    const guilds        = client.guilds.cache;
    const totalMembers  = guilds.reduce((s, g) => s + g.memberCount, 0);
    const totalChannels = guilds.reduce((s, g) => s + g.channels.cache.size, 0);
    const allUsers      = Object.keys(db.getAllUsers() || {}).length;
    const settings      = botSettings.getAll();

    // Uptime
    const upMs   = client.uptime || 0;
    const upD    = Math.floor(upMs / 86400000);
    const upH    = Math.floor((upMs % 86400000) / 3600000);
    const upM    = Math.floor((upMs % 3600000)  / 60000);
    const uptime = upD > 0 ? `${upD}ي ${upH}س ${upM}د` : `${upH}س ${upM}د`;

    // وضع الصيانة
    const maintPath = path.join(__dirname, '../../data/maintenance.json');
    let maintenance = false;
    try { maintenance = JSON.parse(fs.readFileSync(maintPath, 'utf8')).active; } catch {}

    // حالة الذكاء الاصطناعي
    const aiOn = settings.aiRandomReplyEnabled !== false;

    return new EmbedBuilder()
        .setColor(COLORS.main)
        .setTitle('👑 لوحة تحكم المالك الملكية')
        .setDescription([
            '```ansi',
            '\u001b[1;33m╔══════════════════════════════════════════╗\u001b[0m',
            '\u001b[1;33m║   🤖  مرحباً بك في مركز التحكم الكامل   ║\u001b[0m',
            '\u001b[1;33m╚══════════════════════════════════════════╝\u001b[0m',
            '```',
            '> كل زر هنا يطبّق تغييراً **حقيقياً فورياً** 👑',
        ].join('\n'))
        .addFields(
            {
                name: '📊 إحصائيات البوت',
                value: [
                    `🌐 **السيرفرات:** \`${guilds.size}\``,
                    `👥 **إجمالي الأعضاء:** \`${totalMembers.toLocaleString()}\``,
                    `📂 **القنوات:** \`${totalChannels}\``,
                    `🗄️ **مستخدمو DB:** \`${allUsers}\``,
                ].join('\n'),
                inline: true,
            },
            {
                name: '⚙️ حالة النظام',
                value: [
                    `⏱️ **Uptime:** \`${uptime}\``,
                    `🔧 **الصيانة:** ${maintenance ? '🔴 مفعّلة' : '🟢 معطّلة'}`,
                    `🤖 **الذكاء الاصطناعي:** ${aiOn ? '🟢 شغّال' : '🔴 موقوف'}`,
                    `💾 **RAM:** \`${(process.memoryUsage().heapUsed/1024/1024).toFixed(1)} MB\``,
                ].join('\n'),
                inline: true,
            },
            {
                name: '🎮 أوامر التحكم السريع',
                value: [
                    '`داشبورد` — هذه اللوحة',
                    '`!broadcast <نص>` — بث رسالة',
                    '`!status <نص>` — تغيير الحالة',
                    '`!servers` — السيرفرات',
                ].join('\n'),
                inline: false,
            },
        )
        .setThumbnail(client.user.displayAvatarURL({ size: 256 }))
        .setFooter({ text: `🔐 خاص بمالك البوت فقط • ${new Date().toLocaleString('ar-IQ')}`, iconURL: client.user.displayAvatarURL() })
        .setTimestamp();
}

// ══════════════════════════════════════════════════════════════════════════════
// ── بناء الأزرار — صفّين × 4 أزرار ─────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════
function buildDashboardButtons() {
    const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('owner_bot_control').setLabel('🤖 البوت').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('owner_economy').setLabel('💰 الاقتصاد').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('owner_games').setLabel('🎮 الألعاب').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('owner_broadcast').setLabel('📢 بث').setStyle(ButtonStyle.Secondary),
    );
    const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('owner_settings').setLabel('⚙️ الإعدادات').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('owner_servers').setLabel('🌐 السيرفرات').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('owner_stats_full').setLabel('📊 إحصائيات').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('owner_refresh').setLabel('🔄 تحديث').setStyle(ButtonStyle.Secondary),
    );
    return [row1, row2];
}

// ══════════════════════════════════════════════════════════════════════════════
// ── إرسال اللوحة ────────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════
async function sendOwnerDashboard(message) {
    try {
        const embed   = await buildMainDashboard(message.client);
        const buttons = buildDashboardButtons();

        const dmCh = await message.author.createDM();
        await dmCh.send({ embeds: [embed], components: buttons });

        if (message.guild) {
            const confirm = await message.reply({ content: '📬 تم إرسال لوحة التحكم للخاص يخوي!', allowedMentions: { repliedUser: false } });
            setTimeout(() => confirm.delete().catch(() => {}), 5000);
        }
    } catch {
        const embed   = await buildMainDashboard(message.client);
        const buttons = buildDashboardButtons();
        await message.reply({ content: '⚠️ ما قدرت أرسل DM — اللوحة هنا:', embeds: [embed], components: buttons });
    }
}

// ══════════════════════════════════════════════════════════════════════════════
// ── معالج الأزرار ────────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════
async function handleOwnerInteraction(interaction) {
    if (interaction.user.id !== config.ownerId) {
        return interaction.reply({ content: '❌ هذي اللوحة حصرية للمالك!', flags: MessageFlags.Ephemeral });
    }

    const id = interaction.customId;

    // ── 🔄 تحديث اللوحة ─────────────────────────────────────────────────────
    if (id === 'owner_refresh') {
        const embed   = await buildMainDashboard(interaction.client);
        const buttons = buildDashboardButtons();
        return interaction.update({ embeds: [embed], components: buttons });
    }

    // ── 🤖 تحكم البوت ───────────────────────────────────────────────────────
    if (id === 'owner_bot_control') {
        const settings      = botSettings.getAll();
        const maintPath     = path.join(__dirname, '../../data/maintenance.json');
        let maintenance     = false;
        try { maintenance = JSON.parse(fs.readFileSync(maintPath, 'utf8')).active; } catch {}
        const aiOn          = settings.aiRandomReplyEnabled !== false;

        const embed = new EmbedBuilder()
            .setColor(COLORS.info)
            .setTitle('🤖 تحكم البوت')
            .setDescription([
                `> 🔧 **الصيانة:** ${maintenance ? '🔴 مفعّلة' : '🟢 معطّلة'}`,
                `> 🤖 **الذكاء الاصطناعي:** ${aiOn ? '🟢 شغّال' : '🔴 موقوف'}`,
                `> 💾 **RAM:** ${(process.memoryUsage().heapUsed/1024/1024).toFixed(1)} MB`,
                `> ⏱️ **Uptime:** ${Math.floor((interaction.client.uptime||0)/60000)} دقيقة`,
            ].join('\n'));

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('owner_toggle_maintenance')
                .setLabel(maintenance ? '🟢 إلغاء الصيانة' : '🔴 تفعيل الصيانة')
                .setStyle(maintenance ? ButtonStyle.Success : ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId('owner_toggle_ai')
                .setLabel(aiOn ? '🔴 إيقاف الذكاء الاصطناعي' : '🟢 تفعيل الذكاء الاصطناعي')
                .setStyle(aiOn ? ButtonStyle.Danger : ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId('owner_set_status')
                .setLabel('🎮 تغيير حالة البوت')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('owner_back')
                .setLabel('↩️ رجوع')
                .setStyle(ButtonStyle.Secondary),
        );

        return interaction.update({ embeds: [embed], components: [row] });
    }

    // ── 🔧 تبديل الصيانة ────────────────────────────────────────────────────
    if (id === 'owner_toggle_maintenance') {
        const maintPath = path.join(__dirname, '../../data/maintenance.json');
        let d = { active: false };
        try { d = JSON.parse(fs.readFileSync(maintPath, 'utf8')); } catch {}
        d.active = !d.active;
        const dir = path.dirname(maintPath);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(maintPath, JSON.stringify(d, null, 2));

        return interaction.reply({
            content: d.active
                ? '🔴 **تم تفعيل وضع الصيانة!** البوت ما راح يرد على الأوامر.'
                : '🟢 **تم إلغاء الصيانة!** البوت يشتغل طبيعي الحين.',
            flags: MessageFlags.Ephemeral
        });
    }

    // ── 🤖 تبديل الذكاء الاصطناعي ───────────────────────────────────────────
    if (id === 'owner_toggle_ai') {
        const current = botSettings.get('aiRandomReplyEnabled') !== false;
        botSettings.set('aiRandomReplyEnabled', !current);

        return interaction.reply({
            content: !current
                ? '🟢 **تم تفعيل الذكاء الاصطناعي!** البوت يرد تلقائياً الحين.'
                : '🔴 **تم إيقاف الذكاء الاصطناعي!** ما راح يرد تلقائياً.',
            flags: MessageFlags.Ephemeral
        });
    }

    // ── 🎮 تغيير حالة البوت ─────────────────────────────────────────────────
    if (id === 'owner_set_status') {
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('status_btn_playing').setLabel('🎮 يلعب').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('status_btn_watching').setLabel('📺 يشاهد').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('status_btn_listening').setLabel('🎧 يستمع').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('status_btn_competing').setLabel('🏆 يتنافس').setStyle(ButtonStyle.Primary),
        );
        return interaction.reply({ content: '👇 **اختر نوع نشاط البوت:**', components: [row], flags: MessageFlags.Ephemeral });
    }

    // ── 💰 تحكم الاقتصاد ─────────────────────────────────────────────────────
    if (id === 'owner_economy') {
        const allUsers = db.getAllUsers() || {};
        let totalWealth = 0;
        let richest = { name: 'لا أحد', amount: 0 };
        let totalPoor = 0;

        for (const [uid, u] of Object.entries(allUsers)) {
            const w = (u.balance || 0) + (u.bank || 0);
            totalWealth += w;
            if (w > richest.amount) richest = { name: uid, amount: w };
            if (w < 500) totalPoor++;
        }

        const embed = new EmbedBuilder()
            .setColor(COLORS.success)
            .setTitle('💰 تحكم الاقتصاد')
            .addFields(
                { name: '💹 إجمالي الثروات', value: `${totalWealth.toLocaleString()} ${config.currency}`, inline: true },
                { name: '👥 عدد المستخدمين', value: `${Object.keys(allUsers).length}`, inline: true },
                { name: '😔 أقل من 500', value: `${totalPoor} مستخدم`, inline: true },
            );

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('owner_give_money').setLabel('💸 منح أموال').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('owner_take_money').setLabel('💀 سحب أموال').setStyle(ButtonStyle.Danger),
            new ButtonBuilder().setCustomId('owner_reset_economy').setLabel('🗑️ إعادة ضبط الكل').setStyle(ButtonStyle.Danger),
            new ButtonBuilder().setCustomId('owner_back').setLabel('↩️ رجوع').setStyle(ButtonStyle.Secondary),
        );

        return interaction.update({ embeds: [embed], components: [row] });
    }

    // ── 💸 منح أموال ─────────────────────────────────────────────────────────
    if (id === 'owner_give_money') {
        const modal = new ModalBuilder()
            .setCustomId('owner_give_money_modal')
            .setTitle('💸 منح أموال لمستخدم');

        modal.addComponents(
            new ActionRowBuilder().addComponents(
                new TextInputBuilder().setCustomId('give_userId').setLabel('الـ ID أو الذكر (@)').setStyle(TextInputStyle.Short).setRequired(true)
            ),
            new ActionRowBuilder().addComponents(
                new TextInputBuilder().setCustomId('give_amount').setLabel('المبلغ').setStyle(TextInputStyle.Short).setRequired(true).setPlaceholder('مثال: 10000')
            ),
        );
        return interaction.showModal(modal);
    }

    // ── 💀 سحب أموال ─────────────────────────────────────────────────────────
    if (id === 'owner_take_money') {
        const modal = new ModalBuilder()
            .setCustomId('owner_take_money_modal')
            .setTitle('💀 سحب أموال من مستخدم');

        modal.addComponents(
            new ActionRowBuilder().addComponents(
                new TextInputBuilder().setCustomId('take_userId').setLabel('الـ ID').setStyle(TextInputStyle.Short).setRequired(true)
            ),
            new ActionRowBuilder().addComponents(
                new TextInputBuilder().setCustomId('take_amount').setLabel('المبلغ (أو "كل" لسحب الكل)').setStyle(TextInputStyle.Short).setRequired(true)
            ),
        );
        return interaction.showModal(modal);
    }

    // ── 🎮 تحكم الألعاب ──────────────────────────────────────────────────────
    if (id === 'owner_games') {
        const settings = botSettings.getAll();
        const disabled = settings.disabledCommands || [];

        const gamesList = ['trivia', 'hangman', 'ttt', 'rps', 'casino', 'blackjack', 'slots', 'wordguess'];
        const lines = gamesList.map(g => `${disabled.includes(g) ? '🔴' : '🟢'} \`${g}\``).join('\n');

        const embed = new EmbedBuilder()
            .setColor(COLORS.purple)
            .setTitle('🎮 تحكم الألعاب')
            .setDescription(`**حالة الألعاب الحالية:**\n${lines}`)
            .setFooter({ text: '🟢 مفعّل • 🔴 معطّل' });

        const rows = [];
        // صف أزرار تفعيل/تعطيل
        const r1 = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('owner_disable_cmd_modal').setLabel('🔴 تعطيل أمر').setStyle(ButtonStyle.Danger),
            new ButtonBuilder().setCustomId('owner_enable_cmd_modal').setLabel('🟢 تفعيل أمر').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('owner_enable_all_games').setLabel('✅ تفعيل الكل').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('owner_back').setLabel('↩️ رجوع').setStyle(ButtonStyle.Secondary),
        );
        rows.push(r1);

        return interaction.update({ embeds: [embed], components: rows });
    }

    // ── ✅ تفعيل جميع الألعاب ───────────────────────────────────────────────
    if (id === 'owner_enable_all_games') {
        const games = ['trivia', 'hangman', 'ttt', 'rps', 'casino', 'blackjack', 'slots', 'wordguess'];
        for (const g of games) botSettings.enableCommand(g);
        return interaction.reply({ content: '✅ **تم تفعيل جميع الألعاب!**', flags: MessageFlags.Ephemeral });
    }

    // ── ⚙️ الإعدادات ──────────────────────────────────────────────────────────
    if (id === 'owner_settings') {
        const s = botSettings.getAll();
        const embed = new EmbedBuilder()
            .setColor(COLORS.warning)
            .setTitle('⚙️ إعدادات البوت')
            .addFields(
                { name: '💬 الرسائل التلقائية',   value: s.autoMessagesEnabled ? '🟢 مفعّلة' : '🔴 معطّلة', inline: true },
                { name: '🤖 ردود الذكاء الاصطناعي', value: s.aiRandomReplyEnabled !== false ? '🟢 مفعّلة' : '🔴 معطّلة', inline: true },
                { name: '📡 تكرار الرد (رسالة)',  value: `كل \`${s.aiRandomReplyFrequency || 10}\` رسالة`, inline: true },
                { name: '⏰ الفترة العشوائية',     value: `كل \`${s.randomEventInterval || 20}\` دقيقة`, inline: true },
                { name: '📅 التذكير اليومي',       value: s.dailyReminderEnabled ? '🟢 مفعّل' : '🔴 معطّل', inline: true },
                { name: '🛡️ حماية الحسابات الجديدة', value: s.antiRaidAccountAgeEnabled !== false ? '🟢 مفعّلة' : '🔴 معطّلة', inline: true },
            );

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('owner_toggle_auto_messages').setLabel('💬 تبديل الرسائل التلقائية').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('owner_set_ai_freq').setLabel('📡 تغيير تكرار AI').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('owner_toggle_ai').setLabel('🤖 تبديل AI').setStyle(ButtonStyle.Secondary),
        );
        const row2 = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('owner_toggle_protection').setLabel('🛡️ تبديل الحماية').setStyle(ButtonStyle.Danger),
            new ButtonBuilder().setCustomId('owner_back').setLabel('↩️ رجوع').setStyle(ButtonStyle.Secondary),
        );

        return interaction.update({ embeds: [embed], components: [row, row2] });
    }

    // ── 💬 تبديل الرسائل التلقائية ──────────────────────────────────────────
    if (id === 'owner_toggle_auto_messages') {
        const current = botSettings.get('autoMessagesEnabled') !== false;
        botSettings.set('autoMessagesEnabled', !current);
        return interaction.reply({
            content: !current ? '🟢 تم تفعيل الرسائل التلقائية!' : '🔴 تم إيقاف الرسائل التلقائية!',
            flags: MessageFlags.Ephemeral
        });
    }

    // ── 🛡️ تبديل حماية الحسابات الجديدة ──────────────────────────────────────────
    if (id === 'owner_toggle_protection') {
        const current = botSettings.get('antiRaidAccountAgeEnabled') !== false;
        botSettings.set('antiRaidAccountAgeEnabled', !current);
        
        // Return to settings to refresh the UI immediately
        const s = botSettings.getAll();
        const embed = new EmbedBuilder()
            .setColor(COLORS.warning)
            .setTitle('⚙️ إعدادات البوت')
            .addFields(
                { name: '💬 الرسائل التلقائية',   value: s.autoMessagesEnabled ? '🟢 مفعّلة' : '🔴 معطّلة', inline: true },
                { name: '🤖 ردود الذكاء الاصطناعي', value: s.aiRandomReplyEnabled !== false ? '🟢 مفعّلة' : '🔴 معطّلة', inline: true },
                { name: '📡 تكرار الرد (رسالة)',  value: `كل \`${s.aiRandomReplyFrequency || 10}\` رسالة`, inline: true },
                { name: '⏰ الفترة العشوائية',     value: `كل \`${s.randomEventInterval || 20}\` دقيقة`, inline: true },
                { name: '📅 التذكير اليومي',       value: s.dailyReminderEnabled ? '🟢 مفعّل' : '🔴 معطّل', inline: true },
                { name: '🛡️ حماية الحسابات الجديدة', value: !current ? '🟢 مفعّلة' : '🔴 معطّلة', inline: true },
            );

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('owner_toggle_auto_messages').setLabel('💬 تبديل الرسائل التلقائية').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('owner_set_ai_freq').setLabel('📡 تغيير تكرار AI').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('owner_toggle_ai').setLabel('🤖 تبديل AI').setStyle(ButtonStyle.Secondary),
        );
        const row2 = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('owner_toggle_protection').setLabel('🛡️ تبديل الحماية').setStyle(ButtonStyle.Danger),
            new ButtonBuilder().setCustomId('owner_back').setLabel('↩️ رجوع').setStyle(ButtonStyle.Secondary),
        );

        return interaction.update({ embeds: [embed], components: [row, row2] });
    }

    // ── 📡 تغيير تكرار AI ────────────────────────────────────────────────────
    if (id === 'owner_set_ai_freq') {
        const modal = new ModalBuilder()
            .setCustomId('owner_ai_freq_modal')
            .setTitle('📡 تغيير تكرار ردود الذكاء الاصطناعي');
        modal.addComponents(
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId('freq_value')
                    .setLabel('كل كم رسالة يرد البوت؟ (مثال: 10)')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true)
                    .setPlaceholder('10')
            )
        );
        return interaction.showModal(modal);
    }

    // ── 📢 البث ────────────────────────────────────────────────────────────────
    if (id === 'owner_broadcast') {
        const modal = new ModalBuilder()
            .setCustomId('owner_broadcast_modal')
            .setTitle('📢 بث رسالة لجميع السيرفرات');

        modal.addComponents(
            new ActionRowBuilder().addComponents(
                new TextInputBuilder().setCustomId('broadcast_title').setLabel('عنوان الرسالة').setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(100)
            ),
            new ActionRowBuilder().addComponents(
                new TextInputBuilder().setCustomId('broadcast_message').setLabel('نص الرسالة').setStyle(TextInputStyle.Paragraph).setRequired(true).setMaxLength(2000)
            ),
        );
        return interaction.showModal(modal);
    }

    // ── 🌐 قائمة السيرفرات ────────────────────────────────────────────────────
    if (id === 'owner_servers') {
        const guilds = interaction.client.guilds.cache;
        const lines  = [...guilds.values()].map(g =>
            `• **${g.name}** — \`${g.memberCount}\` عضو (ID: \`${g.id}\`)`
        ).join('\n');

        const embed = new EmbedBuilder()
            .setColor(COLORS.info)
            .setTitle(`🌐 السيرفرات (${guilds.size})`)
            .setDescription(lines.slice(0, 3800) || 'لا يوجد سيرفرات')
            .setTimestamp();

        return interaction.update({ embeds: [embed], components: [
            new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('owner_back').setLabel('↩️ رجوع').setStyle(ButtonStyle.Secondary)
            )
        ] });
    }

    // ── 📊 إحصائيات مفصّلة ───────────────────────────────────────────────────
    if (id === 'owner_stats_full') {
        const allUsers = db.getAllUsers() || {};
        let totalW = 0, maxW = 0, richUser = 'لا أحد';

        for (const [uid, u] of Object.entries(allUsers)) {
            const w = (u.balance||0) + (u.bank||0);
            totalW += w;
            if (w > maxW) { maxW = w; richUser = uid; }
        }

        const embed = new EmbedBuilder()
            .setColor(COLORS.main)
            .setTitle('📊 إحصائيات تفصيلية')
            .addFields(
                { name: '🌐 السيرفرات',       value: `${interaction.client.guilds.cache.size}`,           inline: true },
                { name: '👤 مستخدمو DB',      value: `${Object.keys(allUsers).length}`,                  inline: true },
                { name: '💰 إجمالي الثروات',  value: `${totalW.toLocaleString()} ${config.currency}`,    inline: true },
                { name: '👑 أغنى مستخدم',     value: `<@${richUser}> (${maxW.toLocaleString()})`,        inline: true },
                { name: '⏱️ Uptime',           value: `${Math.floor((interaction.client.uptime||0)/60000)} دقيقة`, inline: true },
                { name: '💾 RAM',              value: `${(process.memoryUsage().heapUsed/1024/1024).toFixed(2)} MB`, inline: true },
                { name: '🖥️ Node.js',          value: process.version,                                    inline: true },
                { name: '📦 Discord.js',       value: require('discord.js').version,                      inline: true },
                { name: '🔧 البيئة',           value: process.env.NODE_ENV || 'production',               inline: true },
            )
            .setTimestamp();

        return interaction.update({ embeds: [embed], components: [
            new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('owner_back').setLabel('↩️ رجوع').setStyle(ButtonStyle.Secondary)
            )
        ] });
    }

    // ── ↩️ رجوع للرئيسية ─────────────────────────────────────────────────────
    if (id === 'owner_back') {
        const embed   = await buildMainDashboard(interaction.client);
        const buttons = buildDashboardButtons();
        return interaction.update({ embeds: [embed], components: buttons });
    }

    // ── 🔴 تعطيل أمر ─────────────────────────────────────────────────────────
    if (id === 'owner_disable_cmd_modal') {
        const modal = new ModalBuilder().setCustomId('owner_disable_cmd_input').setTitle('🔴 تعطيل أمر');
        modal.addComponents(new ActionRowBuilder().addComponents(
            new TextInputBuilder().setCustomId('cmd_name').setLabel('اسم الأمر').setStyle(TextInputStyle.Short).setRequired(true).setPlaceholder('مثال: casino')
        ));
        return interaction.showModal(modal);
    }

    // ── 🟢 تفعيل أمر ─────────────────────────────────────────────────────────
    if (id === 'owner_enable_cmd_modal') {
        const modal = new ModalBuilder().setCustomId('owner_enable_cmd_input').setTitle('🟢 تفعيل أمر');
        modal.addComponents(new ActionRowBuilder().addComponents(
            new TextInputBuilder().setCustomId('cmd_name').setLabel('اسم الأمر').setStyle(TextInputStyle.Short).setRequired(true).setPlaceholder('مثال: casino')
        ));
        return interaction.showModal(modal);
    }
}

// ══════════════════════════════════════════════════════════════════════════════
// ── معالج المودالز ───────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════
async function handleOwnerModal(interaction) {
    if (interaction.user.id !== config.ownerId) {
        return interaction.reply({ content: '❌ هذا المودال حصري للمالك!', flags: MessageFlags.Ephemeral });
    }

    const id = interaction.customId;

    // ── بث رسالة ────────────────────────────────────────────────────────────
    if (id === 'owner_broadcast_modal') {
        const title = interaction.fields.getTextInputValue('broadcast_title');
        const msg   = interaction.fields.getTextInputValue('broadcast_message');

        const embed = new EmbedBuilder()
            .setColor(COLORS.main)
            .setTitle(`📢 ${title}`)
            .setDescription(msg)
            .setAuthor({ name: 'رسالة من مالك البوت', iconURL: interaction.user.displayAvatarURL() })
            .setTimestamp();

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        let sent = 0, failed = 0;
        for (const [, guild] of interaction.client.guilds.cache) {
            try {
                // ابحث عن قناة الإعلانات أولاً، ثم أي قناة عامة
                const ch = channelResolver.resolve(guild, 'announcementsChannel')
                        || channelResolver.resolve(guild, 'botChannel')
                        || guild.channels.cache.find(c => c.type === 0 && c.permissionsFor(guild.members.me)?.has('SendMessages'));
                if (ch) { await ch.send({ embeds: [embed] }); sent++; }
                else failed++;
            } catch { failed++; }
        }

        return interaction.editReply({ content: `✅ **تم البث!**\n📤 نجح: **${sent}** سيرفر\n❌ فشل: **${failed}** سيرفر` });
    }

    // ── منح أموال ────────────────────────────────────────────────────────────
    if (id === 'owner_give_money_modal') {
        const rawId  = interaction.fields.getTextInputValue('give_userId').replace(/[<@!>]/g, '');
        const amount = parseInt(interaction.fields.getTextInputValue('give_amount').replace(/,/g, ''));

        if (isNaN(amount) || amount <= 0) {
            return interaction.reply({ content: '❌ مبلغ غير صحيح!', flags: MessageFlags.Ephemeral });
        }

        const actual = db.addMoney(rawId, amount);
        db.addTransaction(rawId, 'owner_give', amount, `منح من المالك`);

        return interaction.reply({
            content: `✅ **تم منح \`${actual.toLocaleString()} ${config.currency}\` لـ <@${rawId}>**`,
            flags: MessageFlags.Ephemeral
        });
    }

    // ── سحب أموال ────────────────────────────────────────────────────────────
    if (id === 'owner_take_money_modal') {
        const rawId   = interaction.fields.getTextInputValue('take_userId').replace(/[<@!>]/g, '');
        const rawAmt  = interaction.fields.getTextInputValue('take_amount');

        const userData = db.getUserData(rawId);
        const total    = (userData.balance || 0) + (userData.bank || 0);

        if (rawAmt.includes('كل') || rawAmt.includes('all')) {
            db.updateUserData(rawId, { balance: 0, bank: 0 });
            db.addTransaction(rawId, 'owner_take', total, 'سحب كل الأموال من المالك');
            return interaction.reply({ content: `💀 **تم سحب كل أموال <@${rawId}> (${total.toLocaleString()})**`, flags: MessageFlags.Ephemeral });
        }

        const amount = parseInt(rawAmt.replace(/,/g, ''));
        if (isNaN(amount) || amount <= 0) return interaction.reply({ content: '❌ مبلغ غير صحيح!', flags: MessageFlags.Ephemeral });

        const done = db.removeMoney(rawId, Math.min(amount, userData.balance || 0));
        db.addTransaction(rawId, 'owner_take', amount, 'سحب من المالك');
        return interaction.reply({ content: `💀 **تم سحب \`${amount.toLocaleString()}\` من <@${rawId}>**`, flags: MessageFlags.Ephemeral });
    }

    // ── تغيير تكرار AI ───────────────────────────────────────────────────────
    if (id === 'owner_ai_freq_modal') {
        const freq = parseInt(interaction.fields.getTextInputValue('freq_value'));
        if (isNaN(freq) || freq < 1 || freq > 100) {
            return interaction.reply({ content: '❌ الرقم يجب يكون بين 1 و 100!', flags: MessageFlags.Ephemeral });
        }
        botSettings.set('aiRandomReplyFrequency', freq);
        return interaction.reply({ content: `✅ **تم تغيير التكرار: كل \`${freq}\` رسالة**`, flags: MessageFlags.Ephemeral });
    }

    // ── تعطيل أمر ────────────────────────────────────────────────────────────
    if (id === 'owner_disable_cmd_input') {
        const cmd = interaction.fields.getTextInputValue('cmd_name').toLowerCase().trim();
        const done = botSettings.disableCommand(cmd);
        return interaction.reply({
            content: done ? `🔴 **تم تعطيل الأمر \`${cmd}\`!**` : `⚠️ الأمر \`${cmd}\` كان معطّل مسبقاً.`,
            flags: MessageFlags.Ephemeral
        });
    }

    // ── تفعيل أمر ────────────────────────────────────────────────────────────
    if (id === 'owner_enable_cmd_input') {
        const cmd = interaction.fields.getTextInputValue('cmd_name').toLowerCase().trim();
        const done = botSettings.enableCommand(cmd);
        return interaction.reply({
            content: done ? `🟢 **تم تفعيل الأمر \`${cmd}\`!**` : `⚠️ الأمر \`${cmd}\` كان مفعّل مسبقاً.`,
            flags: MessageFlags.Ephemeral
        });
    }
}

// ══════════════════════════════════════════════════════════════════════════════
// ── إشعار بدء التشغيل ───────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════
async function notifyOwnerOnStartup(client) {
    try {
        const owner = await client.users.fetch(config.ownerId);
        if (!owner) return;

        const guilds      = client.guilds.cache;
        const totalMembers = guilds.reduce((s, g) => s + g.memberCount, 0);
        const allUsers    = Object.keys(db.getAllUsers() || {}).length;

        const embed = new EmbedBuilder()
            .setColor(COLORS.success)
            .setTitle('🚀 البوت اشتغل بنجاح يخوي!')
            .setDescription([
                '```diff',
                '+ البوت جاهز ويشتغل 100%',
                '```',
                `🌐 يخدم **${guilds.size}** سيرفر`,
                `👥 إجمالي **${totalMembers.toLocaleString()}** عضو`,
                `🗄️ في قاعدة البيانات: **${allUsers}** مستخدم`,
                `⏰ الوقت: \`${new Date().toLocaleString('ar-IQ')}\``,
            ].join('\n'))
            .setThumbnail(client.user.displayAvatarURL())
            .setFooter({ text: 'اكتب "داشبورد" أو "هيلب" للوحة التحكم' })
            .setTimestamp();

        const dmCh = await owner.createDM();
        await dmCh.send({ embeds: [embed], components: buildDashboardButtons() });
    } catch (err) {
        console.warn('[OwnerDashboard] ما أقدرت أرسل إشعار البدء:', err.message);
    }
}

// ══════════════════════════════════════════════════════════════════════════════
// ── تصدير ────────────────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════
module.exports = {
    name: 'owner-dashboard',
    aliases: ['ownerhelp'],
    description: 'لوحة تحكم المالك الاحترافية',
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
