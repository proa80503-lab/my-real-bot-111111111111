'use strict';

const { EmbedBuilder } = require('discord.js');
const db = require('../../utils/database');
const config = require('../../config');
const levels = require('../../utils/levels');

module.exports = {
    name: 'collect',
    aliases: ['جمع', 'coll'],
    description: 'جمع أرباح الاستثمار اليومية (2% يومياً، أقصى 30 يوم)',
    usage: '!جمع',

    async execute(message) {
        const userData = db.getUserData(message.author.id);

        if (!userData.investment || userData.investment === 0) {
            return message.reply('❌ ليس لديك أي استثمارات!\nاكتب `!استثمار <مبلغ>` للبدء.');
        }

        const now = Date.now();
        const msPerDay = 86400000;
        // FIX: إذا لم يكن lastCollect موجوداً، نستخدم lastInvestment كنقطة بداية
        // لكن نحدد الأيام المعتبرة بـ 7 أيام كحد أقصى لأول مرة جمع (منع الاستغلال)
        const isFirstCollect = !userData.lastCollect;
        const lastCollect = userData.lastCollect || userData.lastInvestment || now;

        // حد أقصى لأيام الجمع (30 يوم عادي، 7 أيام لأول جمع)
        const maxDays = isFirstCollect ? 7 : (config.investmentMaxDays || 30);
        const rawDays = Math.floor((now - lastCollect) / msPerDay);
        const daysPassed = Math.min(rawDays, maxDays);

        if (daysPassed === 0) {
            const timeLeft = msPerDay - (now - lastCollect);
            const hours = Math.floor(timeLeft / 3600000);
            const minutes = Math.floor((timeLeft % 3600000) / 60000);
            return message.reply(`⏰ يمكنك جمع أرباحك بعد **${hours} ساعة و ${minutes} دقيقة**!`);
        }

        const rate = config.investmentRate || 0.02;
        const profit = Math.floor(userData.investment * rate * daysPassed);

        // فحص: الربح لا يتجاوز قيمة الاستثمار الأصلية (أمان إضافي)
        const safeProfit = Math.min(profit, userData.investment * maxDays * rate);

        const actualAdded = db.addMoney(message.author.id, safeProfit);
        db.updateFields(message.author.id, { lastCollect: now });
        db.addTransaction(message.author.id, 'invest_profit', actualAdded, `Investment Profit: ${daysPassed} days`);

        // XP مناسب
        levels.addXP(message.author.id, Math.min(Math.floor(safeProfit / 100), 50), message);

        const embed = new EmbedBuilder()
            .setColor('#00FF7F')
            .setTitle('💰 جمع أرباح الاستثمار!')
            .setDescription(
                `✅ تم جمع **${actualAdded.toLocaleString()} ${config.currency}** من أرباح **${daysPassed}** يوم!` +
                (rawDays > maxDays ? `\n⚠️ *تم تحديد الجمع بـ${maxDays} يوم كحد أقصى*` : '')
            )
            .addFields(
                { name: '💰 محفظتك', value: `${((userData.balance || 0) + safeProfit).toLocaleString()} ${config.currency}`, inline: true },
                { name: '💼 استثمارك', value: `${userData.investment.toLocaleString()} ${config.currency}`, inline: true },
                { name: '📈 الربح اليومي', value: `${Math.floor(userData.investment * rate).toLocaleString()} ${config.currency}`, inline: true }
            )
            .setFooter({ text: 'عُد يومياً لجمع أرباحك!' })
            .setTimestamp();

        message.reply({ embeds: [embed] });
    }
};
