/**
 * ═══════════════════════════════════════════════════════════
 * 🛒 متجر السيرفر المطور — Advanced Shop System v4.0
 * 
 * ✨ شراء مباشر وفوري بدون ثغرات أو تدبيل أموال
 * 💎 دعم الأزرار والقوائم والتصفح والشراء المباشر بالأوامر
 * 🏰 تحديث فوري للممتلكات والحقيبة والعقارات
 * 🔒 حماية ذرية (Atomic Transactions & Anti-Race Condition)
 * ═══════════════════════════════════════════════════════════
 */

'use strict';

const {
    ActionRowBuilder, ButtonBuilder, ButtonStyle,
    EmbedBuilder, MessageFlags, StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder
} = require('discord.js');

const db = require('../../utils/database');
const config = require('../../config');

// ─── فئات المتجر المنظمة ───────────────────────────────────────────────────────
const CATEGORIES = {
    electronics: {
        label: '📱 الأجهزة والإلكترونيات',
        shortLabel: '📱 الإلكترونيات',
        emoji: '💻',
        description: 'هواتف ذكية، لابتوبات ومعدات تقنية حديثة',
        items: ['smartphone', 'laptop']
    },
    vehicles: {
        label: '🏎️ المركبات الفاخرة',
        shortLabel: '🏎️ المركبات',
        emoji: '🏎️',
        description: 'سيارات رياضية سريعة، يخوت فخمة، طائرات خاصة',
        items: ['sport_car', 'yacht', 'private_jet']
    },
    realestate: {
        label: '🏰 العقارات والقصور',
        shortLabel: '🏰 العقارات',
        emoji: '🏡',
        description: 'فلل فاخرة مع مسابح، قصور ضخمة، جزر خاصة',
        items: ['villa', 'mansion', 'private_island']
    },
    tools: {
        label: '🛡️ الأدوات والحماية',
        shortLabel: '🛡️ الحماية',
        emoji: '🛡️',
        description: 'دروع حماية ضد السرقة، حصانة دائمة، شارات VIP',
        items: ['shield', 'vip_badge', 'rob_immunity']
    },
    upgrades: {
        label: '⬆️ الترقيات والخزن',
        shortLabel: '⬆️ الترقيات',
        emoji: '✨',
        description: 'توسعة البنك، خزن شخصية ضد السرقة، مضاعف الخبرة',
        items: ['bankextend', 'vault', 'xp_boost_large']
    }
};

// ─── قفل العمليات المتزامنة لمنع السبام والثغرات (Anti-Race Condition) ────────
const activePurchases = new Set();

