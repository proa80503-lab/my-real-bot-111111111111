/**
 * ═══════════════════════════════════════════════════════════
 * 🛒 متجر السيرفر المطور — Shop Module (Real Items & Images)
 *
 * ═══════════════════════════════════════════════════════════
 */

'use strict';

const {
    ActionRowBuilder, ButtonBuilder, ButtonStyle,
    EmbedBuilder, MessageFlags, StringSelectMenuBuilder
} = require('discord.js');


const db = require('../../utils/database');
const config = require('../../config');
const dashboard = require('../../dashboard-server');

// الفئات المتاحة في المتجر بناءً على التصنيفات
const CATEGORIES = {
    electronics: { label: '📱 الأجهزة والإلكترونيات', emoji: '💻', items: ['smartphone', 'laptop'] },
    vehicles: { label: '🏎️ المركبات الفاخرة', emoji: '🏎️', items: ['sport_car', 'yacht', 'private_jet'] },
    realestate: { label: '🏰 العقارات', emoji: '🏡', items: ['villa', 'mansion', 'private_island'] },
    tools: { label: '🎒 الأدوات والحماية', emoji: '🛡️', items: ['shield', 'moneybag', 'vip_badge', 'rob_immunity'] },
    upgrades: { label: '⬆️ الترقيات', emoji: '✨', items: ['bankextend', 'vault', 'xp_boost_large'] }
};

// ─────────────────────────────────────────────
// بناء رسالة القائمة الرئيسية للفئات
// ─────────────────────────────────────────────
// ── إرسال رابط المتجر بالخاص (DM) فقط ──────────────────────────────────────
async function sendShopDM(user, message) {
    const userData = db.getUserData(user.id);
    const balance = userData.balance || 0;
    const bank = userData.bank || 0;

    const token = dashboard.generateWebToken(user);
    const storeUrl = `${process.env.RENDER_EXTERNAL_URL || 'http://localhost:' + (process.env.PORT || 3000)}/store?token=${token}`;

    const embed = new EmbedBuilder()
        .setColor('#2C3E50')
        .setTitle('🛒 متجرك الخاص')
        .setDescription('مرحباً! تم إرسال رابط متجرك الشخصي بالخاص لحمايتك.\n\nاضغط على الزر للدخول.')
        .addFields(
            {
                name: '💰 رصيدك الحالي',
                value: `المحفظة: **${balance.toLocaleString()}** | البنك: **${bank.toLocaleString()}** ${config.currency}`,
                inline: false
            },
            {
                name: '🔒 ملاحظة أمنية',
                value: 'هذا الرابط **خاص بك فقط** — لا تشاركه مع أحد!\nينتهي خلال **30 دقيقة**.',
                inline: false
            }
        )
        .setImage('https://images.unsplash.com/photo-1555529771-835f59fc5efe?q=80&w=800')
        .setFooter({ text: '⏱️ ينتهي الرابط بعد 30 دقيقة' })
        .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setLabel('🌐 فتح متجري').setStyle(ButtonStyle.Link).setURL(storeUrl)
    );

    try {
        await user.send({ embeds: [embed], components: [row] });
        return true;
    } catch {
        // المستخدم أغلق الـ DMs
        return false;
    }
}

function buildMainShop(user) {
    // نبقي هذه الدالة للاستخدام الداخلي (أزرار shop_main)
    const userData = db.getUserData(user.id);
    const balance = userData.balance || 0;
    const bank = userData.bank || 0;

    const embed = new EmbedBuilder()
        .setColor('#2C3E50')
        .setTitle('🛒 متجر الخوادم الفاخر')
        .setDescription('اختر فئة من الأزرار للتسوق، أو اكتب `متجر` للحصول على رابط متجرك الشخصي.')
        .addFields({
            name: '💰 رصيدك',
            value: `المحفظة: **${balance.toLocaleString()}** | البنك: **${bank.toLocaleString()}** ${config.currency}`,
            inline: false
        })
        .setTimestamp();

    return { embeds: [embed], components: [] };
}

