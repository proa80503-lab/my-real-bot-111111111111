/**
 * ═══════════════════════════════════════════════════════════
 * 💰 لوحة الاقتصاد المركزية — Economy Hub
 * نظام أزرار متكامل: رصيد، يومي، عمل، سرقة، بنك، تحويل
 * ═══════════════════════════════════════════════════════════
 */

'use strict';

const {
    EmbedBuilder, ActionRowBuilder, ButtonBuilder,
    ButtonStyle, ModalBuilder, TextInputBuilder,
    TextInputStyle, MessageFlags
} = require('discord.js');

const db = require('../../utils/database');
const config = require('../../config');
const levels = require('../../utils/levels');

// ─── وظائف العمل ───────────────────────────────────────────
const JOBS = [
    { name: 'مبرمج', emoji: '💻', min: 300, max: 700 },
    { name: 'طبيب', emoji: '🏥', min: 400, max: 800 },
    { name: 'مهندس', emoji: '⚙️', min: 350, max: 750 },
    { name: 'معلم', emoji: '📚', min: 250, max: 600 },
    { name: 'طاهي', emoji: '🍳', min: 200, max: 500 },
    { name: 'سائق', emoji: '🚗', min: 150, max: 450 },
    { name: 'محامي', emoji: '⚖️', min: 450, max: 900 },
    { name: 'فنان', emoji: '🎨', min: 200, max: 600 },
    { name: 'رياضي', emoji: '⚽', min: 300, max: 700 },
    { name: 'صياد', emoji: '🎣', min: 100, max: 400 },
    { name: 'مزارع', emoji: '🌾', min: 150, max: 450 },
    { name: 'رائد فضاء', emoji: '🚀', min: 600, max: 1200 },
];

// ─── تنسيق الوقت المتبقي ──────────────────────────────────
function formatTimeLeft(ms) {
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    if (h > 0) return `${h}س ${m}د`;
    if (m > 0) return `${m}د ${s}ث`;
    return `${s}ث`;
}

// ─── شريط التقدم ──────────────────────────────────────────
function progressBar(val, max, size = 12) {
    const pct = Math.min(val / max, 1);
    const filled = Math.round(pct * size);
    return '█'.repeat(filled) + '░'.repeat(size - filled);
}