// ─── محرك البحث والتعرف على العناصر ──────────────────────────────────────────
function findItem(query) {
    if (!query) return null;
    const q = query.trim().toLowerCase();

    // 1. فحص معرّف العنصر المباشر (Direct ID)
    if (config.shopItems && config.shopItems[q]) {
        return { id: q, item: config.shopItems[q] };
    }

    // 2. خريطة الأسماء والمرادفات الشائعة
    const aliasMap = {
        'هاتف': 'smartphone', 'تلفون': 'smartphone', 'جوال': 'smartphone', 'موبايل': 'smartphone', 'هاتف ذكي': 'smartphone', 'phone': 'smartphone',
        'لابتوب': 'laptop', 'حاسوب': 'laptop', 'كمبيوتر': 'laptop', 'لابتوب ألعاب': 'laptop', 'laptop': 'laptop',
        'سيارة': 'sport_car', 'سياره': 'sport_car', 'سيارة رياضية': 'sport_car', 'فيراري': 'sport_car', 'لمبرجيني': 'sport_car', 'car': 'sport_car',
        'يخت': 'yacht', 'يخت فاخر': 'yacht', 'سفينة': 'yacht', 'سفينه': 'yacht', 'yacht': 'yacht',
        'طائرة': 'private_jet', 'طيارة': 'private_jet', 'طياره': 'private_jet', 'طائرة خاصة': 'private_jet', 'jet': 'private_jet',
        'فيلا': 'villa', 'فيلا فاخرة': 'villa', 'منزل': 'villa', 'بيت': 'villa', 'villa': 'villa',
        'قصر': 'mansion', 'قصر فخم': 'mansion', 'mansion': 'mansion',
        'جزيرة': 'private_island', 'جزيره': 'private_island', 'جزيرة خاصة': 'private_island', 'island': 'private_island',
        'درع': 'shield', 'درع معدني': 'shield', 'حماية': 'shield', 'حمايه': 'shield', 'shield': 'shield',
        'vip': 'vip_badge', 'شارة': 'vip_badge', 'رتبة': 'vip_badge', 'شارة vip': 'vip_badge', 'شارة في اي بي': 'vip_badge',
        'حصانة': 'rob_immunity', 'حصانه': 'rob_immunity', 'حصانة دائمة': 'rob_immunity', 'منيع': 'rob_immunity', 'immunity': 'rob_immunity',
        'توسعة': 'bankextend', 'توسيع': 'bankextend', 'توسعة البنك': 'bankextend', 'توسيع البنك': 'bankextend', 'bankextend': 'bankextend',
        'خزنة': 'vault', 'خزنه': 'vault', 'خزنة شخصية': 'vault', 'خزنة سرية': 'vault', 'vault': 'vault',
        'خبرة': 'xp_boost_large', 'خبره': 'xp_boost_large', 'اكس بي': 'xp_boost_large', 'مضاعف': 'xp_boost_large', 'مضاعف الخبرة': 'xp_boost_large', 'xp': 'xp_boost_large'
    };

    if (aliasMap[q] && config.shopItems[aliasMap[q]]) {
        const id = aliasMap[q];
        return { id, item: config.shopItems[id] };
    }

    // 3. الترقيم الرقمي (1، 2، 3 ...)
    const allKeys = Object.keys(config.shopItems || {});
    const num = parseInt(q, 10);
    if (!isNaN(num) && num >= 1 && num <= allKeys.length) {
        const id = allKeys[num - 1];
        return { id, item: config.shopItems[id] };
    }

    // 4. مطابقة الاسم الجزئي
    for (const [id, item] of Object.entries(config.shopItems || {})) {
        if (item.name.toLowerCase().includes(q) || id.toLowerCase().includes(q)) {
            return { id, item };
        }
    }

    return null;
}

