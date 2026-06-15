'use strict';

const { EmbedBuilder } = require('discord.js');
const db = require('../../utils/database');
const config = require('../../config');
const levels = require('../../utils/levels');

module.exports = {
    name: 'invest',
    aliases: ['استثمار', 'inv'],
    description: 'استثمار المال للحصول على ربح يومي 2%',
    usage: '!استثمار <المبلغ/كامل/نصف/ربع>',

    async execute(message, args) {
        if (!args[0]) {
            const userData = db.getUserData(message.author.id);
            const current = userData.investment || 0;
            const dailyProfit = current > 0 ? Math.floor(current * (config.investmentRate || 0.02)) : 0;
            const maxInv = config.maxInvestment || 1000000;

            return message.reply(
                `📈 **نظام الاستثمار**\n\n` +
                `• نسبة الربح: **${((config.investmentRate || 0.02) * 100).toFixed(0)}%** يومياً\n` +
                `• استثمارك الحالي: **${current.toLocaleString()}** ${config.currency}\n` +
                `• ربحك اليومي: **${dailyProfit.toLocaleString()}** ${config.currency}\n` +
                `• الحد الأقصى: **${maxInv.toLocaleString()}** ${config.currency}\n\n` +
                `الاستخدام: \`!استثمار <مبلغ>\`\nأمثلة: \`!استثمار 5000\` | \`!استثمار كامل\` | \`!استثمار نصف\``
            );
        }

        const userData = db.getUserData(message.author.id);
        const maxInv = config.maxInvestment || 1000000;
        let amount;

        const option = args[0].toLowerCase().trim();
        if (['كامل', 'الكل', 'all', 'كله'].includes(option)) {
            amount = userData.balance || 0;
        } else if (['نص', 'نصف', 'half'].includes(option)) {
            amount = Math.floor((userData.balance || 0) / 2);
        } else if (['ربع', 'quarter'].includes(option)) {
            amount = Math.floor((userData.balance || 0) / 4);
        } else {
            amount = parseInt(args[0].replace(/,/g, ''));
        }

        if (!amount || isNaN(amount) || amount <= 0) {
            return message.reply('❌ يجب تحديد مبلغ صحيح للاستثمار!');
        }

        if (amount < (config.investmentMinAmount || 1000)) {
            return message.reply(`❌ الحد الأدنى للاستثمار هو **${(config.investmentMinAmount || 1000).toLocaleString()}** ${config.currency}!`);
        }

        // فحص الحد الأقصى للاستثمار الكلي
        const currentInvestment = userData.investment || 0;
        if (currentInvestment + amount > maxInv) {
            const canAdd = maxInv - currentInvestment;
            if (canAdd <= 0) {
                return message.reply(`❌ وصلت للحد الأقصى للاستثمار (**${maxInv.toLocaleString()}** ${config.currency})!\nاسحب بعض الاستثمار أولاً.`);
            }
            return message.reply(`❌ يمكنك إضافة **${canAdd.toLocaleString()}** فقط (الحد الأقصى: ${maxInv.toLocaleString()})!`);
        }

        if ((userData.balance || 0) < amount) {
            return message.reply(`❌ ليس لديك رصيد كافٍ! محفظتك: **${(userData.balance || 0).toLocaleString()}** ${config.currency}`);
        }

        const newInvestment = currentInvestment + amount;
        const dailyProfit = Math.floor(newInvestment * (config.investmentRate || 0.02));

        db.updateFields(message.author.id, {
            balance: (userData.balance || 0) - amount,
            investment: newInvestment,
            lastInvestment: Date.now(),
            lastCollect: userData.lastCollect || Date.now() // تعيين آخر جمع إذا لم يكن موجوداً
        });
        db.addTransaction(message.author.id, 'invest', -amount, `Investment: +${amount}`);

        const embed = new EmbedBuilder()
            .setColor('#FFD700')
            .setTitle('📈 استثمار ناجح!')
            .setDescription(`تم استثمار **${amount.toLocaleString()} ${config.currency}** بنجاح!`)
            .addFields(
                { name: '💼 إجمالي استثمارك', value: `${newInvestment.toLocaleString()} ${config.currency}`, inline: true },
                { name: '💰 الربح اليومي المتوقع', value: `${dailyProfit.toLocaleString()} ${config.currency} (${((config.investmentRate || 0.02) * 100).toFixed(0)}%)`, inline: true },
                { name: '📊 الحد الأقصى', value: `${maxInv.toLocaleString()} ${config.currency}`, inline: true }
            )
            .setFooter({ text: 'اكتب "جمع" يومياً لاستلام الأرباح! (أقصى 30 يوم دفعة واحدة)' })
            .setTimestamp();

        message.reply({ embeds: [embed] });
    }
};
