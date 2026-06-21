'use strict';

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║  💹 MARKET SYSTEM v3.0 — نظام الأسواق المالية الذكية من المستقبل       ║
 * ║  أسعار ديناميكية | تنبيهات السوق | محفظة استثمارية | رسوم بيانية       ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const db = require('../../utils/database');
const config = require('../../config');
const analytics = require('../../utils/analytics');
const achievementsCmd = require('./achievements-cmd');

// ─── الأصول المتاحة للتداول ───────────────────────────────────────────────────
const ASSETS = {
    gold: {
        name: 'ذهب', emoji: '🥇',
        basePrice: 5000, volatility: 0.03,
        trend: 0.001, // ميل إيجابي طفيف
        category: 'commodities'
    },
    silver: {
        name: 'فضة', emoji: '🥈',
        basePrice: 1500, volatility: 0.04,
        trend: 0.0005,
        category: 'commodities'
    },
    oil: {
        name: 'نفط', emoji: '🛢️',
        basePrice: 8000, volatility: 0.06,
        trend: 0.002,
        category: 'commodities'
    },
    tech: {
        name: 'تقنية', emoji: '💻',
        basePrice: 12000, volatility: 0.08,
        trend: 0.003,
        category: 'stocks'
    },
    gaming: {
        name: 'ألعاب', emoji: '🎮',
        basePrice: 6000, volatility: 0.10,
        trend: 0.002,
        category: 'stocks'
    },
    crypto: {
        name: 'كريبتو', emoji: '₿',
        basePrice: 25000, volatility: 0.15,
        trend: 0.005,
        category: 'crypto'
    },
    defi: {
        name: 'ديفاي', emoji: '🔗',
        basePrice: 3000, volatility: 0.20,
        trend: 0.004,
        category: 'crypto'
    },
    realestate: {
        name: 'عقارات', emoji: '🏠',
        basePrice: 20000, volatility: 0.02,
        trend: 0.001,
        category: 'real_estate'
    }
};

// ─── نظام الأسعار الديناميكي ──────────────────────────────────────────────────
let marketData = {};
let lastUpdate = 0;

function initMarketData() {
    for (const [key, asset] of Object.entries(ASSETS)) {
        if (!marketData[key]) {
            marketData[key] = {
                price: asset.basePrice,
                change24h: 0,
                history: [asset.basePrice],
                trend: asset.trend,
                lastShock: 0
            };
        }
    }
}

function updatePrices() {
    const now = Date.now();
    if (now - lastUpdate < 60000) return; // تحديث كل دقيقة كحد أدنى
    lastUpdate = now;

    initMarketData();

    for (const [key, asset] of Object.entries(ASSETS)) {
        const data = marketData[key];
        const prevPrice = data.price;

        // تذبذب عشوائي بناءً على الـ volatility
        const randomChange = (Math.random() - 0.45) * asset.volatility; // ميل طفيف للارتفاع
        const trendEffect = asset.trend;

        // صدمة سوقية عشوائية (نادرة)
        let shockEffect = 0;
        if (Math.random() < 0.02 && now - data.lastShock > 10 * 60 * 1000) { // 2% احتمال كل دقيقة
            shockEffect = (Math.random() - 0.5) * 0.3; // ±30% صدمة
            data.lastShock = now;
        }

        const totalChange = randomChange + trendEffect + shockEffect;
        data.price = Math.max(
            asset.basePrice * 0.2, // لا يقل عن 20% من السعر الأساسي
            Math.floor(prevPrice * (1 + totalChange))
        );

        data.change24h = ((data.price - prevPrice) / prevPrice) * 100;

        // حفظ السجل (آخر 50 سعر)
        data.history.push(data.price);
        if (data.history.length > 50) data.history.shift();
    }
}

function getPrice(assetKey) {
    updatePrices();
    return marketData[assetKey]?.price || ASSETS[assetKey]?.basePrice || 1000;
}

function getMarketStatus() {
    updatePrices();
    return Object.entries(marketData).map(([key, data]) => ({
        key,
        ...ASSETS[key],
        ...data
    }));
}