// ─── تنفيذ عملية الشراء الذرية والمحمية ────────────────────────────────────────
async function executePurchase(userId, itemId) {
    const item = config.shopItems ? config.shopItems[itemId] : null;
    if (!item) {
        return { success: false, error: '❌ هذا الغرض غير متوفر في المتجر!' };
    }

    // قفل المستخدم لمنع التكرار المتزامن أو التدبيل
    if (activePurchases.has(userId)) {
        return { success: false, error: '⏳ جاري معالجة عملية شراء لك بالفعل، يرجى الانتظار ثانية...' };
    }

    activePurchases.add(userId);
    try {
        const now = Date.now();
        const userData = db.getUserData(userId);
        const balance = userData.balance || 0;
        const inv = userData.inventory || {};

        // 1. التحقق من كفاية الرصيد
        if (balance < item.price) {
            return {
                success: false,
                error: `❌ رصيدك الحالي (**${balance.toLocaleString()}** ${config.currency}) لا يكفي لشراء **${item.name}**!\n> السعر المطلوب: **${item.price.toLocaleString()}** ${config.currency}.`
            };
        }

        // 2. التحقق من تكرار شراء الأغراض الدائمة والفريدة
        const existingItem = inv[itemId];
        const isPermanent = item.duration >= 999;
        if (isPermanent && existingItem && itemId !== 'bankextend') {
            return {
                success: false,
                error: `⚠️ أنت تملك **${item.name}** بالفعل في ممتلكاتك!`
            };
        }

        // 3. التحقق من سقف توسعة البنك
        if (itemId === 'bankextend') {
            const currentExt = userData.bankExtensions || 0;
            const maxExtensions = 10;
            if (currentExt >= maxExtensions) {
                return {
                    success: false,
                    error: `⚠️ لقد وصلت للحد الأقصى لتوسعة البنك (10 ترقيات كحد أقصى)!`
                };
            }
        }

        // 4. خصم الرصيد أولاً وبشكل ذري (Atomic Balance Deduction)
        const removed = db.removeMoney(userId, item.price);
        if (!removed) {
            return {
                success: false,
                error: `❌ فشلت عملية الخصم: رصيدك في المحفظة غير كافٍ!`
            };
        }

        // 5. تسجيل المعاملة في السجل المالي
        db.addTransaction(userId, 'shop_buy', item.price, `شراء ${item.name}`);

        // 6. تحديث الممتلكات والحقيبة
        const updates = { inventory: { ...inv } };
        let customNote = '';

        // حساب تاريخ الانتهاء للأغراض المؤقتة والدائمة
        let expiresAt = null;
        if (!isPermanent) {
            const durationMs = item.duration * 24 * 60 * 60 * 1000;
            if (existingItem?.expiresAt && existingItem.expiresAt > now) {
                expiresAt = existingItem.expiresAt + durationMs; // تمديد الصلاحية
            } else {
                expiresAt = now + durationMs;
            }
        }

        updates.inventory[itemId] = {
            quantity: 1,
            purchasedAt: now,
            expiresAt: expiresAt
        };

        // تفعيل المزايا المباشرة
        if (itemId === 'shield') {
            updates.robShieldUntil = expiresAt;
            customNote = '🛡️ تم تفعيل درع الحماية ضد السرقة بنجاح لمدة 24 ساعة!';
        } else if (itemId === 'vip_badge') {
            updates.vipBadge = true;
            updates.vipUntil = expiresAt;
            customNote = '👑 تم تفعيل شارة ومزايا VIP الفاخرة بحسابك!';
        } else if (itemId === 'rob_immunity') {
            updates.robImmunity = true;
            customNote = '⚔️ أصبحت محصناً تماماً وبشكل دائم ضد محاولات السرقة!';
        } else if (itemId === 'xp_boost_large') {
            updates.xpBoostUntil = expiresAt;
            customNote = '⚡ تم تفعيل مضاعف نقاط الخبرة بنجاح لمدة 7 أيام!';
        } else if (itemId === 'vault') {
            updates.vaultCap = (userData.vaultCap || 0) + 100000;
            customNote = `🔐 تم توسيع خزنتك السرية لتتسع لـ **${((userData.vaultCap || 0) + 100000).toLocaleString()}** ${config.currency}!`;
        } else if (itemId === 'bankextend') {
            const currentExt = (userData.bankExtensions || 0) + 1;
            updates.bankExtensions = currentExt;
            updates.bankCap = (userData.bankCap || 0) + 50000;
            customNote = `🏦 تم توسيع سعة بنكك بمقدار +50,000 ${config.currency}! (المستوى: ${currentExt}/10)`;
        }

        // مزامنة العقارات مع نظام العقارات
        if (['villa', 'mansion', 'private_island'].includes(itemId)) {
            const currentProps = userData.properties || {};
            const propertyIncome = {
                villa: 5000,
                mansion: 15000,
                private_island: 100000
            }[itemId] || 2000;

            updates.properties = {
                ...currentProps,
                [itemId]: {
                    name: item.name,
                    boughtAt: now,
                    lastCollected: now,
                    income: propertyIncome
                }
            };
            customNote = `🏰 تم تسجيل العقار باسمك في سجل الممتلكات وتوليد دخل يومي!`;
        }

        // حفظ التعديلات في قاعدة البيانات
        db.updateFields(userId, updates);

        // منح نقاط XP
        try {
            const levels = require('../../utils/levels');
            const xpGained = Math.min(500, Math.floor(item.price / 100));
            if (xpGained > 0) levels.addXP(userId, xpGained, null);
        } catch (_) {}

        // فحص الإنجازات
        try {
            const achievements = require('../../utils/achievements');
            achievements.checkAchievements(userId, null);
        } catch (_) {}

        const updatedUser = db.getUserData(userId);
        return {
            success: true,
            item,
            newBalance: updatedUser.balance || 0,
            customNote
        };

    } finally {
        activePurchases.delete(userId);
    }
}

