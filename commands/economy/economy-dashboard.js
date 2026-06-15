const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require('../../utils/database');
const config = require('../../config');
const { PremiumEmbedBuilder, ICONS } = require('../../utils/embed-builder');

// Dashboard اقتصادي شامل
async function economyDashboard(message, targetUser) {
    const user = targetUser || message.author;
    const userData = db.getUserData(user.id);

    // حساب الإحصائيات
    const totalWealth = (userData.balance || 0) + (userData.bank || 0) + (userData.investments?.total || 0);
    const netWorth = calculateNetWorth(userData);
    const wealthRank = getWealthRank(user.id);
    const dailyIncome = calculateDailyIncome(userData) || 0;
    const weeklyProfit = calculateWeeklyProfit(userData) || 0;
    const health = calculateFinancialHealth(userData, netWorth);

    // إنشاء Embed احترافي
    const embed = PremiumEmbedBuilder.custom({
        color: health.color,
        title: `💎 لوحة التحكم المالية - ${user.username}`,
        description: `صافي الثروة: **${netWorth.toLocaleString()}** ${config.currency}\nالصحة المالية: **${health.score}%** (${health.label})`,
        thumbnail: user.displayAvatarURL({ size: 256 })
    });

    // القسم 1: السيولة النقدية (الرصيد والبنك)
    embed.addFields({
        name: `💳 السيولة النقدية`,
        value:
            `**المحفظة**: ${(userData.balance || 0).toLocaleString()} ${config.currency}\n` +
            `**البنك**: ${(userData.bank || 0).toLocaleString()} ${config.currency}`,
        inline: true
    });

    // القسم 2: الملخص المالي
    embed.addFields({
        name: `📈 الملخص المالي`,
        value:
            `**الترتيب العالي**: #${wealthRank}\n` +
            `**الدخل اليومي**: +${dailyIncome.toLocaleString()} ${config.currency}\n` +
            `**الربح الأسبوعي**: ${weeklyProfit >= 0 ? '+' : ''}${weeklyProfit.toLocaleString()} ${config.currency}`,
        inline: true
    });

    // القسم 3: الاستثمارات والأصول
    const investmentInfo = getInvestmentSummary(userData);
    const propertyInfo = getPropertySummary(userData);
    const portfolioInfo = getPortfolioSummary(userData);

    let assetsSummary = '';
    if (investmentInfo.total > 0) assetsSummary += `💰 **الاستثمارات**: ${investmentInfo.total.toLocaleString()} ${config.currency}\n`;
    if (propertyInfo.count > 0) assetsSummary += `🏠 **العقارات**: ${propertyInfo.count} عقار\n`;
    if (portfolioInfo.value > 0) assetsSummary += `📊 **الأسهم**: ${portfolioInfo.value.toLocaleString()} ${config.currency}\n`;

    if (assetsSummary) {
        embed.addFields({
            name: `🏛️ الأصول والممتلكات`,
            value: assetsSummary,
            inline: false
        });
    }

    // القسم 4: القروض والديون
    const loanInfo = getLoanSummary(userData);
    if (loanInfo.hasLoans) {
        embed.addFields({
            name: `${ICONS.WARNING} الالتزامات المالية (الديون)`,
            value: loanInfo.summary,
            inline: false
        });
    }

    // Footer
    const wealthTier = getWealthTier(netWorth);
    embed.setFooter({
        text: `الفئة: ${wealthTier.name} ${wealthTier.emoji} | نظام مالي احترافي`,
        iconURL: user.displayAvatarURL()
    });

    // أزرار تفاعلية
    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('econ_dashboard_refresh')
                .setLabel('تحديث')
                .setEmoji('🔄')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('econ_dashboard_history')
                .setLabel('سجل العمليات')
                .setEmoji('📜')
                .setStyle(ButtonStyle.Secondary)
        );

    // التحقق من نوع الرسالة (تفاعل أم رسالة عادية)
    if (message.reply) {
        await message.reply({ embeds: [embed], components: [row] }).catch(() => { });
    } else if (message.update) {
        await message.update({ embeds: [embed], components: [row] }).catch(() => { });
    }
}

// حساب صافي الثروة (Net Worth)
function calculateNetWorth(userData) {
    let netWorth = (userData.balance || 0) + (userData.bank || 0);

    // إضافة قيمة الاستثمارات
    if (userData.investments?.total) {
        netWorth += userData.investments.total + (userData.investments.profit || 0);
    }

    // إضافة قيمة العقارات
    if (userData.properties) {
        if (Array.isArray(userData.properties)) {
            userData.properties.forEach(prop => {
                netWorth += getPropertyValue(prop.type);
            });
        } else {
            Object.keys(userData.properties).forEach(type => {
                netWorth += getPropertyValue(type);
            });
        }
    }

    // إضافة قيمة الأسهم
    if (userData.stocks) {
        Object.keys(userData.stocks).forEach(symbol => {
            const stock = userData.stocks[symbol];
            const currentPrice = getCurrentStockPrice(symbol);
            netWorth += (stock.shares || 0) * currentPrice;
        });
    }

    // طرح الديون
    if (Array.isArray(userData.loans) && userData.loans.length > 0) {
        userData.loans.forEach(loan => {
            netWorth -= loan.remaining || loan.amount || 0;
        });
    }

    return Math.max(0, Math.floor(netWorth));
}

