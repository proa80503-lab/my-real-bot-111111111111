/**
 * ═══════════════════════════════════════════════════════════
 * 🛒 متجر السيرفر — Shop Module 
 *
 * ═══════════════════════════════════════════════════════════
 */

'use strict';

const {
    ActionRowBuilder, ButtonBuilder, ButtonStyle,
    EmbedBuilder, MessageFlags
} = require('discord.js');

const db = require('../../utils/database');
const config = require('../../config');

// ═══════════════════════════════════════════════════════════
// 📦 كتالوج المتجر
// ═══════════════════════════════════════════════════════════
const PAGES = {
    tools: {
        label: '🎒 الأدوات',
        color: '#3498DB',
        items: [
            { id: 'shield', name: '🛡️ درع الحماية', price: 500, desc: 'يمنع السرقة منك لـ24 ساعة', multi: true },
            { id: 'luckpotion', name: '🍀 جرعة الحظ', price: 300, desc: 'احتمال سرقة 60% لساعة', multi: true },
            { id: 'xpboost', name: '⚡ مضاعف XP', price: 400, desc: 'يضاعف XP لساعتين', multi: true },
            { id: 'moneybag', name: '💰 كيس المال', price: 1000, desc: '+1200~1800 عملة (كولداون: ساعة)', multi: true },
            { id: 'rob_kit', name: '🕵️ طقم السرقة', price: 800, desc: '3 محاولات سرقة إضافية', multi: true },
            { id: 'cooldown_reset', name: '⏩ إعادة Cooldown', price: 700, desc: 'يصفر cooldown العمل (مرة/يوم)', multi: true },
        ]
    },
    upgrades: {
        label: '⬆️ الترقيات',
        color: '#9B59B6',
        items: [
            { id: 'xp500', name: '💫 حزمة XP صغيرة', price: 500, desc: '+500 XP فوراً', multi: true },
            { id: 'xp2000', name: '🌟 حزمة XP كبيرة', price: 1500, desc: '+2000 XP فوراً', multi: true },
            { id: 'daily_boost', name: '🎁 مضاعف اليومي', price: 1200, desc: 'مكافأة يومية ×2 لـ3 أيام', multi: true },
            { id: 'streak_protect', name: '🔒 حماية Streak', price: 900, desc: 'احتفظ بـ Streak لو نسيت', multi: true },
            { id: 'bankextend', name: '🏦 توسّع البنك', price: 2000, desc: '+50,000 حد بنك (دائم)', multi: true },
            { id: 'xp5000', name: '🚀 حزمة XP عملاقة', price: 3000, desc: '+5000 XP فوراً', multi: true },
        ]
    },
    vip: {
        label: '👑 VIP',
        color: '#FFD700',
        items: [
            { id: 'vip_badge', name: '👑 شارة VIP', price: 5000, desc: 'شارة دائمة بجانب اسمك', multi: false },
            { id: 'vault', name: '🏦 خزنة شخصية', price: 8000, desc: 'مال مخزون لا يُسرق أبداً', multi: false },
            { id: 'jackpot_ticket', name: '🎰 تذكرة جاكبوت', price: 2500, desc: 'أدخل السحب الأسبوعي', multi: true },
            { id: 'rob_immunity', name: '⚔️ مناعة السرقة', price: 10000, desc: 'لا أحد يسرقك أبداً (دائم)', multi: false },
        ]
    }
};

// جميع العناصر في map
const ALL_ITEMS = {};
for (const [pageKey, page] of Object.entries(PAGES)) {
    for (const item of page.items) {
        ALL_ITEMS[item.id] = { ...item, pageKey };
    }
}