// ─────────────────────────────────────────────
// بناء رسالة القائمة الرئيسية للمتجر
// ─────────────────────────────────────────────
function buildMainShop(userId, username = 'المستخدم') {
    const userData = db.getUserData(userId);
    const balance = userData.balance || 0;
    const bank = userData.bank || 0;
    const ownedCount = Object.keys(userData.inventory || {}).length;

    const embed = new EmbedBuilder()
        .setColor('#2ECC71')
        .setTitle('🛒 متجر الخوادم الفاخر — Shopping Hub')
        .setDescription([
            `مرحباً بك يا **${username}** في سوق السيرفر المعتمد!`,
            '> تصفح الأقسام واشترِ الأصول والعقارات والمركبات الفاخرة لحسابك مباشرةً.',
            '',
            '**الأقسام المتاحة للتسوق:**',
            '📱 **الإلكترونيات** — هواتف وحواسيب ألعاب حديثة',
            '🏎️ **المركبات** — سيارات رياضية، يخوت وطائرات خاصة',
            '🏰 **العقارات** — فلل، قصور وجزر استثمارية',
            '🛡️ **الحماية** — دروع وحصانة دائمة ضد السرقة',
            '⬆️ **الترقيات** — توسيع البنك والخزن ومضاعفات الخبرة',
        ].join('\n'))
        .addFields(
            {
                name: '💰 رصيدك في المحفظة',
                value: `**${balance.toLocaleString()}** ${config.currency}`,
                inline: true
            },
            {
                name: '🏦 رصيدك في البنك',
                value: `**${bank.toLocaleString()}** ${config.currency}`,
                inline: true
            },
            {
                name: '🎒 ممتلكاتك الحالية',
                value: `**${ownedCount}** أصل مقتنى`,
                inline: true
            },
            {
                name: '⚡ للشراء المباشر بالأوامر',
                value: '`شراء [اسم الغرض]` مثال: `شراء سيارة` أو `شراء لابتوب`',
                inline: false
            }
        )
        .setImage('https://images.unsplash.com/photo-1555529771-835f59fc5efe?q=80&w=800')
        .setFooter({ text: 'اختر فئة من القائمة بالأسفل لتصفح العناصر والشراء المباشر' })
        .setTimestamp();

    // قائمة الاختيار
    const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('shop_category_select')
        .setPlaceholder('📂 اختر قسماً لتصفح معروضاته...')
        .addOptions(
            Object.entries(CATEGORIES).map(([key, cat]) =>
                new StringSelectMenuOptionBuilder()
                    .setLabel(cat.shortLabel)
                    .setValue(key)
                    .setDescription(cat.description.substring(0, 100))
                    .setEmoji(cat.emoji)
            )
        );

    // صف أزرار الفئات
    const catRow1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('shop_cat_electronics').setLabel('📱 إلكترونيات').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('shop_cat_vehicles').setLabel('🏎️ مركبات').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('shop_cat_realestate').setLabel('🏰 عقارات').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('shop_cat_tools').setLabel('🛡️ حماية').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('shop_cat_upgrades').setLabel('⬆️ ترقيات').setStyle(ButtonStyle.Primary),
    );

    // صف أزرار التحكم
    const ctrlRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('shop_inv').setLabel('🎒 ممتلكاتي وخزينتي').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('shop_main').setLabel('🔄 تحديث المتجر').setStyle(ButtonStyle.Secondary),
    );

    return {
        embeds: [embed],
        components: [
            new ActionRowBuilder().addComponents(selectMenu),
            catRow1,
            ctrlRow
        ]
    };
}