// ═══════════════════════════════════════════════════════════
// بناء اللوحة الرئيسية
// ═══════════════════════════════════════════════════════════
async function buildMainPanel(userId, client) {
    const userData = db.getUserData(userId);
    const balance = userData.balance || 0;
    const bank = userData.bank || 0;
    const total = balance + bank;
    const lvlInfo = levels.getLevelProgress(userId);
    const now = Date.now();

    // حالة الـ cooldowns
    const workReady = !userData.lastWork || (now - userData.lastWork) >= (config.workCooldown || 1800000);
    const dailyReady = !userData.lastDaily || (now - userData.lastDaily) >= 86400000;
    const robReady = !userData.lastRob || (now - userData.lastRob) >= (config.robCooldown || 3600000);

    const workLeft = workReady ? null : config.workCooldown - (now - userData.lastWork);
    const dailyLeft = dailyReady ? null : 86400000 - (now - userData.lastDaily);
    const robLeft = robReady ? null : config.robCooldown - (now - userData.lastRob);

    const dailyStreak = userData.dailyStreak || 0;
    const streakBonus = Math.min(dailyStreak * (config.streakBonus || 100), config.maxStreakBonus || 5000);

    // ─── Embed ───────────────────────────────────────────────
    const embed = new EmbedBuilder()
        .setColor('#2B2D31')
        .setTitle(`💼 لوحة الاقتصاد — <@${userId}>`)
        .setDescription([
            '> مركز التحكم المالي الخاص بك',
            '',
            `💰 **المحفظة:**  \`${balance.toLocaleString()} ${config.currency}\``,
            `🏦 **البنك:**     \`${bank.toLocaleString()}    ${config.currency}\``,
            `💎 **الثروة:**   \`${total.toLocaleString()}   ${config.currency}\``,
        ].join('\n'))
        .addFields(
            {
                name: `⭐ المستوى ${lvlInfo.level}`,
                value: `${progressBar(lvlInfo.progressXP, lvlInfo.requiredXP)} **${lvlInfo.percentage}%**\n${lvlInfo.progressXP}/${lvlInfo.requiredXP} XP`,
                inline: false
            },
            {
                name: '🔥 Daily Streak',
                value: `${dailyStreak} يوم ${dailyStreak >= 7 ? '🏆' : dailyStreak >= 3 ? '⚡' : ''}`,
                inline: true
            },
            {
                name: '💼 حالة العمل',
                value: workReady ? '✅ جاهز' : `⏰ ${formatTimeLeft(workLeft)}`,
                inline: true
            },
            {
                name: '🎁 المكافأة اليومية',
                value: dailyReady ? `✅ جاهزة (+${streakBonus.toLocaleString()})` : `⏰ ${formatTimeLeft(dailyLeft)}`,
                inline: true
            }
        )
        .setTimestamp()
        .setFooter({ text: 'اضغط على الأزرار للتفاعل • محدّث الآن' });

    // ─── الصف الأول: عمليات الكسب ────────────────────────────
    const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('eco_daily')
            .setLabel(dailyReady ? 'يومي 🎁' : `يومي ⏰ ${formatTimeLeft(dailyLeft)}`)
            .setStyle(dailyReady ? ButtonStyle.Success : ButtonStyle.Secondary)
            .setDisabled(!dailyReady),
        new ButtonBuilder()
            .setCustomId('eco_work')
            .setLabel(workReady ? 'عمل 💼' : `عمل ⏰ ${formatTimeLeft(workLeft)}`)
            .setStyle(workReady ? ButtonStyle.Primary : ButtonStyle.Secondary)
            .setDisabled(!workReady),
        new ButtonBuilder()
            .setCustomId('eco_rob')
            .setLabel(robReady ? 'سرقة 🕵️' : `سرقة ⏰ ${formatTimeLeft(robLeft)}`)
            .setStyle(ButtonStyle.Danger)
            .setDisabled(!robReady)
    );

    // ─── الصف الثاني: البنك ───────────────────────────────────
    const vault = userData.inventory?.vault;
    const vaultBal = userData.vaultBalance || 0;
    const vaultCap = userData.vaultCap || 0;

    const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('eco_deposit')
            .setLabel('إيداع 🏦')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(balance <= 0),
        new ButtonBuilder()
            .setCustomId('eco_withdraw')
            .setLabel('سحب 💵')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(bank <= 0),
        new ButtonBuilder()
            .setCustomId('eco_transfer')
            .setLabel('تحويل 🔄')
            .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId('eco_transactions')
            .setLabel('السجل 📋')
            .setStyle(ButtonStyle.Secondary)
    );

    // ─── صف الخزنة (يظهر فقط إذا تملّك الخزنة) ─────────────
    const hasVault = !!(vault || vaultCap > 0);
    const vaultRow = hasVault ? new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('eco_vault')
            .setLabel(`🔐 خزنتي (${vaultBal.toLocaleString()} ${config.currency})`)
            .setStyle(ButtonStyle.Success)
    ) : null;

    // ─── الصف الثالث: تنقل ───────────────────────────────────
    const row3 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('eco_leaderboard')
            .setLabel('المتصدرون 🏆')
            .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId('eco_refresh')
            .setLabel('تحديث 🔄')
            .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId('eco_shop')
            .setLabel('المتجر 🛒')
            .setStyle(ButtonStyle.Secondary)
    );

    // صف التقدم + المستوى
    if (hasVault) {
        embed.addFields({
            name: '🔐 خزنتي الشخصية',
            value: `${vaultBal.toLocaleString()} / ${vaultCap.toLocaleString()} ${config.currency} (محمية من السرقة)`,
            inline: false
        });
    }

    const rows = [row1, row2, row3];
    if (vaultRow) rows.splice(2, 0, vaultRow); // أدرج صف الخزنة قبل صف التنقل
    return { embeds: [embed], components: rows };
}

