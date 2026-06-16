'use strict';

/**
 * مساعدات التحقق من المدخلات وتحليلها.
 * تُستخدم داخل الأوامر لمنع الاستغلال وتوحيد معالجة الأخطاء.
 */

/**
 * تحليل مبلغ مالي من نص (يدعم k/m كاختصارات).
 * أمثلة: '1k' → 1000 | '2.5m' → 2500000 | 'all' → Infinity
 *
 * @param {string} str - النص المُدخَل
 * @returns {number|null} - الرقم أو null إذا كان غير صالح
 */
function parseAmount(str) {
    if (typeof str !== 'string') return null;
    const s = str.trim().toLowerCase();
    if (s === 'all' || s === 'كل' || s === 'الكل') return Infinity;

    const multipliers = { k: 1_000, m: 1_000_000 };
    const match = s.match(/^(\d+(?:\.\d+)?)([km])?$/);
    if (!match) return null;

    const num = parseFloat(match[1]);
    const mul = match[2] ? multipliers[match[2]] : 1;
    const result = Math.floor(num * mul);

    return isNaN(result) || result <= 0 ? null : result;
}

/**
 * التحقق من أن قيمة عدد صحيح موجب ضمن نطاق.
 *
 * @param {any}    val  - القيمة
 * @param {number} [min=1]
 * @param {number} [max=Infinity]
 * @returns {boolean}
 */
function isPositiveInteger(val, min = 1, max = Infinity) {
    const n = Number(val);
    return Number.isInteger(n) && n >= min && n <= max;
}

/**
 * تنظيف نص مستخدم: إزالة mention formatting وتحديد الطول.
 *
 * @param {string} str
 * @param {number} [maxLen=200]
 * @returns {string}
 */
function sanitizeText(str, maxLen = 200) {
    if (typeof str !== 'string') return '';
    return str
        .replace(/@(everyone|here)/gi, '@\u200bzero-width') // منع mass mention
        .slice(0, maxLen)
        .trim();
}

/**
 * استخراج مستخدم من أول mention في الرسالة أو أول argument.
 * إرجاع null إذا لم يوجد.
 *
 * @param {import('discord.js').Message} message
 * @param {string[]} args
 * @returns {import('discord.js').User|null}
 */
function resolveUser(message, args) {
    // من المنشن
    if (message.mentions.users.size > 0) return message.mentions.users.first();
    // من معرف مباشر في args[0]
    if (args[0] && /^\d{17,20}$/.test(args[0])) {
        return message.client.users.cache.get(args[0]) || null;
    }
    return null;
}

/**
 * التحقق من أن المستخدم لديه رصيد كافٍ.
 *
 * @param {object}  userData  - بيانات المستخدم من database
 * @param {number}  amount    - المبلغ المطلوب
 * @param {'balance'|'bank'} [source='balance'] - مصدر الأموال
 * @returns {{ valid: boolean, available: number, message: string }}
 */
function checkSufficientFunds(userData, amount, source = 'balance') {
    const available = userData[source] || 0;
    if (amount === Infinity) return { valid: true, available, actual: available };
    if (available < amount) {
        return {
            valid: false,
            available,
            message: `❌ رصيدك غير كافٍ! لديك **${available.toLocaleString()}** فقط.`,
        };
    }
    return { valid: true, available, actual: amount };
}

module.exports = {
    parseAmount,
    isPositiveInteger,
    sanitizeText,
    resolveUser,
    checkSufficientFunds,
};