// ─────────────────────────────────────────────
// بناء رسالة فئة معينة
// ─────────────────────────────────────────────
function buildCategoryMsg(categoryKey, userId) {
    const category = CATEGORIES[categoryKey];
    if (!category) return buildMainShop(userId);

    const userData = db.getUserData(userId);
    const balance = userData.balance || 0;
    const inv = userData.inventory || {};

    const itemList = category.items.map((itemId, idx) => {
        const item = config.shopItems[itemId];
        if (!item) return '';
        const isOwned = !!inv[itemId];
        const statusBadge = isOwned ? '✅ تملكه' : (balance >= item.price ? '🟢 متاح للشراء' : '🔴 رصيدك لا يكفي');
        return `${idx + 1}. ${item.emoji} **${item.name}** — \`${item.price.toLocaleString()} ${config.currency}\` [${statusBadge}]\n> *${item.description}*`;
    }).filter(Boolean).join('\n\n');

    const embed = new EmbedBuilder()
        .setColor('#3498DB')
        .setTitle(`🛍️ قسم: ${category.label}`)
        .setDescription(itemList || 'لا توجد عناصر متاحة حالياً.')
        .addFields({
            name: '💰 رصيدك المتاح',
            value: `**${balance.toLocaleString()}** ${config.currency}`,
            inline: true
        })
        .setFooter({ text: 'اختر غرضاً من القائمة أدناه لمعاينة تفاصيله وصورته وشرائه فوراً' })
        .setTimestamp();

    const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('shop_item_select')
        .setPlaceholder('🔍 اختر عنصراً لمعاينته وشرائه...')
        .addOptions(
            category.items.map(itemId => {
                const item = config.shopItems[itemId];
                const isOwned = !!inv[itemId];
                return new StringSelectMenuOptionBuilder()
                    .setLabel(`${item.name} — ${item.price.toLocaleString()} ${config.currency}`)
                    .setDescription((isOwned ? '✅ تملكه بالفعل | ' : '') + item.description.substring(0, 70))
                    .setValue(itemId)
                    .setEmoji(item.emoji);
            })
        );

    const row1 = new ActionRowBuilder().addComponents(selectMenu);
    const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('shop_main').setLabel('↩️ العودة للأقسام').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('shop_inv').setLabel('🎒 ممتلكاتي').setStyle(ButtonStyle.Success)
    );

    return { embeds: [embed], components: [row1, row2] };
}

// ─────────────────────────────────────────────
// بناء رسالة تفاصيل الغرض مع زر الشراء المباشر
// ─────────────────────────────────────────────
function buildItemPreview(itemId, userId) {
    const item = config.shopItems ? config.shopItems[itemId] : null;
    if (!item) return buildMainShop(userId);

    const userData = db.getUserData(userId);
    const balance = userData.balance || 0;
    const inv = userData.inventory || {};

    const isOwned = !!inv[itemId];
    const isPermanent = item.duration >= 999;
    const canAfford = balance >= item.price;
    const isMaxBank = itemId === 'bankextend' && (userData.bankExtensions || 0) >= 10;

    let buttonLabel = `🛒 شراء الآن (${item.price.toLocaleString()} ${config.currency})`;
    let buttonStyle = ButtonStyle.Success;
    let isDisabled = false;

    if (isOwned && isPermanent && itemId !== 'bankextend') {
        buttonLabel = '✅ تملك هذا الأصل بالفعل';
        buttonStyle = ButtonStyle.Secondary;
        isDisabled = true;
    } else if (isMaxBank) {
        buttonLabel = '⚠️ وصلت للحد الأقصى للتوسعة';
        buttonStyle = ButtonStyle.Secondary;
        isDisabled = true;
    } else if (!canAfford) {
        buttonLabel = `❌ رصيدك لا يكفي (${item.price.toLocaleString()})`;
        buttonStyle = ButtonStyle.Danger;
        isDisabled = true;
    }

    const durationText = isPermanent ? '♾️ دائم مدى الحياة' : `${item.duration} يوم`;

    const embed = new EmbedBuilder()
        .setColor(isOwned ? '#95A5A6' : canAfford ? '#2ECC71' : '#E74C3C')
        .setTitle(`${item.emoji} ${item.name}`)
        .setDescription([
            `**📝 الوصف:** ${item.description}`,
            `**💰 السعر:** \`${item.price.toLocaleString()} ${config.currency}\``,
            `**⏱️ الصلاحية:** \`${durationText}\``,
            '',
            `**💼 محفظتك:** \`${balance.toLocaleString()} ${config.currency}\``,
            canAfford ? '✅ **رصيدك كافٍ للشراء الفوري!**' : '❌ **رصيدك غير كافٍ، اجمع المزيد من الأموال للطلب.**'
        ].join('\n'))
        .setImage(item.image)
        .setFooter({ text: 'اضغط على زر الشراء بالأسفل لإتمام العملية بنقرة واحدة' })
        .setTimestamp();

    const buyBtn = new ButtonBuilder()
        .setCustomId(`sbuy_${itemId}`)
        .setLabel(buttonLabel)
        .setStyle(buttonStyle)
        .setDisabled(isDisabled);

    const backBtn = new ButtonBuilder()
        .setCustomId('shop_main')
        .setLabel('↩️ رجوع للمتجر')
        .setStyle(ButtonStyle.Secondary);

    const invBtn = new ButtonBuilder()
        .setCustomId('shop_inv')
        .setLabel('🎒 ممتلكاتي')
        .setStyle(ButtonStyle.Primary);

    const row = new ActionRowBuilder().addComponents(buyBtn, backBtn, invBtn);

    return { embeds: [embed], components: [row] };
}