// ─────────────────────────────────────────────
// بناء رسالة القسم
// ─────────────────────────────────────────────
function buildPageMsg(pageKey, userId) {
    const page = PAGES[pageKey];
    const userData = db.getUserData(userId);
    const balance = userData.balance || 0;
    const inv = userData.inventory || {};
    const now = Date.now();

    // Embed
    const lines = page.items.map((item, i) => {
        const owned = inv[item.id] && !item.multi;
        const afford = balance >= item.price;
        // تحقق خاص من كولداون كيس المال
        const onCooldown = item.id === 'moneybag' && userData.lastMoneybag
            && (now - userData.lastMoneybag) < (config.moneybagCooldown || 3600000);
        const cdReset = item.id === 'cooldown_reset' && userData.lastCooldownReset
            && (now - userData.lastCooldownReset) < (config.cooldownResetCooldown || 86400000);
        const unavailable = owned || onCooldown || cdReset;
        const status = owned ? ' ✅ تملكه'
            : onCooldown ? ` ⏳ متاح بعد ${Math.ceil(((config.moneybagCooldown || 3600000) - (now - userData.lastMoneybag)) / 60000)} دقيقة`
            : cdReset ? ` ⏳ متاح بعد ${Math.ceil(((config.cooldownResetCooldown || 86400000) - (now - userData.lastCooldownReset)) / 3600000)} ساعة`
            : !afford ? ' ❌ رصيد قليل' : '';
        return `**${i + 1}. ${item.name}** — \`${item.price.toLocaleString()} ${config.currency}\`${status}\n> ${item.desc}`;
    });

    const embed = new EmbedBuilder()
        .setColor(page.color)
        .setTitle(page.label)
        .setDescription(lines.join('\n\n'))
        .addFields({
            name: '💰 رصيدك الحالي',
            value: `محفظة: **${balance.toLocaleString()}** | بنك: **${(userData.bank || 0).toLocaleString()}** ${config.currency}`,
            inline: false
        })
        .setFooter({ text: 'اضغط "شراء" بجانب العنصر الذي تريده' })
        .setTimestamp();

    // أزرار الشراء — صفين (3 في كل صف)
    const buyRows = [];
    const chunks = [];
    for (let i = 0; i < page.items.length; i += 3) chunks.push(page.items.slice(i, i + 3));

    for (const chunk of chunks) {
        const row = new ActionRowBuilder();
        for (const item of chunk) {
            const owned = inv[item.id] && !item.multi;
            const afford = balance >= item.price;
            const onCooldown = item.id === 'moneybag' && userData.lastMoneybag
                && (now - userData.lastMoneybag) < (config.moneybagCooldown || 3600000);
            const cdReset = item.id === 'cooldown_reset' && userData.lastCooldownReset
                && (now - userData.lastCooldownReset) < (config.cooldownResetCooldown || 86400000);
            const disabled = owned || onCooldown || cdReset || !afford;
            row.addComponents(
                new ButtonBuilder()
                    .setCustomId(`sbuy_${item.id}`)
                    .setLabel(`${item.name.replace(/[^\w\u0600-\u06FF\s]/g, '')} ${item.price.toLocaleString()}`.trim().slice(0, 80))
                    .setStyle(owned ? ButtonStyle.Secondary : afford && !onCooldown && !cdReset ? ButtonStyle.Success : ButtonStyle.Secondary)
                    .setDisabled(disabled)
            );
        }
        buyRows.push(row);
    }

    // صف التنقل
    const navRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('shop_page_tools').setLabel('🎒 الأدوات').setStyle(pageKey === 'tools' ? ButtonStyle.Primary : ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('shop_page_upgrades').setLabel('⬆️ ترقيات').setStyle(pageKey === 'upgrades' ? ButtonStyle.Primary : ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('shop_page_vip').setLabel('👑 VIP').setStyle(pageKey === 'vip' ? ButtonStyle.Danger : ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('shop_inv').setLabel('🎒 حقيبتي').setStyle(ButtonStyle.Secondary)
    );

    buyRows.push(navRow);
    return { embeds: [embed], components: buyRows };
}

// ─────────────────────────────────────────────
// معالج الشراء — مُصلَّح ومحمي من الثغرات
// ─────────────────────────────────────────────
async function buy(interaction, itemId) {
    const userId = interaction.user.id;

    // إعادة قراءة البيانات بعد كل عملية (منع الـ race condition)
    const userData = db.getUserData(userId);
    const balance = userData.balance || 0;
    const inv = userData.inventory || {};
    const item = ALL_ITEMS[itemId];
    const now = Date.now();

    if (!item) return interaction.reply({ content: '❌ عنصر غير موجود!', flags: MessageFlags.Ephemeral });

    // ── فحص الرصيد
    if (balance < item.price) {
        return interaction.reply({
            content: `❌ رصيدك **${balance.toLocaleString()}** والعنصر يكلف **${item.price.toLocaleString()}** ${config.currency}!`,
            flags: MessageFlags.Ephemeral
        });
    }

    // ── فحص التملّك (للعناصر غير المتعددة)
    if (inv[itemId] && !item.multi) {
        return interaction.reply({ content: `⚠️ أنت تملك **${item.name}** بالفعل!`, flags: MessageFlags.Ephemeral });
    }

    // ── فحص كولداون كيس المال (ثغرة مالية)
    if (itemId === 'moneybag') {
        const cd = config.moneybagCooldown || 3600000;
        if (userData.lastMoneybag && (now - userData.lastMoneybag) < cd) {
            const mins = Math.ceil((cd - (now - userData.lastMoneybag)) / 60000);
            return interaction.reply({
                content: `⏳ يمكنك شراء كيس المال مرة أخرى بعد **${mins} دقيقة**!`,
                flags: MessageFlags.Ephemeral
            });
        }
    }

    // ── فحص كولداون إعادة Cooldown (ثغرة استغلال)
    if (itemId === 'cooldown_reset') {
        const cd = config.cooldownResetCooldown || 86400000;
        if (userData.lastCooldownReset && (now - userData.lastCooldownReset) < cd) {
            const hrs = Math.ceil((cd - (now - userData.lastCooldownReset)) / 3600000);
            return interaction.reply({
                content: `⏳ يمكنك استخدام إعادة Cooldown مرة أخرى بعد **${hrs} ساعة**!`,
                flags: MessageFlags.Ephemeral
            });
        }
    }

    // ── خصم الرصيد أولاً (atomic)
    const removed = db.removeMoney(userId, item.price);
    if (!removed) {
        return interaction.reply({ content: '❌ رصيدك لا يكفي!', flags: MessageFlags.Ephemeral });
    }
    db.addTransaction(userId, 'shop_buy', item.price, `Shop: ${item.name}`);

    // ── تطبيق التأثير
    const updates = { inventory: { ...inv } };
    let resultMsg = '';

    switch (itemId) {
        case 'shield':
            updates.robShieldUntil = now + 86400000;
            updates.inventory[itemId] = { expiresAt: now + 86400000 };
            resultMsg = '🛡️ أنت محمي من السرقة لـ 24 ساعة!';
            break;

        case 'luckpotion':
            updates.luckBoostUntil = now + 3600000;
            updates.inventory[itemId] = { expiresAt: now + 3600000 };
            resultMsg = '🍀 احتمال سرقتك أصبح 60% لساعة!';
            break;

        case 'xpboost':
            updates.xpBoostUntil = now + 7200000;
            updates.inventory[itemId] = { expiresAt: now + 7200000 };
            resultMsg = '⚡ XP مضاعف لساعتين!';
            break;

        case 'moneybag': {
            // ثغرة مُصلَّحة: كولداون + مكاسب معقولة
            const cash = Math.floor(Math.random() * 601) + 1200;
            updates.lastMoneybag = now; // حفظ وقت الشراء
            db.addMoney(userId, cash);
            db.addTransaction(userId, 'shop_reward', cash, 'Money Bag');
            resultMsg = `💰 حصلت على **${cash.toLocaleString()}** ${config.currency} فوراً!`;
            break;
        }

        case 'rob_kit': {
            const maxCharges = 10; // حد أقصى للمحاولات
            const current = userData.robCharges || 0;
            if (current >= maxCharges) {
                // رد المال
                db.addMoney(userId, item.price);
                return interaction.reply({
                    content: `⚠️ لديك بالفعل **${current}** محاولة! استخدم ما عندك أولاً.`,
                    flags: MessageFlags.Ephemeral
                });
            }
            updates.robCharges = Math.min(current + 3, maxCharges);
            resultMsg = `🕵️ لديك الآن **${updates.robCharges}** محاولة سرقة إضافية!`;
            break;
        }

        case 'cooldown_reset':
            // ثغرة مُصلَّحة: كولداون على الأداة نفسها + إعادة cooldown العمل فقط
            updates.lastWork = 0;
            updates.lastCooldownReset = now; // منع إعادة الاستخدام
            resultMsg = '⏩ تم إعادة تعيين cooldown العمل! (يمكن استخدامها مرة كل 24 ساعة)';
            break;

        case 'xp500':
            updates.xp = (userData.xp || 0) + 500;
            resultMsg = '💫 تم إضافة **500 XP** لحسابك!';
            break;

        case 'xp2000':
            updates.xp = (userData.xp || 0) + 2000;
            resultMsg = '🌟 تم إضافة **2000 XP** لحسابك!';
            break;

        case 'daily_boost':
            // لا تكرار — التمديد فقط إذا كان موجوداً
            updates.dailyBoostUntil = Math.max(userData.dailyBoostUntil || 0, now) + 259200000;
            updates.inventory[itemId] = { expiresAt: updates.dailyBoostUntil };
            resultMsg = '🎁 مكافأة اليومي مضاعفة لـ3 أيام!';
            break;

        case 'streak_protect': {
            const maxShields = 3;
            if ((userData.streakShield || 0) >= maxShields) {
                db.addMoney(userId, item.price);
                return interaction.reply({
                    content: `⚠️ لديك **${userData.streakShield}** درع بالفعل! الحد الأقصى ${maxShields}.`,
                    flags: MessageFlags.Ephemeral
                });
            }
            updates.streakShield = (userData.streakShield || 0) + 1;
            resultMsg = `🔒 لديك **${updates.streakShield}** حماية Streak!`;
            break;
        }

        case 'bankextend': {
            const maxExtensions = 5; // 5 مرات × 50,000 = 250,000 حد إضافي
            const currentExtensions = userData.bankExtensions || 0;
            if (currentExtensions >= maxExtensions) {
                db.addMoney(userId, item.price);
                return interaction.reply({
                    content: `⚠️ وصلت للحد الأقصى لتوسيع البنك (${maxExtensions} مرات)!`,
                    flags: MessageFlags.Ephemeral
                });
            }
            updates.bankCap = (userData.bankCap || 0) + 50000;
            updates.bankExtensions = currentExtensions + 1;
            updates.inventory[itemId] = { extensions: updates.bankExtensions };
            resultMsg = `🏦 حد البنك أصبح +**${updates.bankCap.toLocaleString()}** ${config.currency}! (${updates.bankExtensions}/${maxExtensions})`;
            break;
        }

        case 'xp5000':
            updates.xp = (userData.xp || 0) + 5000;
            resultMsg = '🚀 تم إضافة **5000 XP** لحسابك!';
            break;

        case 'vip_badge':
            updates.vipBadge = true;
            updates.inventory[itemId] = true;
            resultMsg = '👑 أنت الآن VIP! الشارة ظاهرة بجانب اسمك.';
            break;

        case 'vault':
            updates.vaultCap = (userData.vaultCap || 0) + 100000;
            updates.inventory[itemId] = true;
            resultMsg = '🏦 الخزنة الشخصية جاهزة! مالك فيها محمي.';
            break;

        case 'jackpot_ticket': {
            const maxTickets = 20;
            if ((userData.jackpotTickets || 0) >= maxTickets) {
                db.addMoney(userId, item.price);
                return interaction.reply({
                    content: `⚠️ لديك **${userData.jackpotTickets}** تذكرة! الحد الأقصى ${maxTickets} تذكرة.`,
                    flags: MessageFlags.Ephemeral
                });
            }
            updates.jackpotTickets = (userData.jackpotTickets || 0) + 1;
            resultMsg = `🎰 لديك الآن **${updates.jackpotTickets}** تذكرة في السحب الأسبوعي!`;
            break;
        }

        case 'rob_immunity':
            updates.robImmunity = true;
            updates.inventory[itemId] = true;
            resultMsg = '⚔️ مناعة دائمة! لا أحد يستطيع سرقتك.';
            break;

        default:
            resultMsg = '✅ تم الشراء بنجاح!';
    }

    db.updateFields(userId, updates);

    const newBal = (db.getUserData(userId).balance || 0);
    const embed = new EmbedBuilder()
        .setColor('#2ECC71')
        .setTitle('✅ تم الشراء!')
        .setDescription(`اشتريت **${item.name}**\n\n${resultMsg}\n\n💰 رصيدك الآن: **${newBal.toLocaleString()}** ${config.currency}`)
        .setTimestamp();

    const components = [];
    if (itemId === 'vault') {
        components.push(new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('eco_vault').setLabel('فتح خزنتي الآن 🔐').setStyle(ButtonStyle.Success)
        ));
    }

    await interaction.reply({ embeds: [embed], components, flags: MessageFlags.Ephemeral });

    // تحديث رسالة المتجر
    try {
        const newPage = buildPageMsg(item.pageKey, userId);
        await interaction.message.edit({ ...newPage });
    } catch (_) { }
}

// ─────────────────────────────────────────────
// معالج الحقيبة
// ─────────────────────────────────────────────
function buildInventory(userId) {
    const userData = db.getUserData(userId);
    const inv = userData.inventory || {};
    const now = Date.now();
    const lines = [];

    for (const [id, data] of Object.entries(inv)) {
        const item = ALL_ITEMS[id];
        if (!item) continue;
        if (data?.expiresAt && now > data.expiresAt) continue;
        const timeLeft = data?.expiresAt
            ? `⏳ ${Math.ceil((data.expiresAt - now) / 3600000)}س متبقية`
            : '♾️ دائم';
        lines.push(`${item.name} — ${timeLeft}`);
    }

    if (userData.vipBadge) lines.push('👑 شارة VIP — ♾️ دائم');
    if (userData.robImmunity) lines.push('⚔️ مناعة السرقة — ♾️ دائم');
    if (userData.bankCap) lines.push(`🏦 توسّع البنك — حد +${userData.bankCap.toLocaleString()} ${config.currency}`);
    if (userData.robCharges) lines.push(`🕵️ محاولات سرقة — ${userData.robCharges} متبقية`);
    if (userData.jackpotTickets) lines.push(`🎰 تذاكر جاكبوت — ${userData.jackpotTickets}`);
    if (userData.streakShield) lines.push(`🔒 حماية Streak — ${userData.streakShield} استخدام`);

    const embed = new EmbedBuilder()
        .setColor('#9B59B6')
        .setTitle('🎒 حقيبتك')
        .setDescription(lines.length > 0 ? lines.join('\n') : 'حقيبتك فارغة! اذهب للمتجر وأنفق 🛒')
        .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('shop_page_tools').setLabel('↩️ رجوع للمتجر').setStyle(ButtonStyle.Secondary)
    );

    return { embeds: [embed], components: [row] };
}