// حساب الدخل اليومي
function calculateDailyIncome(userData) {
    let daily = 0;

    // دخل من الاستثمارات
    if (userData.investments?.total) {
        daily += Math.floor(userData.investments.total * (config.investmentRate || 0.01));
    }

    // دخل من العقارات (دعم المصفوفة والكائن)
    if (userData.properties) {
        if (Array.isArray(userData.properties)) {
            userData.properties.forEach(prop => {
                daily += getPropertyIncome(prop.type);
            });
        } else {
            Object.keys(userData.properties).forEach(type => {
                daily += getPropertyIncome(type);
            });
        }
    }

    // دخل من الشركة
    if (userData.company) {
        const employees = userData.company.employees?.length || 0;
        daily += employees * 500; // ربح لكل موظف
    }

    return daily;
}

// حساب الربح الأسبوعي
function calculateWeeklyProfit(userData) {
    if (!Array.isArray(userData.transactions) || userData.transactions.length === 0) return 0;

    const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    const weekTransactions = userData.transactions.filter(t => t.timestamp > oneWeekAgo);

    let profit = 0;
    weekTransactions.forEach(t => {
        if (['daily', 'work', 'weekly', 'investment_profit', 'rob_success', 'game_win'].includes(t.type)) {
            profit += (t.amount || 0);
        } else if (['purchase', 'robbed', 'game_loss'].includes(t.type)) {
            profit -= Math.abs(t.amount || 0);
        }
    });

    return Math.floor(profit);
}

// الحصول على ترتيب الثروة
function getWealthRank(userId) {
    const allUsers = db.loadDatabase().users || {};
    const userIds = Object.keys(allUsers);

    if (userIds.length === 0) return 1;

    const sorted = userIds
        .map(id => ({ id: id, wealth: calculateNetWorth(allUsers[id]) }))
        .sort((a, b) => b.wealth - a.wealth);

    const rank = sorted.findIndex(u => u.id === userId);
    return rank === -1 ? sorted.length + 1 : rank + 1;
}

// ملخص الاستثمارات
function getInvestmentSummary(userData) {
    if (!userData.investments || !userData.investments.total) {
        return { total: 0, summary: 'لا يوجد' };
    }

    const total = userData.investments.total;
    const profit = userData.investments.profit || 0;
    const rate = (config.investmentRate || 0.05) * 100;
    const dailyProfit = Math.floor(total * (config.investmentRate || 0.05));

    return {
        total: total + profit,
        summary:
            `**رأس المال**: ${total.toLocaleString()} ${config.currency}\n` +
            `**الأرباح**: ${profit.toLocaleString()} ${config.currency}\n` +
            `**الفائدة**: ${rate.toFixed(1)}% يومياً\n` +
            `**الربح اليومي**: +${dailyProfit.toLocaleString()} ${config.currency}`
    };
}

// ملخص العقارات
function getPropertySummary(userData) {
    if (!userData.properties) {
        return { count: 0, summary: 'لا يوجد' };
    }

    const propertyCounts = {};
    let totalValue = 0;
    let totalIncome = 0;
    let count = 0;

    if (Array.isArray(userData.properties)) {
        count = userData.properties.length;
        userData.properties.forEach(prop => {
            propertyCounts[prop.type] = (propertyCounts[prop.type] || 0) + 1;
            totalValue += getPropertyValue(prop.type);
            totalIncome += getPropertyIncome(prop.type);
        });
    } else {
        const keys = Object.keys(userData.properties);
        count = keys.length;
        keys.forEach(type => {
            propertyCounts[type] = (propertyCounts[type] || 0) + 1;
            totalValue += getPropertyValue(type);
            totalIncome += getPropertyIncome(type);
        });
    }

    if (count === 0) return { count: 0, summary: 'لا يوجد' };

    let summary = '';
    Object.keys(propertyCounts).forEach(type => {
        summary += `**${type}**: ${propertyCounts[type]}\n`;
    });
    summary += `**القيمة الكلية**: ${totalValue.toLocaleString()} ${config.currency}\n`;
    summary += `**الدخل اليومي**: +${totalIncome.toLocaleString()} ${config.currency}`;

    return {
        count,
        summary
    };
}