// ─────────────────────────────────────────────
// بناء واجهة الممتلكات والحقيبة
// ─────────────────────────────────────────────
function buildInventory(userId, username = 'المستخدم') {
    const userData = db.getUserData(userId);
    const inv = userData.inventory || {};
    const now = Date.now();
    const lines = [];

    for (const [id, data] of Object.entries(inv)) {
        const item = config.shopItems ? config.shopItems[id] : null;
        if (!item) continue;
        if (data?.expiresAt && now > data.expiresAt) continue;

        let timeLeft = '♾️ دائم';
        if (data?.expiresAt) {
            const diffHours = Math.ceil((data.expiresAt - now) / 3600000);
            timeLeft = diffHours > 24 ? `⏳ ${Math.ceil(diffHours / 24)} يوم متبقي` : `⏳ ${diffHours} ساعة متبقية`;
        }
        lines.push(`• ${item.emoji} **${item.name}** — ${timeLeft}`);
    }

    if (userData.vipBadge) lines.push('• 👑 **شارة ومزايا VIP** — مفعلة');
    if (userData.robImmunity) lines.push('• ⚔️ **حصانة السرقة الدائمة** — مفعلة');
    if (userData.robShieldUntil && userData.robShieldUntil > now) {
        lines.push(`• 🛡️ **درع الحماية** — ⏳ متبقي ${Math.ceil((userData.robShieldUntil - now) / 3600000)} ساعة`);
    }
    if (userData.bankExtensions && userData.bankExtensions > 0) {
        lines.push(`• 🏦 **توسعات البنك:** ${userData.bankExtensions}/10 (+${(userData.bankExtensions * 50000).toLocaleString()} ${config.currency})`);
    }
    if (userData.vaultCap && userData.vaultCap > 0) {
        lines.push(`• 🔐 **سعة الخزنة:** ${userData.vaultCap.toLocaleString()} ${config.currency}`);
    }

    const embed = new EmbedBuilder()
        .setColor('#9B59B6')
        .setTitle(`🎒 ممتلكات وخزينة ${username}`)
        .setDescription(lines.length > 0 ? lines.join('\n\n') : 'لا تملك أي أصول أو أدوات بعد! تصفح المتجر واشترِ الآن.')
        .addFields({
            name: '💰 الرصيد الحالي',
            value: `المحفظة: **${(userData.balance || 0).toLocaleString()}** | البنك: **${(userData.bank || 0).toLocaleString()}** ${config.currency}`,
            inline: false
        })
        .setFooter({ text: 'جميع الأصول والممتلكات موثقة ومحفوظة بحسابك' })
        .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('shop_main').setLabel('🛒 الذهاب للمتجر').setStyle(ButtonStyle.Primary)
    );

    return { embeds: [embed], components: [row] };
}

