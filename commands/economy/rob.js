'use strict';

const db = require('../../utils/database');
const config = require('../../config');
const { PremiumEmbedBuilder } = require('../../utils/embed-builder');

const ROB_COOLDOWN = 86_400_000; // 24 ساعة
const MIN_TARGET_BALANCE = 500;
const ROB_PCT_MIN = 0.10;
const ROB_PCT_MAX = 0.25;
const FINE_PCT = 0.10;

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

            // ── فحص الكولداون ──────────────────────────────────────────
            const sinceLastRob = userData.lastRob ? now - userData.lastRob : ROB_COOLDOWN;
            const usingCharge = sinceLastRob < ROB_COOLDOWN && (userData.robCharges || 0) > 0;

            if (sinceLastRob < ROB_COOLDOWN && !usingCharge) {
                const timeLeft = ROB_COOLDOWN - sinceLastRob;
                const hours = Math.floor(timeLeft / 3_600_000);
                const minutes = Math.floor((timeLeft % 3_600_000) / 60_000);
                return message.reply(
                    `⏰ يمكنك السرقة مرة أخرى بعد **${hours}** ساعة و **${minutes}** دقيقة!\n` +
                    `*(يمكنك شراء "طقم السرقة" من المتجر لمحاولات إضافية)*`
                );
            }

            // ── فحص المناعة الدائمة ────────────────────────────────────
            if (targetData.robImmunity) {
                return message.reply('🛡️ هذا الشخص يملك **مناعة دائمة** ضد السرقة! (عنصر VIP)');
            }

            // ── فحص درع الحماية المؤقت ────────────────────────────────
            if (targetData.robShieldUntil && now < targetData.robShieldUntil) {
                const hoursLeft = Math.ceil((targetData.robShieldUntil - now) / 3_600_000);
                return message.reply(`🛡️ هذا الشخص محمي بدرع حماية! متبقي **${hoursLeft}** ساعة.`);
            }

            // ── رصيد الهدف (من المحفظة فقط — البنك محمي) ────────────
            const targetBalance = targetData.balance || 0;
            if (targetBalance < MIN_TARGET_BALANCE) {
                return message.reply(
                    `❌ رصيد ${target.username} في المحفظة أقل من **${MIN_TARGET_BALANCE.toLocaleString()} ${config.currency}** — لا تستحق المجازفة!`
                );
            }

            // ── نسبة النجاح ────────────────────────────────────────────
            const hasLuck = userData.luckBoostUntil && now < userData.luckBoostUntil;
            const successRate = hasLuck ? 0.55 : 0.40;
            const success = Math.random() < successRate;

            // ── تحديث الكولداون دائماً (سواء نجح أو فشل) ─────────────
            const updates = { lastRob: now };
            if (usingCharge) updates.robCharges = (userData.robCharges || 1) - 1;
            db.updateFields(message.author.id, updates);

            if (success) {
                const pct = Math.random() * (ROB_PCT_MAX - ROB_PCT_MIN) + ROB_PCT_MIN;
                const amount = Math.min(Math.floor(targetBalance * pct), targetBalance);

                if (amount <= 0) {
                    return message.reply('❌ المبلغ المحتسب صفر — لا يمكن السرقة!');
                }

                db.addMoney(message.author.id, amount);
                db.removeMoney(target.id, amount);
                db.addTransaction(message.author.id, 'rob_success', amount, `Robbed ${target.username}`);
                db.addTransaction(target.id, 'robbed', -amount, `Robbed by ${message.author.username}`);

                const newBal = (db.getUserData(message.author.id).balance || 0);
                const extraNotes = [
                    hasLuck ? '🍀 جرعة الحظ ساعدتك!' : null,
                    usingCharge ? `🎟️ تم استهلاك محاولة (متبقي: ${updates.robCharges})` : null,
                ].filter(Boolean).join('\n');

                const embed = PremiumEmbedBuilder.success(
                    '🕵️ سرقة ناجحة!',
                    `سرقت **${amount.toLocaleString()} ${config.currency}** من **${target.username}**!` +
                    (extraNotes ? `\n${extraNotes}` : ''),
                    [
                        { name: '💰 رصيدك الجديد', value: `${newBal.toLocaleString()} ${config.currency}`, inline: true },
                        { name: '⏰ الكولداون التالي', value: usingCharge ? 'فوري (إذا بقيت محاولات)' : '24 ساعة', inline: true },
                    ]
                );
                return message.reply({ embeds: [embed] });

            } else {
                const robberBalance = userData.balance || 0;
                const fine = Math.floor(robberBalance * FINE_PCT);

                if (fine > 0) db.removeMoney(message.author.id, fine);
                db.addTransaction(message.author.id, 'rob_fail', -fine, 'Rob failed — fined');

                const extraNotes = [
                    hasLuck ? '🍀 حتى جرعة الحظ لم تنفعك!' : null,
                    usingCharge ? `🎟️ تم استهلاك محاولة (متبقي: ${updates.robCharges})` : null,
                    fine === 0 ? '(لم تُغرَّم لأن محفظتك فارغة)' : null,
                ].filter(Boolean).join('\n');

                const embed = PremiumEmbedBuilder.error(
                    '🚑 فشلت السرقة!',
                    `تم إمساكك وغُرِّمت **${fine.toLocaleString()} ${config.currency}**!` +
                    (extraNotes ? `\n${extraNotes}` : '')
                );
                return message.reply({ embeds: [embed] });
            }

        } catch (err) {
            console.error('[rob] خطأ:', err);
            message.reply('❌ حدث خطأ غير متوقع في أمر السرقة.').catch(() => {});
        }
    },
};