// ═══════════════════════════════════════════════════════════
// معالج كل زر
// ═══════════════════════════════════════════════════════════
async function handleEcoButton(interaction) {
    const userId = interaction.user.id;
    const action = interaction.customId;

    // ── تحديث اللوحة ──────────────────────────────────────────
    if (action === 'eco_refresh') {
        const panel = await buildMainPanel(userId, interaction.client);
        return interaction.update({ ...panel });
    }

    // ── مكافأة يومية ──────────────────────────────────────────
    if (action === 'eco_daily') {
        const userData = db.getUserData(userId);
        const now = Date.now();
        const cooldown = 86400000;

        if (userData.lastDaily && (now - userData.lastDaily) < cooldown) {
            const left = cooldown - (now - userData.lastDaily);
            return interaction.reply({ content: `⏰ يمكنك الحصول على المكافأة بعد **${formatTimeLeft(left)}**`, flags: MessageFlags.Ephemeral });
        }

        const streak = (userData.dailyStreak || 0) + 1;
        const bonus = Math.min(streak * (config.streakBonus || 100), config.maxStreakBonus || 5000);
        const amount = (config.dailyAmount || 500) + bonus;

        db.updateFields(userId, { balance: (userData.balance || 0) + amount, lastDaily: now, dailyStreak: streak });
        db.addTransaction(userId, 'daily', amount, `Daily Streak ${streak}`);

        const embed = new EmbedBuilder()
            .setColor('#FFD700')
            .setTitle('🎁 مكافأة يومية!')
            .setDescription([
                `تم إضافة **${amount.toLocaleString()} ${config.currency}** لمحفظتك! 💰`,
                '',
                `🔥 **Streak:** ${streak} يوم متتالٍ`,
                `⭐ **مكافأة الـ Streak:** +${bonus.toLocaleString()} ${config.currency}`,
                streak >= 7 ? '\n🏆 **مبروك! أسبوع متتالٍ!** (+خصم خاص قريبًا)' : '',
            ].join('\n'))
            .setTimestamp();

        await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });

        // تحديث اللوحة في نفس الوقت
        const panel = await buildMainPanel(userId, interaction.client);
        await interaction.message.edit({ ...panel }).catch(() => { });
        return;
    }

    // ── عمل ───────────────────────────────────────────────────
    if (action === 'eco_work') {
        const userData = db.getUserData(userId);
        const now = Date.now();
        const cooldown = config.workCooldown || 1800000;

        if (userData.lastWork && (now - userData.lastWork) < cooldown) {
            const left = cooldown - (now - userData.lastWork);
            return interaction.reply({ content: `⏰ يمكنك العمل بعد **${formatTimeLeft(left)}**`, flags: MessageFlags.Ephemeral });
        }

        const job = JOBS[Math.floor(Math.random() * JOBS.length)];
        const earned = Math.floor(Math.random() * (job.max - job.min + 1)) + job.min;

        db.updateFields(userId, { balance: (userData.balance || 0) + earned, lastWork: now });
        db.addTransaction(userId, 'work', earned, `Work: ${job.name}`);
        try { levels.addXP(userId, 3, interaction); } catch (_) { }

        const embed = new EmbedBuilder()
            .setColor('#00CED1')
            .setTitle(`${job.emoji} عمل ناجح!`)
            .setDescription([
                `عملت كـ **${job.name}** وكسبت **${earned.toLocaleString()} ${config.currency}**! 🎉`,
                '',
                `💰 **رصيدك الجديد:** ${((userData.balance || 0) + earned).toLocaleString()} ${config.currency}`,
            ].join('\n'))
            .setTimestamp();

        await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
        const panel = await buildMainPanel(userId, interaction.client);
        await interaction.message.edit({ ...panel }).catch(() => { });
        return;
    }

    // ── سرقة ──────────────────────────────────────────────────
    if (action === 'eco_rob') {
        const embed = new EmbedBuilder()
            .setColor('#E74C3C')
            .setTitle('🕵️ السرقة')
            .setDescription([
                'مَن تريد سرقته؟ **منشن الشخص** في قناة الشات وستُفعّل السرقة تلقائياً!',
                '',
                'مثال: `سرقة @اسم`',
                '',
                '⚠️ **احتمال النجاح: 40%**',
                '❌ **العقوبة عند الفشل: 10% من رصيدك**',
            ].join('\n'))
            .setTimestamp();

        return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    }

    // ── إيداع ─────────────────────────────────────────────────
    if (action === 'eco_deposit') {
        const modal = new ModalBuilder()
            .setCustomId('eco_deposit_modal')
            .setTitle('🏦 إيداع في البنك');

        const amountInput = new TextInputBuilder()
            .setCustomId('deposit_amount')
            .setLabel('المبلغ (أو اكتب: كامل / نصف / ربع)')
            .setPlaceholder('مثال: 1000  أو  كامل  أو  نصف')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        modal.addComponents(new ActionRowBuilder().addComponents(amountInput));
        return interaction.showModal(modal);
    }

    // ── سحب ───────────────────────────────────────────────────
    if (action === 'eco_withdraw') {
        const modal = new ModalBuilder()
            .setCustomId('eco_withdraw_modal')
            .setTitle('💵 سحب من البنك');

        const amountInput = new TextInputBuilder()
            .setCustomId('withdraw_amount')
            .setLabel('المبلغ (أو اكتب: كامل / نصف / ربع)')
            .setPlaceholder('مثال: 500  أو  كامل')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        modal.addComponents(new ActionRowBuilder().addComponents(amountInput));
        return interaction.showModal(modal);
    }

    // ── تحويل ─────────────────────────────────────────────────
    if (action === 'eco_transfer') {
        const modal = new ModalBuilder()
            .setCustomId('eco_transfer_modal')
            .setTitle('🔄 تحويل أموال');

        const userInput = new TextInputBuilder()
            .setCustomId('transfer_user_id')
            .setLabel('ID المستخدم المستلم')
            .setPlaceholder('الصق الـ ID هنا...')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        const amountInput = new TextInputBuilder()
            .setCustomId('transfer_amount')
            .setLabel('المبلغ')
            .setPlaceholder('مثال: 1000')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        modal.addComponents(
            new ActionRowBuilder().addComponents(userInput),
            new ActionRowBuilder().addComponents(amountInput)
        );
        return interaction.showModal(modal);
    }

    // ── سجل المعاملات ─────────────────────────────────────────
    if (action === 'eco_transactions') {
        const userData = db.getUserData(userId);
        const txs = (userData.transactions || []).slice(-10).reverse();

        const lines = txs.length === 0
            ? ['لا توجد معاملات بعد.']
            : txs.map((tx, i) => {
                const sign = tx.type === 'work' || tx.type === 'daily' || tx.type === 'deposit' ? '+' : '-';
                const emoji = tx.type === 'work' ? '💼' : tx.type === 'daily' ? '🎁' : tx.type === 'rob' ? '🕵️' : tx.type === 'deposit' ? '🏦' : tx.type === 'withdraw' ? '💵' : '💱';
                return `${emoji} **${tx.note || tx.type}** — ${sign}${(tx.amount || 0).toLocaleString()} ${config.currency}`;
            });

        const embed = new EmbedBuilder()
            .setColor('#9B59B6')
            .setTitle('📋 آخر 10 معاملات')
            .setDescription(lines.join('\n'))
            .setTimestamp();

        return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    }

    // ── لوحة المتصدرين ────────────────────────────────────────
    if (action === 'eco_leaderboard') {
        const allUsers = db.getAllUsers();
        const sorted = Object.entries(allUsers)
            .map(([id, d]) => ({ id, total: (d.balance || 0) + (d.bank || 0) }))
            .sort((a, b) => b.total - a.total)
            .slice(0, 10);

        const lines = await Promise.all(sorted.map(async (u, i) => {
            const user = await interaction.client.users.fetch(u.id).catch(() => ({ username: 'مجهول' }));
            const medal = ['🥇', '🥈', '🥉'][i] || `${i + 1}.`;
            return `${medal} **${user.username}** — ${u.total.toLocaleString()} ${config.currency}`;
        }));

        const embed = new EmbedBuilder()
            .setColor('#FFD700')
            .setTitle('🏆 قائمة أثرياء السيرفر')
            .setDescription(lines.join('\n'))
            .setTimestamp();

        return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    }

    // ── عرض الخزنة الشخصية ────────────────────────────────────
    if (action === 'eco_vault') {
        const userData = db.getUserData(userId);
        if (!userData.inventory?.vault && !(userData.vaultCap > 0)) {
            return interaction.reply({
                embeds: [new EmbedBuilder()
                    .setColor('#E74C3C')
                    .setTitle('🔐 لا تملك خزنة شخصية')
                    .setDescription('اشترِ **🏦 خزنة شخصية** من المتجر (قسم VIP) بـ **8,000** عملة.\n\nأكتب `متجر` أو اضغط زر **المتجر** للشراء.')
                ],
                flags: MessageFlags.Ephemeral
            });
        }

        const vaultBal = userData.vaultBalance || 0;
        const vaultCap = userData.vaultCap || 100000;
        const walletBal = userData.balance || 0;

        const embed = new EmbedBuilder()
            .setColor('#F1C40F')
            .setTitle('🔐 خزنتك الشخصية')
            .setDescription([
                '> مالك هنا **محمي تماماً** من السرقة.',
                '',
                `💰 **المحفظة:** \`${walletBal.toLocaleString()} ${config.currency}\``,
                `🔐 **الخزنة:** \`${vaultBal.toLocaleString()} / ${vaultCap.toLocaleString()} ${config.currency}\``,
                '',
                progressBar(vaultBal, vaultCap) + ` **${Math.floor((vaultBal / vaultCap) * 100)}%** ممتلئة`,
            ].join('\n'))
            .setTimestamp()
            .setFooter({ text: 'الخزنة آمنة 100% — لا أحد يسرق منها' });

        const vRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('eco_vault_deposit')
                .setLabel('إيداع في الخزنة 🔐')
                .setStyle(ButtonStyle.Success)
                .setDisabled(walletBal <= 0 || vaultBal >= vaultCap),
            new ButtonBuilder()
                .setCustomId('eco_vault_withdraw')
                .setLabel('سحب من الخزنة 💵')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(vaultBal <= 0),
            new ButtonBuilder()
                .setCustomId('eco_refresh')
                .setLabel('رجوع 🔙')
                .setStyle(ButtonStyle.Secondary)
        );

        return interaction.reply({ embeds: [embed], components: [vRow], flags: MessageFlags.Ephemeral });
    }

    // ── إيداع في الخزنة ───────────────────────────────────────
    if (action === 'eco_vault_deposit') {
        const modal = new ModalBuilder()
            .setCustomId('eco_vault_deposit_modal')
            .setTitle('🔐 إيداع في الخزنة الشخصية');
        modal.addComponents(new ActionRowBuilder().addComponents(
            new TextInputBuilder()
                .setCustomId('vault_deposit_amount')
                .setLabel('المبلغ (أو: كامل / نصف / ربع)')
                .setPlaceholder('مثال: 5000  أو  كامل')
                .setStyle(TextInputStyle.Short)
                .setRequired(true)
        ));
        return interaction.showModal(modal);
    }

    // ── سحب من الخزنة ─────────────────────────────────────────
    if (action === 'eco_vault_withdraw') {
        const modal = new ModalBuilder()
            .setCustomId('eco_vault_withdraw_modal')
            .setTitle('🔐 سحب من الخزنة الشخصية');
        modal.addComponents(new ActionRowBuilder().addComponents(
            new TextInputBuilder()
                .setCustomId('vault_withdraw_amount')
                .setLabel('المبلغ (أو: كامل / نصف / ربع)')
                .setPlaceholder('مثال: 2000  أو  كامل')
                .setStyle(TextInputStyle.Short)
                .setRequired(true)
        ));
        return interaction.showModal(modal);
    }

    // ── المتجر ────────────────────────────────────────────────
    if (action === 'eco_shop') {
        const shopModule = require('../economy/shop');
        const panel = shopModule.buildMainShop(userId);
        return interaction.reply({ ...panel, flags: MessageFlags.Ephemeral });
    }
}