// ═══════════════════════════════════════════════════════════
// معالج تفاعلات المتجر الكامل (Buttons & Select Menus)
// ═══════════════════════════════════════════════════════════
async function handleShopButton(interaction) {
    const id = interaction.customId;
    const userId = interaction.user.id;
    const username = interaction.user.username;

    try {
        // ── اختيار فئة من القائمة المنسدلة
        if (id === 'shop_category_select') {
            const catKey = interaction.values[0];
            const msg = buildCategoryMsg(catKey, userId);
            return await interaction.update({ ...msg });
        }

        // ── أزرار الفئات المباشرة
        if (id.startsWith('shop_cat_')) {
            const catKey = id.replace('shop_cat_', '');
            const msg = buildCategoryMsg(catKey, userId);
            return await interaction.update({ ...msg });
        }

        // ── اختيار عنصر من القائمة المنسدلة
        if (id === 'shop_item_select') {
            const itemKey = interaction.values[0];
            const msg = buildItemPreview(itemKey, userId);
            return await interaction.update({ ...msg });
        }

        // ── العودة للرئيسية
        if (id === 'shop_main') {
            const msg = buildMainShop(userId, username);
            return await interaction.update({ ...msg });
        }

        // ── عرض الحقيبة
        if (id === 'shop_inv') {
            const inv = buildInventory(userId, username);
            return await interaction.update({ ...inv });
        }

        // ── شراء عنصر مباشر عبر الزر (sbuy_ أو buy_)
        if (id.startsWith('sbuy_') || id.startsWith('buy_')) {
            const itemId = id.replace(/^sbuy_|^buy_/, '');
            const result = await executePurchase(userId, itemId);

            if (!result.success) {
                return await interaction.reply({
                    content: result.error,
                    flags: MessageFlags.Ephemeral
                });
            }

            const successEmbed = new EmbedBuilder()
                .setColor('#2ECC71')
                .setTitle('🎉 مبروك! تمت الصفقة بنجاح')
                .setDescription([
                    `اشتريت **${result.item.emoji} ${result.item.name}** بنجاح!`,
                    `💰 المبلغ المخصوم: **${result.item.price.toLocaleString()}** ${config.currency}`,
                    `👛 رصيدك المتبقي: **${result.newBalance.toLocaleString()}** ${config.currency}`,
                    result.customNote ? `\n✨ **${result.customNote}**` : ''
                ].join('\n'))
                .setImage(result.item.image)
                .setFooter({ text: 'تمت إضافة العنصر إلى ممتلكاتك فوراً' })
                .setTimestamp();

            await interaction.reply({ embeds: [successEmbed], flags: MessageFlags.Ephemeral });

            // تحديث رسالة المتجر في نفس المكان لتعكس الرصيد والتملك
            try {
                const refreshed = buildItemPreview(itemId, userId);
                await interaction.message.edit({ ...refreshed });
            } catch (_) {}
            return;
        }

    } catch (err) {
        console.error('[Shop Interaction Error]:', err);
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ content: '❌ حدث خطأ أثناء تنفيذ الإجراء في المتجر.', flags: MessageFlags.Ephemeral }).catch(() => {});
        }
    }
}