// ─── رسم بياني نصي للسعر ─────────────────────────────────────────────────────
function drawPriceChart(history) {
    const relevant = history.slice(-20);
    const max = Math.max(...relevant);
    const min = Math.min(...relevant);
    const range = max - min || 1;
    const height = 5;

    const rows = [];
    for (let row = height; row >= 1; row--) {
        const threshold = min + (range * row / height);
        const line = relevant.map(p => p >= threshold ? '█' : '░').join('');
        rows.push(line);
    }
    return rows.join('\n');
}

// ─── أمر السوق الرئيسي ───────────────────────────────────────────────────────
module.exports = {
    name: 'market',
    aliases: ['سوق', 'بورصة-جديدة', 'تداول', 'market'],
    description: 'سوق مالي متطور مع أسعار ديناميكية',
    usage: 'سوق [شراء|بيع|محفظة|أسعار] [أصل] [كمية]',

    async execute(message, args) {
        initMarketData();
        const sub = (args[0] || 'prices').toLowerCase();

        if (sub === 'أسعار' || sub === 'prices' || sub === 'سوق' || !args[0]) {
            return await showMarket(message);
        } else if (sub === 'شراء' || sub === 'buy') {
            return await buyAsset(message, args[1], parseInt(args[2]) || 1);
        } else if (sub === 'بيع' || sub === 'sell') {
            return await sellAsset(message, args[1], parseInt(args[2]) || 'all');
        } else if (sub === 'محفظة' || sub === 'portfolio') {
            return await showPortfolio(message);
        } else if (sub === 'رسم' || sub === 'chart') {
            return await showChart(message, args[1]);
        } else {
            return await showMarket(message);
        }
    }
};

async function showMarket(message) {
    updatePrices();
    const markets = getMarketStatus();

    const formatChange = (change) => {
        const sign = change >= 0 ? '+' : '';
        const icon = change >= 0 ? '📈' : '📉';
        return `${icon} \`${sign}${change.toFixed(2)}%\``;
    };

    const embed = new EmbedBuilder()
        .setColor('#00D2FF')
        .setTitle('📊 السوق المالي — أسعار مباشرة')
        .setDescription([
            '> جميع الأسعار تتغير ديناميكياً كل دقيقة!',
            '> اشترِ عند الانخفاض وبع عند الارتفاع 📈',
        ].join('\n'));

    const categories = {
        commodities: { name: '🌍 السلع', items: [] },
        stocks: { name: '📈 الأسهم', items: [] },
        crypto: { name: '₿ الكريبتو', items: [] },
        real_estate: { name: '🏠 العقارات', items: [] }
    };

    for (const m of markets) {
        const cat = categories[m.category];
        if (cat) {
            cat.items.push(
                `${m.emoji} **${m.name}** — \`${m.price.toLocaleString()} ${config.currency}\` ${formatChange(m.change24h)}`
            );
        }
    }

    for (const [, cat] of Object.entries(categories)) {
        if (cat.items.length > 0) {
            embed.addFields({ name: cat.name, value: cat.items.join('\n'), inline: false });
        }
    }

    embed.addFields({
        name: '💡 كيفية التداول',
        value: '`سوق شراء [أصل] [كمية]` — شراء أصل\n`سوق بيع [أصل] [كمية]` — بيع أصل\n`سوق محفظة` — عرض محفظتك\n\n**أمثلة الأصول:** `gold` `tech` `crypto` `oil` `gaming`',
        inline: false
    });

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('market_refresh')
            .setLabel('🔄 تحديث الأسعار')
            .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
            .setCustomId('market_portfolio')
            .setLabel('💼 محفظتي')
            .setStyle(ButtonStyle.Secondary)
    );

    const reply = await message.reply({ embeds: [embed], components: [row] });
    const collector = reply.createMessageComponentCollector({ time: 60000 });

    collector.on('collect', async (interaction) => {
        if (interaction.user.id !== message.author.id) {
            return interaction.reply({ content: '❌ ليس لك', flags: MessageFlags.Ephemeral });
        }
        if (interaction.customId === 'market_refresh') {
            updatePrices();
            embed.setTimestamp();
            await interaction.update({ embeds: [embed] });
        } else if (interaction.customId === 'market_portfolio') {
            await showPortfolioInteraction(interaction);
        }
    });
}

