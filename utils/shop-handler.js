const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require('../utils/database');
const config = require('../config');

// معالج أزرار المتجر
async function handleShopButton(interaction) {
    const itemId = interaction.customId.replace('buy_', '');
    const item = config.shopItems[itemId];

    if (!item) {
        return interaction.reply({ content: '❌ غرض غير معروف!', ephemeral: true });
    }

    const userData = db.getUserData(interaction.user.id);

    // فحص الرصيد
    if (userData.balance < item.price) {
        return interaction.reply({
            content: `❌ ليس لديك ما يكفي! تحتاج ${item.price.toLocaleString()} ${config.currency} ولديك ${userData.balance.toLocaleString()} ${config.currency}`,
            ephemeral: true
        });
    }

    // إذا كان الغرض لون، اعرض قائمة الألوان
    if (itemId === 'profileColor') {
        return showColorSelection(interaction);
    }

    // شراء عادي
    userData.balance -= item.price;

    // إضافة للمخزون
    if (!userData.inventory) userData.inventory = [];

    const expiresAt = Date.now() + (item.duration * 24 * 60 * 60 * 1000);
    userData.inventory.push({
        id: itemId,
        name: item.name,
        purchasedAt: Date.now(),
        expiresAt: expiresAt
    });

    db.updateUserData(interaction.user.id, userData);
    db.addTransaction(interaction.user.id, 'purchase', -item.price, `Bought ${item.name}`);

    const levels = require('../utils/levels');
    levels.addXP(interaction.user.id, Math.floor(item.price / 100), null);

    const achievements = require('../utils/achievements');
    achievements.checkAchievements(interaction.user.id, null);

    const embed = new EmbedBuilder()
        .setColor('#00FF00')
        .setTitle('✅ تم الشراء!')
        .setDescription(`اشتريت **${item.emoji} ${item.name}** بنجاح!`)
        .addFields(
            { name: 'المدة', value: `${item.duration} يوم`, inline: true },
            { name: 'رصيدك المتبقي', value: `${userData.balance.toLocaleString()} ${config.currency}`, inline: true }
        )
        .setFooter({ text: 'استخدم !profile لرؤية مشترياتك' })
        .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
}

// عرض اختيار الألوان
async function showColorSelection(interaction) {
    const userData = db.getUserData(interaction.user.id);
    const item = config.shopItems.profileColor;

    const embed = new EmbedBuilder()
        .setColor('#9B59B6')
        .setTitle('🎨 اختر لون البروفايل')
        .setDescription(`**السعر**: ${item.price.toLocaleString()} ${config.currency}\n\nاختر اللون المفضل لك:`)
        .setFooter({ text: `رصيدك: ${userData.balance.toLocaleString()} ${config.currency}` });

    // إضافة الألوان كـ Fields
    Object.entries(config.availableColors).forEach(([id, color]) => {
        embed.addFields({
            name: `${color.emoji} ${color.name}`,
            value: color.hex,
            inline: true
        });
    });

    // أزرار الألوان
    const row1 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('color_red')
                .setLabel('أحمر')
                .setEmoji('🔴')
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId('color_blue')
                .setLabel('أزرق')
                .setEmoji('🔵')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('color_green')
                .setLabel('أخضر')
                .setEmoji('🟢')
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId('color_gold')
                .setLabel('ذهبي')
                .setEmoji('🟡')
                .setStyle(ButtonStyle.Primary)
        );

    const row2 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('color_purple')
                .setLabel('بنفسجي')
                .setEmoji('🟣')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('color_pink')
                .setLabel('وردي')
                .setEmoji('🌸')
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId('color_orange')
                .setLabel('برتقالي')
                .setEmoji('🟠')
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId('color_cyan')
                .setLabel('سماوي')
                .setEmoji('💠')
                .setStyle(ButtonStyle.Primary)
        );

    const row3 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('color_black')
                .setLabel('أسود')
                .setEmoji('⚫')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('color_white')
                .setLabel('أبيض')
                .setEmoji('⚪')
                .setStyle(ButtonStyle.Secondary)
        );

    await interaction.reply({ embeds: [embed], components: [row1, row2, row3], ephemeral: true });
}

// معالج اختيار اللون
async function handleColorButton(interaction) {
    const colorId = interaction.customId.replace('color_', '');
    const color = config.availableColors[colorId];
    const item = config.shopItems.profileColor;

    if (!color) {
        return interaction.reply({ content: '❌ لون غير معروف!', ephemeral: true });
    }

    const userData = db.getUserData(interaction.user.id);

    // فحص الرصيد
    if (userData.balance < item.price) {
        return interaction.update({
            content: `❌ ليس لديك ما يكفي! تحتاج ${item.price.toLocaleString()} ${config.currency}`,
            embeds: [],
            components: []
        });
    }

    // شراء اللون
    userData.balance -= item.price;
    userData.profileColor = color.hex;

    db.updateUserData(interaction.user.id, userData);
    db.addTransaction(interaction.user.id, 'purchase', -item.price, `Bought ${color.name} Profile Color`);

    const levels = require('../utils/levels');
    levels.addXP(interaction.user.id, Math.floor(item.price / 100), null);

    const achievements = require('../utils/achievements');
    achievements.checkAchievements(interaction.user.id, null);

    const embed = new EmbedBuilder()
        .setColor(color.hex)
        .setTitle('✅ تم تطبيق اللون!')
        .setDescription(`لون بروفايلك الآن: **${color.emoji} ${color.name}**`)
        .addFields(
            { name: 'رصيدك المتبقي', value: `${userData.balance.toLocaleString()} ${config.currency}` }
        )
        .setFooter({ text: 'شاهد !profile لرؤية التغيير' })
        .setTimestamp();

    await interaction.update({ embeds: [embed], components: [] });
}

module.exports = {
    handleShopButton,
    handleColorButton
};