// ═══════════════════════════════════════════════════════════
// أمر المتجر والشراء الرئيسي
// ═══════════════════════════════════════════════════════════
module.exports = {
    name: 'shop',
    aliases: ['متجر', 'شوب', 'store', 'شراء', 'buy', 'دكان'],
    description: 'متجر السيرفر المطور والشراء المباشر للأصول والممتلكات',
    usage: 'متجر | شراء [اسم أو رقم الغرض] | متجر حقيبة',

    async execute(message, args) {
        try {
            const userId = message.author.id;
            const username = message.author.username;
            const firstArg = args[0]?.toLowerCase();

            // 1. طلب عرض الحقيبة / الممتلكات
            if (firstArg === 'حقيبة' || firstArg === 'ممتلكاتي' || firstArg === 'خزينة' || firstArg === 'inv' || firstArg === 'inventory') {
                const invMsg = buildInventory(userId, username);
                return await message.reply(invMsg);
            }

            // 2. الشراء المباشر عبر الشات (سواء كتب !buy X أو !شراء X أو !متجر شراء X)
            let query = null;
            if (firstArg === 'شراء' || firstArg === 'buy') {
                query = args.slice(1).join(' ').trim();
            } else if (args.length > 0 && !['قائمة', 'عرض', 'list', 'shop', 'متجر'].includes(firstArg)) {
                // إذا كتب: `!شراء سيارة` أو `!متجر سيارة`
                query = args.join(' ').trim();
            }

            // إذا كان هناك اسم غرض محدد للشراء
            if (query) {
                const found = findItem(query);
                if (!found) {
                    return await message.reply({
                        embeds: [
                            new EmbedBuilder()
                                .setColor('#ED4245')
                                .setTitle('❌ الغرض غير موجود في المتجر')
                                .setDescription([
                                    `لم يتم العثور على أيتم باسم: \`${query}\``,
                                    '',
                                    '**أمثلة للشراء المباشر:**',
                                    '• `شراء هاتف` (📱 هاتف ذكي - 5,000)',
                                    '• `شراء لابتوب` (💻 لابتوب ألعاب - 15,000)',
                                    '• `شراء سيارة` (🏎️ سيارة رياضية - 250,000)',
                                    '• `شراء يخت` (🛥️ يخت فاخر - 1,500,000)',
                                    '• `شراء فيلا` (🏡 فيلا فاخرة - 2,000,000)',
                                    '• `شراء درع` (🛡️ درع حماية - 5,000)',
                                    '• `شراء حصانة` (⚔️ حصانة دائمة - 100,000)',
                                    '• `شراء توسعة` (🏦 توسعة البنك - 20,000)',
                                    '',
                                    '💡 اكتب `متجر` لتصفح كامل المعروضات مع الصور والأزرار!'
                                ].join('\n'))
                        ]
                    });
                }

                // تنفيذ الشراء فوراً
                const result = await executePurchase(userId, found.id);
                if (!result.success) {
                    return await message.reply({
                        embeds: [
                            new EmbedBuilder()
                                .setColor('#ED4245')
                                .setTitle('❌ تعذر إتمام عملية الشراء')
                                .setDescription(result.error)
                        ]
                    });
                }

                // نجاح الشراء
                const successEmbed = new EmbedBuilder()
                    .setColor('#2ECC71')
                    .setTitle('🎉 مبروك! تمت عملية الشراء بنجاح')
                    .setDescription([
                        `اشتريت **${result.item.emoji} ${result.item.name}** بنجاح!`,
                        `💰 المبلغ المخصوم: **${result.item.price.toLocaleString()}** ${config.currency}`,
                        `👛 رصيدك المتبقي: **${result.newBalance.toLocaleString()}** ${config.currency}`,
                        result.customNote ? `\n✨ **${result.customNote}**` : ''
                    ].join('\n'))
                    .setImage(result.item.image)
                    .setFooter({ text: 'تم تسجيل الأصل في ممتلكاتك فوراً' })
                    .setTimestamp();

                return await message.reply({ embeds: [successEmbed] });
            }

            // 3. عرض واجهة المتجر الرئيسية التفاعلية
            const shopMsg = buildMainShop(userId, username);
            await message.reply(shopMsg);

        } catch (err) {
            console.error('[Shop Command Error]:', err);
            message.reply('❌ حدث خطأ أثناء فتح المتجر. حاول مرة أخرى.').catch(() => {});
        }
    },

    // Exports للـ interactions
    handleShopButton,
    executePurchase,
    buildMainShop,
    buildCategoryMsg,
    buildItemPreview,
    buildInventory,
    findItem,
};