async function buyAsset(message, assetKey, quantity) {
    if (!assetKey || !ASSETS[assetKey]) {
        const assetList = Object.keys(ASSETS).join(', ');
        return message.reply(`❌ أصل غير صحيح! الأصول المتاحة: \`${assetList}\``);
    }

    const userId = message.author.id;
    const userData = db.getUserData(userId);
    const price = getPrice(assetKey);
    const totalCost = price * quantity;

    if ((userData.balance || 0) < totalCost) {
        return message.reply(`❌ رصيدك غير كافٍ! تحتاج: **${totalCost.toLocaleString()} ${config.currency}**`);
    }

    // تحديث المحفظة
    const portfolio = userData.portfolio || {};
    if (!portfolio[assetKey]) {
        portfolio[assetKey] = { quantity: 0, avgBuyPrice: 0, totalInvested: 0 };
    }

    const existing = portfolio[assetKey];
    const totalQty = existing.quantity + quantity;
    const newAvg = ((existing.avgBuyPrice * existing.quantity) + (price * quantity)) / totalQty;

    portfolio[assetKey] = {
        quantity: totalQty,
        avgBuyPrice: Math.floor(newAvg),
        totalInvested: existing.totalInvested + totalCost
    };

    db.updateFields(userId, {
        balance: (userData.balance || 0) - totalCost,
        portfolio
    });
    db.addTransaction(userId, 'market_buy', totalCost, `شراء ${quantity}x ${ASSETS[assetKey].name}`);
    analytics.trackEconomy('spend', totalCost, userId);

    const embed = new EmbedBuilder()
        .setColor('#00FF88')
        .setTitle(`✅ تم الشراء — ${ASSETS[assetKey].emoji} ${ASSETS[assetKey].name}`)
        .addFields(
            { name: '📦 الكمية', value: `\`${quantity}\` وحدة`, inline: true },
            { name: '💵 سعر الوحدة', value: `\`${price.toLocaleString()}\` ${config.currency}`, inline: true },
            { name: '💸 الإجمالي', value: `\`${totalCost.toLocaleString()}\` ${config.currency}`, inline: true },
            { name: '📊 إجمالي محفظتك', value: `\`${totalQty}\` وحدة @ متوسط \`${Math.floor(newAvg).toLocaleString()}\``, inline: false }
        )
        .setTimestamp();

    await message.reply({ embeds: [embed] });
    await achievementsCmd.checkAchievements(userId, 'balance_check', {}, message);
}

async function sellAsset(message, assetKey, quantityInput) {
    if (!assetKey || !ASSETS[assetKey]) {
        return message.reply(`❌ أصل غير صحيح!`);
    }

    const userId = message.author.id;
    const userData = db.getUserData(userId);
    const portfolio = userData.portfolio || {};
    const holding = portfolio[assetKey];

    if (!holding || holding.quantity <= 0) {
        return message.reply(`❌ لا تملك أي ${ASSETS[assetKey].emoji} **${ASSETS[assetKey].name}** للبيع!`);
    }

    const quantity = quantityInput === 'all' ? holding.quantity : Math.min(parseInt(quantityInput) || 1, holding.quantity);
    const price = getPrice(assetKey);
    const totalEarned = price * quantity;
    const profitLoss = totalEarned - (holding.avgBuyPrice * quantity);

    // تحديث المحفظة
    portfolio[assetKey].quantity -= quantity;
    if (portfolio[assetKey].quantity <= 0) {
        delete portfolio[assetKey];
    }

    db.updateFields(userId, {
        balance: (userData.balance || 0) + totalEarned,
        portfolio
    });
    db.addTransaction(userId, 'market_sell', totalEarned, `بيع ${quantity}x ${ASSETS[assetKey].name}`);
    analytics.trackEconomy('earn', totalEarned, userId);

    const isProfit = profitLoss >= 0;
    const embed = new EmbedBuilder()
        .setColor(isProfit ? '#00FF88' : '#FF4444')
        .setTitle(`${isProfit ? '✅' : '📉'} تم البيع — ${ASSETS[assetKey].emoji} ${ASSETS[assetKey].name}`)
        .addFields(
            { name: '📦 الكمية المباعة', value: `\`${quantity}\` وحدة`, inline: true },
            { name: '💵 سعر البيع', value: `\`${price.toLocaleString()}\` ${config.currency}`, inline: true },
            { name: '💰 الإيرادات', value: `\`${totalEarned.toLocaleString()}\` ${config.currency}`, inline: true },
            { name: isProfit ? '📈 الربح' : '📉 الخسارة', value: `\`${isProfit ? '+' : ''}${profitLoss.toLocaleString()}\` ${config.currency}`, inline: false }
        )
        .setTimestamp();

    await message.reply({ embeds: [embed] });
}