// ملخص المحفظة المالية
function getPortfolioSummary(userData) {
    if (!userData.stocks || Object.keys(userData.stocks).length === 0) {
        return { value: 0, summary: 'لا يوجد' };
    }

    let totalValue = 0;
    let totalInvestment = 0;
    const stocks = Object.keys(userData.stocks);

    stocks.forEach(symbol => {
        const stock = userData.stocks[symbol];
        const currentPrice = getCurrentStockPrice(symbol);
        totalValue += (stock.shares || 0) * currentPrice;
        totalInvestment += (stock.avgPrice || currentPrice) * (stock.shares || 0);
    });

    const profitLoss = totalValue - totalInvestment;
    const profitPercent = totalInvestment > 0 ? ((profitLoss / totalInvestment) * 100).toFixed(2) : 0;

    return {
        value: totalValue,
        summary:
            `**الأسهم**: ${stocks.length} شركة\n` +
            `**القيمة الحالية**: ${totalValue.toLocaleString()} ${config.currency}\n` +
            `**الربح/الخسارة**: ${profitLoss >= 0 ? '+' : ''}${profitLoss.toLocaleString()} (${profitPercent}%)`
    };
}

// ملخص القروض
function getLoanSummary(userData) {
    if (!userData.loans || userData.loans.length === 0) {
        return { hasLoans: false };
    }

    let totalDebt = 0;
    let totalInterest = 0;

    if (Array.isArray(userData.loans)) {
        userData.loans.forEach(loan => {
            totalDebt += loan.remaining || loan.amount || 0;
            totalInterest += (loan.remaining || loan.amount || 0) - (loan.original || 0);
        });
    }

    return {
        hasLoans: true,
        summary:
            `**عدد القروض**: ${userData.loans.length}\n` +
            `**إجمالي الديون**: ${totalDebt.toLocaleString()} ${config.currency}\n` +
            `**الفوائد المتراكمة**: ${totalInterest.toLocaleString()} ${config.currency}\n` +
            `⚠️ سدد قروضك لتجنب الفوائد!`
    };
}

// فئات الثروة
function getWealthTier(wealth) {
    if (wealth >= 1000000) return { name: 'مليونير', emoji: '💎' };
    if (wealth >= 500000) return { name: 'ثري جداً', emoji: '👑' };
    if (wealth >= 100000) return { name: 'غني', emoji: '💰' };
    if (wealth >= 50000) return { name: 'ميسور', emoji: '🌟' };
    if (wealth >= 10000) return { name: 'متوسط', emoji: '📊' };
    return { name: 'مبتدئ', emoji: '🌱' };
}

// Helper Functions
function getPropertyValue(type) {
    const values = { 'منزل صغير': 50000, 'فيلا': 200000, 'محل': 150000, 'مصنع': 500000 };
    return values[type] || 10000;
}

function getPropertyIncome(type) {
    const incomes = { 'منزل صغير': 100, 'فيلا': 500, 'محل': 300, 'مصنع': 1000 };
    return incomes[type] || 50;
}

function getCurrentStockPrice(symbol) {
    const prices = { 'TECH': 150, 'FOOD': 80, 'AUTO': 120, 'BANK': 100, 'ENERGY': 90 };
    return prices[symbol] || 100;
}

// حساب الصحة المالية
function calculateFinancialHealth(userData, netWorth) {
    let score = 100;

    // تأثر بالديون
    if (userData.loans?.length > 0) score -= 30;

    // تأثر بالفقر
    if (netWorth < 1000) score -= 40;
    else if (netWorth < 10000) score -= 20;

    // تأثر بتنوع الاستثمارات
    if ((userData.investments?.total || 0) > 0) score += 10;
    if (Object.keys(userData.properties || {}).length > 0) score += 10;

    score = Math.max(0, Math.min(100, score));

    let label = 'ممتازة';
    let color = '#2ECC71';
    if (score < 30) { label = 'حرجة'; color = '#E74C3C'; }
    else if (score < 60) { label = 'ضعيفة'; color = '#F1C40F'; }
    else if (score < 85) { label = 'جيدة'; color = '#3498DB'; }

    return { score, label, color };
}

module.exports = {
    // ─── واجهة الأمر المطلوبة من commandHandler ──────────────────
    name: 'economy-dashboard',
    aliases: ['لوحة-الاقتصاد'],
    description: 'لوحة التحكم المالية الشاملة',
    usage: 'economy-dashboard [@user]',

    async execute(message, args) {
        const targetUser = message.mentions.users.first() || null;
        await economyDashboard(message, targetUser);
    },

    // ─── export الدوال للاستخدام من ملفات أخرى ──────────────────
    economyDashboard,
    calculateNetWorth,
    calculateDailyIncome,
    getWealthTier,
};