// ─────────────────────────────────────────────
// بناء رسالة فئة معينة
// ─────────────────────────────────────────────
function buildCategoryMsg(categoryKey, userId) {
    const category = CATEGORIES[categoryKey];
    if (!category) return buildMainShop(userId);

    const userData = db.getUserData(userId);
    const balance = userData.balance || 0;

    const embed = new EmbedBuilder()
        .setColor('#3498DB')
        .setTitle(`تتصفح الآن: ${category.label}`)
        .setDescription('اختر العنصر الذي تريد مشاهدة تفاصيله وصورته وشرائه من القائمة بالأسفل.')
        .addFields({
            name: '💰 محفظتك',
            value: `**${balance.toLocaleString()}** ${config.currency}`,
            inline: false
        });

    const selectMenu = new StringSelectMenuBuilder()
        .setCustomId(`shop_item_select`)
        .setPlaceholder('اختر غرضاً لعرض تفاصيله...')
        .addOptions(
            category.items.map(itemId => {
                const item = config.shopItems[itemId];
                return new StringSelectMenuOptionBuilder()
                    .setLabel(`${item.name} - ${item.price.toLocaleString()}`)
                    .setDescription(item.description.substring(0, 100))
                    .setValue(itemId)
                    .setEmoji(item.emoji);
            })
        );

    const row1 = new ActionRowBuilder().addComponents(selectMenu);
    const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('shop_main').setLabel('↩️ العودة للقائمة الرئيسية').setStyle(ButtonStyle.Secondary)
    );

    return { embeds: [embed], components: [row1, row2] };
}

// ─────────────────────────────────────────────
// بناء رسالة تفاصيل الغرض (الغرض محدد)
// ─────────────────────────────────────────────
function buildItemPreview(itemId, userId) {
    const item = config.shopItems[itemId];
    if (!item) return buildMainShop(userId);

    const userData = db.getUserData(userId);
    const balance = userData.balance || 0;
    const inv = userData.inventory || {};
    
    // هل يملك العنصر؟
    const isOwned = inv[itemId];
    const canAfford = balance >= item.price;

    const embed = new EmbedBuilder()
        .setColor(isOwned ? '#95A5A6' : canAfford ? '#2ECC71' : '#E74C3C')
        .setTitle(`${item.emoji} ${item.name}`)
        .setDescription(`**الوصف:** ${item.description}\n**السعر:** \`${item.price.toLocaleString()} ${config.currency}\`\n**المدة:** ${item.duration === 999 ? '♾️ دائم' : item.duration + ' أيام'}`)
        .setImage(item.image)
        .addFields({ name: '💰 رصيدك في المحفظة', value: `**${balance.toLocaleString()}** ${config.currency}` });

    if (isOwned) embed.setFooter({ text: 'أنت تملك هذا العنصر بالفعل!' });
    else if (!canAfford) embed.setFooter({ text: 'ليس لديك رصيد كافٍ لشرائه!' });
    else embed.setFooter({ text: 'اضغط على زر الشراء بالأسفل لإتمام العملية' });

    const buyBtn = new ButtonBuilder()
        .setCustomId(`sbuy_${itemId}`)
        .setLabel(isOwned ? 'تملكه بالفعل' : `شراء ${item.name} 🛒`)
        .setStyle(isOwned ? ButtonStyle.Secondary : canAfford ? ButtonStyle.Success : ButtonStyle.Danger)
        .setDisabled(isOwned || !canAfford);

    const backBtn = new ButtonBuilder()
        .setCustomId('shop_main')
        .setLabel('↩️ العودة للمتجر')
        .setStyle(ButtonStyle.Secondary);

    const row = new ActionRowBuilder().addComponents(buyBtn, backBtn);

    return { embeds: [embed], components: [row] };
}