// ═══════════════════════════════════════════════════════════
// معالج أزرار المتجر الكامل
// ═══════════════════════════════════════════════════════════
async function handleShopButton(interaction) {
    const id = interaction.customId;
    const userId = interaction.user.id;

    // تبديل القسم
    if (id.startsWith('shop_page_')) {
        const pageKey = id.replace('shop_page_', '');
        if (!PAGES[pageKey]) return interaction.reply({ content: '❌ قسم غير موجود.', flags: MessageFlags.Ephemeral });
        const msg = buildPageMsg(pageKey, userId);
        if (interaction.message) return interaction.update({ ...msg });
        return interaction.reply({ ...msg });
    }

    // حقيبة
    if (id === 'shop_inv') {
        const inv = buildInventory(userId);
        if (interaction.message) return interaction.update({ ...inv });
        return interaction.reply({ ...inv });
    }

    // شراء عنصر
    if (id.startsWith('sbuy_')) {
        const itemId = id.replace('sbuy_', '');
        return buy(interaction, itemId);
    }

    // توافقية مع الأزرار القديمة
    if (id.startsWith('buy_')) return buy(interaction, id.replace('buy_', ''));
}

// ═══════════════════════════════════════════════════════════
// واجهة المتجر الرئيسية
// ═══════════════════════════════════════════════════════════
function buildMainShop(userId) {
    return buildPageMsg('tools', userId);
}

// ═══════════════════════════════════════════════════════════
// الأمر
// ═══════════════════════════════════════════════════════════
module.exports = {
    name: 'shop',
    aliases: ['متجر', 'شوب', 'store', ],
    description: 'متجر السيرفر الكامل',
    usage: 'متجر',

    async execute(context) {
        const userId = context.user?.id ?? context.author?.id;
        if (!userId) return;
        const msg = buildMainShop(userId);
        return context.reply({ ...msg }).catch(() => { });
    },

    handleShopButton,
    buildMainShop,
    PAGES,
    ALL_ITEMS,
};