// ═══════════════════════════════════════════════════════════
// معالج المودالز
// ═══════════════════════════════════════════════════════════
async function handleEcoModal(interaction) {
    const userId = interaction.user.id;
    const id = interaction.customId;

    // ── إيداع ─────────────────────────────────────────────────
    if (id === 'eco_deposit_modal') {
        const userData = db.getUserData(userId);
        const bal = userData.balance || 0;
        const input = interaction.fields.getTextInputValue('deposit_amount').trim().toLowerCase();

        let amount = parseAmount(input, bal);
        if (!amount || amount <= 0) return interaction.reply({ content: '❌ مبلغ غير صحيح!', flags: MessageFlags.Ephemeral });
        if (amount > bal) return interaction.reply({ content: `❌ رصيدك في المحفظة: **${bal.toLocaleString()}** فقط!`, flags: MessageFlags.Ephemeral });

        db.updateFields(userId, { balance: bal - amount, bank: (userData.bank || 0) + amount });
        db.addTransaction(userId, 'deposit', amount, 'Bank Deposit');

        const embed = bankEmbed('🏦 إيداع ناجح', `تم إيداع **${amount.toLocaleString()} ${config.currency}** في البنك!`, bal - amount, (userData.bank || 0) + amount);
        await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
        const panel = await buildMainPanel(userId, interaction.client);
        await interaction.message.edit({ ...panel }).catch(() => { });
        return;
    }

    // ── سحب ───────────────────────────────────────────────────
    if (id === 'eco_withdraw_modal') {
        const userData = db.getUserData(userId);
        const bank = userData.bank || 0;
        const input = interaction.fields.getTextInputValue('withdraw_amount').trim().toLowerCase();

        let amount = parseAmount(input, bank);
        if (!amount || amount <= 0) return interaction.reply({ content: '❌ مبلغ غير صحيح!', flags: MessageFlags.Ephemeral });
        if (amount > bank) return interaction.reply({ content: `❌ رصيد البنك: **${bank.toLocaleString()}** فقط!`, flags: MessageFlags.Ephemeral });

        db.updateFields(userId, { balance: (userData.balance || 0) + amount, bank: bank - amount });
        db.addTransaction(userId, 'withdraw', amount, 'Bank Withdraw');

        const embed = bankEmbed('💵 سحب ناجح', `تم سحب **${amount.toLocaleString()} ${config.currency}** إلى محفظتك!`, (userData.balance || 0) + amount, bank - amount);
        await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
        const panel = await buildMainPanel(userId, interaction.client);
        await interaction.message.edit({ ...panel }).catch(() => { });
        return;
    }

    // ── إيداع في الخزنة الشخصية ───────────────────────────────
    if (id === 'eco_vault_deposit_modal') {
        const userData = db.getUserData(userId);
        const walletBal = userData.balance || 0;
        const vaultBal = userData.vaultBalance || 0;
        const vaultCap = userData.vaultCap || 100000;
        const space = vaultCap - vaultBal;

        if (space <= 0) return interaction.reply({ content: '❌ الخزنة ممتلئة!', flags: MessageFlags.Ephemeral });

        const input = interaction.fields.getTextInputValue('vault_deposit_amount').trim().toLowerCase();
        let amount = parseAmount(input, Math.min(walletBal, space));

        if (!amount || amount <= 0) return interaction.reply({ content: '❌ مبلغ غير صحيح!', flags: MessageFlags.Ephemeral });
        if (amount > walletBal) return interaction.reply({ content: `❌ محفظتك فيها **${walletBal.toLocaleString()}** فقط!`, flags: MessageFlags.Ephemeral });
        if (amount > space) {
            amount = space;
        }

        db.updateFields(userId, {
            balance: walletBal - amount,
            vaultBalance: vaultBal + amount
        });
        db.addTransaction(userId, 'vault_deposit', amount, 'Vault Deposit');

        const embed = new EmbedBuilder()
            .setColor('#F1C40F')
            .setTitle('🔐 إيداع في الخزنة')
            .setDescription(`تم إيداع **${amount.toLocaleString()} ${config.currency}** في خزنتك الشخصية! ✅`)
            .addFields(
                { name: '💰 المحفظة', value: `${(walletBal - amount).toLocaleString()} ${config.currency}`, inline: true },
                { name: '🔐 الخزنة', value: `${(vaultBal + amount).toLocaleString()} / ${vaultCap.toLocaleString()} ${config.currency}`, inline: true }
            ).setTimestamp();

        await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
        const panel = await buildMainPanel(userId, interaction.client);
        await interaction.message.edit({ ...panel }).catch(() => { });
        return;
    }

    // ── سحب من الخزنة الشخصية ─────────────────────────────────
    if (id === 'eco_vault_withdraw_modal') {
        const userData = db.getUserData(userId);
        const vaultBal = userData.vaultBalance || 0;
        const input = interaction.fields.getTextInputValue('vault_withdraw_amount').trim().toLowerCase();
        const amount = parseAmount(input, vaultBal);

        if (!amount || amount <= 0) return interaction.reply({ content: '❌ مبلغ غير صحيح!', flags: MessageFlags.Ephemeral });
        if (amount > vaultBal) return interaction.reply({ content: `❌ خزنتك فيها **${vaultBal.toLocaleString()}** فقط!`, flags: MessageFlags.Ephemeral });

        db.updateFields(userId, {
            balance: (userData.balance || 0) + amount,
            vaultBalance: vaultBal - amount
        });
        db.addTransaction(userId, 'vault_withdraw', amount, 'Vault Withdraw');

        const embed = new EmbedBuilder()
            .setColor('#3498DB')
            .setTitle('🔐 سحب من الخزنة')
            .setDescription(`تم سحب **${amount.toLocaleString()} ${config.currency}** من خزنتك إلى محفظتك! ✅`)
            .addFields(
                { name: '💰 المحفظة', value: `${((userData.balance || 0) + amount).toLocaleString()} ${config.currency}`, inline: true },
                { name: '🔐 الخزنة', value: `${(vaultBal - amount).toLocaleString()} ${config.currency}`, inline: true }
            ).setTimestamp();

        await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
        const panel = await buildMainPanel(userId, interaction.client);
        await interaction.message.edit({ ...panel }).catch(() => { });
        return;
    }

    // ── تحويل ─────────────────────────────────────────────────
    if (id === 'eco_transfer_modal') {
        const userData = db.getUserData(userId);
        const targetId = interaction.fields.getTextInputValue('transfer_user_id').trim().replace(/\D/g, '');
        const input = interaction.fields.getTextInputValue('transfer_amount').trim().toLowerCase();
        const amount = parseAmount(input, userData.balance || 0);

        if (!targetId || targetId === userId) return interaction.reply({ content: '❌ ID غير صحيح!', flags: MessageFlags.Ephemeral });
        if (!amount || amount <= 0) return interaction.reply({ content: '❌ مبلغ غير صحيح!', flags: MessageFlags.Ephemeral });
        if (amount > (userData.balance || 0)) return interaction.reply({ content: `❌ رصيدك لا يكفي! محفظتك: **${(userData.balance || 0).toLocaleString()}**`, flags: MessageFlags.Ephemeral });

        const targetUser = await interaction.client.users.fetch(targetId).catch(() => null);
        if (!targetUser) return interaction.reply({ content: '❌ المستخدم غير موجود!', flags: MessageFlags.Ephemeral });

        db.removeMoney(userId, amount);
        db.addMoney(targetId, amount);
        db.addTransaction(userId, 'transfer_out', amount, `To: ${targetUser.username}`);
        db.addTransaction(targetId, 'transfer_in', amount, `From: ${interaction.user.username}`);

        const embed = new EmbedBuilder()
            .setColor('#27AE60')
            .setTitle('🔄 تحويل ناجح!')
            .setDescription(`تم تحويل **${amount.toLocaleString()} ${config.currency}** إلى **${targetUser.username}**!`)
            .setTimestamp();

        await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
        const panel = await buildMainPanel(userId, interaction.client);
        await interaction.message.edit({ ...panel }).catch(() => { });
        return;
    }
}