async function showPortfolio(message) {
    await showPortfolioForUser(message, message.author.id, (embed) => message.reply({ embeds: [embed] }));
}

async function showPortfolioInteraction(interaction) {
    await showPortfolioForUser(null, interaction.user.id, (embed) => interaction.update({ embeds: [embed] }));
}

async function showPortfolioForUser(message, userId, replyFn) {
    updatePrices();
    const userData = db.getUserData(userId);
    const portfolio = userData.portfolio || {};

    if (Object.keys(portfolio).length === 0) {
        const embed = new EmbedBuilder()
            .setColor('#95A5A6')
            .setTitle('💼 محفظتك الاستثمارية')
            .setDescription('> *محفظتك فارغة! ابدأ بشراء أصول من السوق.*\n> اكتب `سوق شراء [أصل] [كمية]`');
        return replyFn(embed);
    }

    let totalValue = 0;
    let totalInvested = 0;
    const fields = [];

    for (const [key, holding] of Object.entries(portfolio)) {
        const asset = ASSETS[key];
        if (!asset) continue;
        const currentPrice = getPrice(key);
        const currentValue = currentPrice * holding.quantity;
        const invested = holding.avgBuyPrice * holding.quantity;
        const pnl = currentValue - invested;
        const pnlPct = ((pnl / invested) * 100).toFixed(1);

        totalValue += currentValue;
        totalInvested += invested;

        fields.push({
            name: `${asset.emoji} ${asset.name}`,
            value: [
                `> **الكمية:** \`${holding.quantity}\``,
                `> **متوسط الشراء:** \`${holding.avgBuyPrice.toLocaleString()}\``,
                `> **السعر الحالي:** \`${currentPrice.toLocaleString()}\``,
                `> **القيمة:** \`${currentValue.toLocaleString()}\``,
                `> **P&L:** \`${pnl >= 0 ? '+' : ''}${pnl.toLocaleString()}\` (${pnl >= 0 ? '📈' : '📉'} ${pnlPct}%)`,
            ].join('\n'),
            inline: true
        });
    }

    const totalPnL = totalValue - totalInvested;
    const embed = new EmbedBuilder()
        .setColor(totalPnL >= 0 ? '#00FF88' : '#FF4444')
        .setTitle('💼 محفظتك الاستثمارية')
        .setDescription([
            `> **إجمالي القيمة:** \`${totalValue.toLocaleString()} ${config.currency}\``,
            `> **إجمالي الاستثمار:** \`${totalInvested.toLocaleString()} ${config.currency}\``,
            `> **الربح/الخسارة:** \`${totalPnL >= 0 ? '+' : ''}${totalPnL.toLocaleString()} ${config.currency}\``,
        ].join('\n'))
        .addFields(...fields)
        .setTimestamp();

    return replyFn(embed);
}

async function showChart(message, assetKey) {
    if (!assetKey || !ASSETS[assetKey]) {
        return message.reply(`❌ اكتب اسم الأصل! مثال: \`سوق رسم gold\``);
    }

    updatePrices();
    const data = marketData[assetKey];
    const asset = ASSETS[assetKey];

    if (!data || data.history.length < 2) {
        return message.reply('❌ لا توجد بيانات كافية بعد. انتظر قليلاً!');
    }

    const chart = drawPriceChart(data.history);
    const firstPrice = data.history[0];
    const currentPrice = data.price;
    const totalChange = ((currentPrice - firstPrice) / firstPrice * 100).toFixed(1);

    const embed = new EmbedBuilder()
        .setColor(parseFloat(totalChange) >= 0 ? '#00FF88' : '#FF4444')
        .setTitle(`📈 رسم بياني — ${asset.emoji} ${asset.name}`)
        .setDescription([
            '```',
            chart,
            '```',
            `**السعر الحالي:** \`${currentPrice.toLocaleString()} ${config.currency}\``,
            `**التغيير الإجمالي:** \`${parseFloat(totalChange) >= 0 ? '+' : ''}${totalChange}%\``,
        ].join('\n'))
        .setTimestamp();

    await message.reply({ embeds: [embed] });
}
