const { EmbedBuilder } = require('discord.js');
const db = require('../../utils/database');
const config = require('../../config');
const { PremiumEmbedBuilder } = require('../../utils/embed-builder');

const stocks = {
    'AAPL': { name: 'Apple Inc.', price: 150, volatility: 0.05, trend: 0.001 },
    'GOOGL': { name: 'Alphabet Inc.', price: 2800, volatility: 0.04, trend: 0.002 },
    'MSFT': { name: 'Microsoft', price: 300, volatility: 0.03, trend: 0.0015 },
    'TSLA': { name: 'Tesla', price: 700, volatility: 0.1, trend: 0.005 },
    'AMZN': { name: 'Amazon', price: 3300, volatility: 0.04, trend: 0.001 }
};

// Update prices every 10 minutes
setInterval(() => {
    for (const [symbol, stock] of Object.entries(stocks)) {
        const change = (Math.random() - 0.5) * 2 * stock.volatility + stock.trend;
        stock.price = Math.max(10, stock.price * (1 + change));
    }
}, 10 * 60 * 1000);

module.exports = {
    name: 'stocks',
    aliases: ['بورصة', 'سهم', 'اسهم', 'أسهم'],
    description: 'سوق الأسهم التجاري',
    usage: 'بورصة [قائمة/شراء/بيع/محفظتي]',

    async execute(message, args) {
        const action = args[0]?.toLowerCase();

        if (!action || action === 'list' || action === 'قائمة') {
            const fields = Object.entries(stocks).map(([symbol, stock]) => ({
                name: `${symbol} - ${stock.name}`,
                value: `السعر: **${Math.floor(stock.price)}** ${config.currency}\nالتقلب: ${(stock.volatility * 100).toFixed(0)}%`,
                inline: true
            }));

            const embed = PremiumEmbedBuilder.economy(
                '📈 سوق الأسهم',
                'استثمر في الأسهم واربح!',
                fields
            );

            embed.addFields({
                name: '💡 الأوامر',
                value: '`بورصة شراء <رمز> <عدد>`\n`بورصة بيع <رمز> <عدد>`\n`بورصة محفظتي`'
            });

            return message.reply({ embeds: [embed] });
        }

        const userData = db.getUserData(message.author.id);

        if (action === 'buy' || action === 'شراء') {
            const symbol = args[1]?.toUpperCase();
            const amount = parseInt(args[2]);

            if (!symbol || !stocks[symbol]) {
                return message.reply('❌ رمز سهم غير صحيح! استخدم: `بورصة قائمة`');
            }

            if (!amount || amount <= 0) {
                return message.reply('❌ عدد الأسهم يجب أن يكون أكبر من 0');
            }

            const stock = stocks[symbol];
            const totalCost = Math.floor(stock.price * amount);

            if (userData.balance < totalCost) {
                return message.reply(`❌ ليس لديك ${totalCost} ${config.currency}! رصيدك: ${userData.balance}`);
            }

            userData.balance -= totalCost;
            if (!userData.stocks) userData.stocks = {};
            if (!userData.stocks[symbol]) userData.stocks[symbol] = 0;
            userData.stocks[symbol] += amount;

            db.updateUserData(message.author.id, userData);

            const embed = PremiumEmbedBuilder.success(
                'تم الشراء! 📈',
                `اشتريت **${amount}** سهم من ${stock.name}`,
                [
                    { name: 'السعر', value: `${Math.floor(stock.price)} ${config.currency}`, inline: true },
                    { name: 'الإجمالي', value: `${totalCost} ${config.currency}`, inline: true },
                    { name: 'رصيدك', value: `${userData.balance} ${config.currency}`, inline: true }
                ]
            );

            return message.reply({ embeds: [embed] });
        }

        if (action === 'sell' || action === 'بيع') {
            const symbol = args[1]?.toUpperCase();
            const amount = parseInt(args[2]);

            if (!symbol || !stocks[symbol]) {
                return message.reply('❌ رمز سهم غير صحيح!');
            }

            if (!amount || amount <= 0) {
                return message.reply('❌ عدد الأسهم يجب أن يكون أكبر من 0');
            }

            if (!userData.stocks || !userData.stocks[symbol] || userData.stocks[symbol] < amount) {
                return message.reply(`❌ ليس لديك ${amount} سهم من ${symbol}!`);
            }

            const stock = stocks[symbol];
            const totalValue = Math.floor(stock.price * amount);

            userData.balance += totalValue;
            userData.stocks[symbol] -= amount;
            if (userData.stocks[symbol] === 0) delete userData.stocks[symbol];

            db.updateUserData(message.author.id, userData);

            const embed = PremiumEmbedBuilder.success(
                'تم البيع! 💰',
                `بعت **${amount}** سهم من ${stock.name}`,
                [
                    { name: 'السعر', value: `${Math.floor(stock.price)} ${config.currency}`, inline: true },
                    { name: 'الإجمالي', value: `${totalValue} ${config.currency}`, inline: true },
                    { name: 'رصيدك', value: `${userData.balance} ${config.currency}`, inline: true }
                ]
            );

            return message.reply({ embeds: [embed] });
        }

        if (action === 'portfolio' || action === 'محفظتي') {
            if (!userData.stocks || Object.keys(userData.stocks).length === 0) {
                return message.reply('❌ ليس لديك أي أسهم!');
            }

            const fields = [];
            let totalValue = 0;

            for (const [symbol, amount] of Object.entries(userData.stocks)) {
                const stock = stocks[symbol];
                const value = Math.floor(stock.price * amount);
                totalValue += value;

                fields.push({
                    name: `${symbol} - ${stock.name}`,
                    value: `العدد: **${amount}**\nالقيمة: **${value}** ${config.currency}`,
                    inline: true
                });
            }

            const embed = PremiumEmbedBuilder.economy(
                '💼 محفظة الأسهم',
                `القيمة الإجمالية: **${totalValue}** ${config.currency}`,
                fields
            );

            return message.reply({ embeds: [embed] });
        }
    }
};