// ═══════════════════════════════════════════════════════════
// دوال مساعدة
// ═══════════════════════════════════════════════════════════
function parseAmount(input, max) {
    if (input === 'كامل' || input === 'all') return max;
    if (input === 'نصف' || input === 'half') return Math.floor(max / 2);
    if (input === 'ربع' || input === 'quarter') return Math.floor(max / 4);
    if (input === 'ثلث' || input === 'third') return Math.floor(max / 3);
    const n = Number(input.replace(/,/g, ''));
    if (isNaN(n) || !Number.isFinite(n) || n <= 0 || n % 1 !== 0) return null;
    return n;
}

function bankEmbed(title, desc, bal, bank) {
    return new EmbedBuilder()
        .setColor('#3498DB')
        .setTitle(title)
        .setDescription(desc)
        .addFields(
            { name: '💰 المحفظة', value: `${bal.toLocaleString()} ${config.currency}`, inline: true },
            { name: '🏦 البنك', value: `${bank.toLocaleString()} ${config.currency}`, inline: true }
        )
        .setTimestamp();
}

// ═══════════════════════════════════════════════════════════
// الأمر الرئيسي
// ═══════════════════════════════════════════════════════════
module.exports = {
    name: 'economy',
    aliases: ['اقتصاد', 'رصيد', 'فلوس', 'محفظة', 'bal', 'money', 'eco'],
    description: 'لوحة الاقتصاد الكاملة — بالأزرار',
    usage: 'اقتصاد / رصيد',

    async execute(context, args) {
        const userId = context.isCommand?.() ? context.user?.id : context.author?.id;
        if (!userId) return;
        const panel = await buildMainPanel(userId, context.client);
        await context.reply({ ...panel }).catch(() => { });
    },

    handleEcoButton,
    handleEcoModal,
    buildMainPanel,
};