// ─────────────────────────────────────────────
// معالج الشراء — محمي تماماً Atomic Security
// ─────────────────────────────────────────────
async function buy(interaction, itemId) {
    const userId = interaction.user.id;
    const item = config.shopItems[itemId];
    const now = Date.now();

    if (!item) return interaction.reply({ content: '❌ عنصر غير موجود!', flags: MessageFlags.Ephemeral });

    // قراءة البيانات لحظة الشراء بالضبط (Anti Race Condition)
    const userData = db.getUserData(userId);
    const balance = userData.balance || 0;
    const inv = userData.inventory || {};

    // ── فحص الرصيد
    if (balance < item.price) {
        return interaction.reply({ content: `❌ رصيدك **${balance.toLocaleString()}** لا يكفي لـ **${item.price.toLocaleString()}**!`, flags: MessageFlags.Ephemeral });
    }

    // ── فحص التملّك
    if (inv[itemId]) {
        return interaction.reply({ content: `⚠️ أنت تملك **${item.name}** بالفعل!`, flags: MessageFlags.Ephemeral });
    }

    // خصم الرصيد أولاً وبشكل آمن
    const removed = db.removeMoney(userId, item.price);
    if (!removed) {
        return interaction.reply({ content: '❌ حدث خطأ، رصيدك قد لا يكفي!', flags: MessageFlags.Ephemeral });
    }
    
    // إضافة سجل المعاملة
    db.addTransaction(userId, 'shop_buy', item.price, `Bought ${item.name}`);

    const updates = { inventory: { ...inv } };
    let resultMsg = '✅ تم الشراء بنجاح ووضعه في حقيبتك!';

    // إضافة الغرض للحقيبة (إذا لم يكن ترقية تتراكم)
    if (itemId !== 'bankextend') {
        updates.inventory[itemId] = {
            purchasedAt: now,
            expiresAt: item.duration === 999 ? null : now + (item.duration * 24 * 60 * 60 * 1000)
        };
    }

    // ميزات خاصة (مثال درع أو فلوس)
    if (itemId === 'shield') updates.robShieldUntil = now + (24 * 60 * 60 * 1000);
    if (itemId === 'vip_badge') updates.vipBadge = true;
    if (itemId === 'rob_immunity') updates.robImmunity = true;
    if (itemId === 'xp_boost_large') updates.xpBoostUntil = now + (7 * 24 * 60 * 60 * 1000);
    if (itemId === 'vault') updates.vaultCap = (userData.vaultCap || 0) + 100000;
    
    if (itemId === 'bankextend') {
        const maxExtensions = 10;
        const currentExt = userData.bankExtensions || 0;
        if (currentExt >= maxExtensions) {
            db.addMoney(userId, item.price);
            return interaction.reply({ content: `⚠️ لقد وصلت للحد الأقصى لتوسعة البنك!`, flags: MessageFlags.Ephemeral });
        }
        updates.bankCap = (userData.bankCap || 0) + 50000;
        updates.bankExtensions = currentExt + 1;
        resultMsg = `🏦 تم زيادة سعة البنك بـ +50,000 ${config.currency}!`;
    }

    if (itemId === 'moneybag') {
        // FIX: كيس المال يعطي مبلغاً عشوائياً بين 200-3500 (السعر 1000)
        // المستخدم لا يكسب دائماً — احتمال الخسارة موجود
        const cash = Math.floor(Math.random() * 3300) + 200;
        db.addMoney(userId, cash);
        delete updates.inventory[itemId];
        const diff = cash - item.price;
        const diffStr = diff >= 0 ? `+${diff.toLocaleString()}` : diff.toLocaleString();
        resultMsg = `💰 فتحت كيس المال وحصلت على **${cash.toLocaleString()}** ${config.currency}! (${diffStr})`;
    }

    db.updateFields(userId, updates);

    const embed = new EmbedBuilder()
        .setColor('#2ECC71')
        .setTitle('🎉 مبروك تمت الصفقة!')
        .setDescription(`لقد قمت بشراء **${item.name}** مقابل ${item.price.toLocaleString()} ${config.currency}.\n\n${resultMsg}`)
        .setImage(item.image)
        .setTimestamp();

    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });

    // تحديث رسالة المتجر الأساسية ليعكس الرصيد الجديد والتملك
    try {
        const newPage = buildItemPreview(itemId, userId);
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
        const item = config.shopItems[id];
        if (!item) continue;
        if (data?.expiresAt && now > data.expiresAt) continue;
        const timeLeft = data?.expiresAt ? `⏳ ${Math.ceil((data.expiresAt - now) / 86400000)} يوم متبقي` : '♾️ دائم';
        lines.push(`${item.emoji} **${item.name}** — ${timeLeft}`);
    }

    if (userData.vipBadge) lines.push('👑 شارة VIP — ♾️ دائم');
    if (userData.robShieldUntil && userData.robShieldUntil > now) lines.push(`🛡️ حماية سرقة — ⏳ متبقي ${Math.ceil((userData.robShieldUntil - now) / 3600000)} ساعة`);

    const embed = new EmbedBuilder()
        .setColor('#9B59B6')
        .setTitle('🎒 خزينتك وممتلكاتك الفاخرة')
        .setDescription(lines.length > 0 ? lines.join('\n\n') : 'لا تملك أي شيء بعد! اذهب للمتجر للتبضع.')
        .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('shop_main').setLabel('↩️ العودة للمتجر').setStyle(ButtonStyle.Secondary)
    );

    return { embeds: [embed], components: [row] };
}

