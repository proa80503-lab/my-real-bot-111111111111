'use strict';

const db = require('../../utils/database');
const config = require('../../config');
const { PremiumEmbedBuilder } = require('../../utils/embed-builder');

module.exports = {
    name: 'rob',
    aliases: ['سرقة', 'انشل', 'اسرق', 'steal'],
    description: 'محاولة سرقة المال من مستخدم آخر (40% نجاح، كولداون 24 ساعة)',
    usage: 'rob @user',

    async execute(message) {
        try {
            const target = message.mentions.users.first();
            if (!target) return message.reply('❌ منشن الشخص المراد سرقته!\nمثال: `سرقة @شخص`');
            if (target.id === message.author.id) return message.reply('❌ لا يمكنك سرقة نفسك!');
            if (target.bot) return message.reply('❌ لا يمكنك سرقة بوت!');

            const userData = db.getUserData(message.author.id);
            const targetData = db.getUserData(target.id);
            const now = Date.now();
            const cooldown = 86400000; // 24 ساعة

            // ── فحص الكولداون
            if (userData.lastRob && (now - userData.lastRob) < cooldown) {
                if (userData.robCharges && userData.robCharges > 0) {
                    // يستخدم محاولة إضافية من طقم السرقة
                } else {
                    const timeLeft = cooldown - (now - userData.lastRob);
                    const hours = Math.floor(timeLeft / 3600000);
                    const minutes = Math.floor((timeLeft % 3600000) / 60000);
                    return message.reply(
                        `⏰ يمكنك السرقة مرة أخرى بعد **${hours}** ساعة و **${minutes}** دقيقة!\n` +
                        `*(يمكنك شراء \"طقم السرقة\" من المتجر لمحاولات إضافية)*`
                    );
                }
            }

            // ── فحص مناعة الهدف الدائمة (VIP)
            if (targetData.robImmunity) {
                return message.reply('🛡️ هذا الشخص يملك **مناعة دائمة** ضد السرقة! (عنصر VIP)');
            }

            // ── فحص درع الحماية
            if (targetData.robShieldUntil && now < targetData.robShieldUntil) {
                const hoursLeft = Math.ceil((targetData.robShieldUntil - now) / 3600000);
                return message.reply(`🛡️ هذا الشخص محمي بدرع حماية! متبقي **${hoursLeft}** ساعة.`);
            }

            // ── فحص الحد الأدنى لرصيد الهدف (من المحفظة فقط — لا نسرق من البنك)
            const targetBalance = targetData.balance || 0;
            if (targetBalance < 500) {
                return message.reply(`❌ هذا الشخص رصيد محفظته أقل من **500** ${config.currency} — لا يستحق السرقة!`);
            }

            // ── تحديد نسبة النجاح
            const hasLuck = userData.luckBoostUntil && now < userData.luckBoostUntil;
            const usingCharge = userData.lastRob && (now - userData.lastRob) < cooldown && userData.robCharges > 0;
            const successRate = hasLuck ? 0.55 : 0.40;
            const success = Math.random() < successRate;

            // ── تحديث الكولداون
            const updates = { lastRob: now };
            if (usingCharge) updates.robCharges = userData.robCharges - 1;

            if (success) {
                // المبلغ المسروق: 10% إلى 25% من رصيد الهدف (لا تتجاوز 25%)
                const pct = Math.random() * 0.15 + 0.10; // 10%-25%
                const amount = Math.floor(targetBalance * pct);

                // فحص: لا تسرق أكثر مما يملك
                const safeAmount = Math.min(amount, targetBalance);
                if (safeAmount <= 0) {
                    return message.reply('❌ لا يوجد ما يكفي للسرقة!');
                }

                db.addMoney(message.author.id, safeAmount);
                db.removeMoney(target.id, safeAmount);
                db.updateFields(message.author.id, updates);
                db.addTransaction(message.author.id, 'rob_success', safeAmount, `Robbed ${target.username}`);
                db.addTransaction(target.id, 'robbed', -safeAmount, `Robbed by ${message.author.username}`);

                const embed = PremiumEmbedBuilder.success(
                    '🕵️ سرقة ناجحة!',
                    `لقد سرقت **${safeAmount.toLocaleString()} ${config.currency}** من ${target}!` +
                    (hasLuck ? '\n🍀 *جرعة الحظ ساعدتك!*' : '') +
                    (usingCharge ? `\n🎟️ *تم استهلاك محاولة (متبقي: ${updates.robCharges})*` : ''),
                    [
                        { name: '💰 رصيدك الجديد', value: `${(db.getUserData(message.author.id).balance || 0).toLocaleString()} ${config.currency}`, inline: true },
                        { name: '⏰ التالية بعد', value: usingCharge ? 'فوراً (إذا عندك محاولات)' : '24 ساعة', inline: true }
                    ]
                );
                message.reply({ embeds: [embed] });

            } else {
                // الفشل: غرامة 10% من رصيد السارق فقط (من المحفظة)
                const robberBalance = userData.balance || 0;
                const fine = Math.floor(robberBalance * 0.10);

                if (fine > 0) db.removeMoney(message.author.id, fine);
                db.updateFields(message.author.id, updates);
                db.addTransaction(message.author.id, 'rob_fail', -fine, `Rob failed, fined`);

                const embed = PremiumEmbedBuilder.error(
                    '🚑 فشلت السرقة!',
                    `تم الإمساك بك وتغريمت **${fine.toLocaleString()} ${config.currency}**!` +
                    (hasLuck ? '\n🍀 *حتى جرعة الحظ لم تنقذك!*' : '') +
                    (usingCharge ? `\n🎟️ *تم استهلاك محاولة (متبقي: ${updates.robCharges})*` : '')
                );
                message.reply({ embeds: [embed] });
            }

        } catch (error) {
            console.error('[rob error]:', error);
            message.reply('❌ حدث خطأ في أمر السرقة.').catch(() => { });
        }
    }
};
