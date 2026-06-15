const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require('../../utils/database');
const config = require('../../config');
const { PremiumEmbedBuilder } = require('../../utils/embed-builder');

const properties = {
    house: { name: 'منزل صغير', price: 5000, income: 50, emoji: '🏠' },
    villa: { name: 'فيلا فخمة', price: 15000, income: 200, emoji: '🏰' },
    shop: { name: 'محل تجاري', price: 10000, income: 150, emoji: '🏪' },
    factory: { name: 'مصنع كبير', price: 30000, income: 500, emoji: '🏭' }
};

module.exports = {
    name: 'property',
    aliases: ['عقار', 'عقارات', 'بيت'],
    description: 'نظام الاستثمار العقاري',
    usage: 'عقار [قائمة/شراء/جمع/ممتلكاتي]',

    async execute(message, args) {
        const action = args[0]?.toLowerCase();
        const userData = db.getUserData(message.author.id);

        if (!action || action === 'list' || action === 'قائمة') {
            const fields = Object.entries(properties).map(([key, prop]) => ({
                name: `${prop.emoji} ${prop.name}`,
                value: `السعر: **${prop.price.toLocaleString()}**\nدخل يومي: **${prop.income.toLocaleString()}**`,
                inline: true
            }));

            const embed = PremiumEmbedBuilder.custom({
                color: '#27AE60',
                title: '🏘️ سوق العقارات الاستثماري',
                description: 'استخدم الأزرار بالأسفل لإدارة عقاراتك!',
                fields
            });

            const row1 = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('prop_buy_house').setLabel('شراء منزل').setEmoji('🏠').setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId('prop_buy_villa').setLabel('شراء فيلا').setEmoji('🏰').setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId('prop_buy_shop').setLabel('شراء محل').setEmoji('🏪').setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId('prop_buy_factory').setLabel('شراء مصنع').setEmoji('🏭').setStyle(ButtonStyle.Primary)
            );

            const row2 = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('prop_collect').setLabel('جمع الأرباح').setEmoji('💰').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId('prop_my').setLabel('ممتلكاتي').setEmoji('📑').setStyle(ButtonStyle.Secondary)
            );

            return message.reply({ embeds: [embed], components: [row1, row2] });
        }

        if (action === 'buy' || action === 'شراء') {
            const type = args[1]?.toLowerCase();
            const property = properties[type];

            if (!property) return message.reply('❌ نوع عقار غير صحيح! اختر من القائمة.');
            return buyProperty(message, type, userData, message.author.id);
        }

        if (action === 'collect' || action === 'جمع') {
            return collectIncome(message, userData, message.author.id);
        }

        if (action === 'my' || action === 'ممتلكاتي' || action === 'عقاراتي') {
            return showMyProperties(message, userData);
        }
    },

    // معالج التفاعلات (Buttons)
    async handlePropertyInteraction(interaction) {
        const userData = db.getUserData(interaction.user.id);
        const customId = interaction.customId;

        if (customId.startsWith('prop_buy_')) {
            const type = customId.replace('prop_buy_', '');
            await buyProperty(interaction, type, userData, interaction.user.id, true);
        } else if (customId === 'prop_collect') {
            await collectIncome(interaction, userData, interaction.user.id, true);
        } else if (customId === 'prop_my') {
            await showMyProperties(interaction, userData, true);
        }
    }
};

async function buyProperty(context, type, userData, userId, isInteraction = false) {
    const property = properties[type];
    if (!property) return context.reply({ content: '❌ نوع عقار غير صحيح!', ephemeral: isInteraction });

    if (userData.balance < property.price) {
        return context.reply({ content: `❌ رصيدك لا يكفي! تحتاج **${property.price.toLocaleString()}** ${config.currency}`, ephemeral: isInteraction });
    }

    if (!userData.properties) userData.properties = {};
    if (userData.properties[type]) return context.reply({ content: '❌ أنت تملك هذا العقار بالفعل!', ephemeral: isInteraction });

    userData.balance -= property.price;
    userData.properties[type] = {
        boughtAt: Date.now(),
        lastCollected: Date.now()
    };

    db.updateUserData(userId, userData);

    const embed = PremiumEmbedBuilder.success(
        'مبروك المنزل الجديد! 🏠',
        `تم شراء **${property.name}** بنجاح.`,
        [
            { name: 'الدخل اليومي', value: `${property.income.toLocaleString()} ${config.currency}`, inline: true },
            { name: 'رصيدك المتبقي', value: `${userData.balance.toLocaleString()} ${config.currency}`, inline: true }
        ]
    );

    if (isInteraction) {
        await context.reply({ embeds: [embed], ephemeral: true });
    } else {
        await context.reply({ embeds: [embed] });
    }
}

async function collectIncome(context, userData, userId, isInteraction = false) {
    if (!userData.properties || Object.keys(userData.properties).length === 0) {
        return context.reply({ content: '❌ لا تملك أي عقارات لجمع دخلها!', ephemeral: isInteraction });
    }

    let totalIncome = 0;
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;

    for (const [type, data] of Object.entries(userData.properties)) {
        const prop = properties[type];
        const days = Math.floor((now - data.lastCollected) / oneDay);
        if (days > 0) {
            totalIncome += prop.income * days;
            data.lastCollected = now;
        }
    }

    if (totalIncome <= 0) return context.reply({ content: '⏰ لم يمر 24 ساعة منذ آخر عملية جمع لجميع عقاراتك!', ephemeral: isInteraction });

    userData.balance += totalIncome;
    db.updateUserData(userId, userData);

    const msg = `✅ تم جمع أرباح عقاراتك بقيمة **${totalIncome.toLocaleString()}** ${config.currency}!`;
    if (isInteraction) {
        await context.reply({ content: msg, ephemeral: true });
    } else {
        await context.reply(msg);
    }
}

async function showMyProperties(context, userData, isInteraction = false) {
    if (!userData.properties || Object.keys(userData.properties).length === 0) {
        return context.reply({ content: '❌ خالي من الأملاك! استثمر في عقار الآن.', ephemeral: isInteraction });
    }

    const fields = Object.entries(userData.properties).map(([type, data]) => {
        const prop = properties[type];
        const days = Math.floor((Date.now() - data.lastCollected) / (24 * 60 * 60 * 1000));
        return {
            name: `${prop.emoji} ${prop.name}`,
            value: `الدخل المتاح: **${(prop.income * days).toLocaleString()}**`,
            inline: true
        };
    });

    const embed = PremiumEmbedBuilder.economy(
        '🏡 سجل ممتلكاتك الاستثمارية',
        'استخدم زر "جمع الأرباح" لاستلام الأموال',
        fields
    );

    if (isInteraction) {
        await context.reply({ embeds: [embed], ephemeral: true });
    } else {
        await context.reply({ embeds: [embed] });
    }
}