// ═══════════════════════════════════════════════════════════
// معالج أزرار وقوائم المتجر الكامل
// ═══════════════════════════════════════════════════════════
async function handleShopButton(interaction) {
    const id = interaction.customId;
    const userId = interaction.user.id;
    const user = interaction.user;

    // قائمة الفئات
    if (id === 'shop_category_select') {
        const catKey = interaction.values[0];
        const msg = buildCategoryMsg(catKey, userId);
        return interaction.update({ ...msg });
    }

    // قائمة العناصر
    if (id === 'shop_item_select') {
        const itemKey = interaction.values[0];
        const msg = buildItemPreview(itemKey, userId);
        return interaction.update({ ...msg });
    }

    // الرجوع للرئيسية
    if (id === 'shop_main') {
        const msg = buildMainShop(user);
        return interaction.update({ ...msg });
    }

    // حقيبة
    if (id === 'shop_inv') {
        const inv = buildInventory(userId);
        return interaction.update({ ...inv });
    }

    // شراء عنصر
    if (id.startsWith('sbuy_')) {
        const itemId = id.replace('sbuy_', '');
        return buy(interaction, itemId);
    }
}

// ═══════════════════════════════════════════════════════════
// الأمر
// ═══════════════════════════════════════════════════════════
module.exports = {
    name: 'shop',
    aliases: ['متجر', 'شوب', 'store'],
    description: 'متجر الخوادم الفاخر (النسخة الجديدة مع الصور)',
    usage: 'متجر',

    async execute(message) {
        try {
            const user = message.author;
            // إرسال الرابط بالخاص (DM) لحماية حساب المستخدم
            const sent = await sendShopDM(user, message);
            if (sent) {
                await message.reply('📬 تم إرسال رابط متجرك **بالخاص** لحماية حسابك! تحقق من رسائلك الخاصة.').catch(() => {});
            } else {
                // المستخدم أغلق الـ DMs — نرسل في الروم مع تحذير
                const msg = buildMainShop(user);
                await message.reply({
                    content: '⚠️ **لم أتمكن من إرسال الرابط بالخاص** (ربما أغلقت الرسائل الخاصة).\n🔒 هذا الرابط خاص بك — لا تشاركه!',
                    ...msg
                });
            }
        } catch (err) {
            console.error('[Shop Error]', err);
            message.reply('حدث خطأ أثناء فتح المتجر.').catch(() => {});
        }
    },
    handleShopButton // تم تعديله ليتوافق مع interactionCreate.js
};
