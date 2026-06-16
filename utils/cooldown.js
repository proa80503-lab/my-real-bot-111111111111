'use strict';

/**
 * مدير Cooldowns مركزي — يمنع spam الأوامر ويُنظَّف دورياً.
 *
 * الاستخدام:
 *   const cooldown = require('./cooldown');
 *   const result = cooldown.check('daily', userId, 86400000); // 24 ساعة
 *   if (result.onCooldown) return message.reply(result.message);
 */

/** Map<type, Map<userId, timestamp>> */
const _cooldowns = new Map();

// تنظيف الإدخالات المنتهية كل 5 دقائق لمنع memory leak
const _cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [type, userMap] of _cooldowns) {
        for (const [userId, expiresAt] of userMap) {
            if (now >= expiresAt) userMap.delete(userId);
        }
        if (userMap.size === 0) _cooldowns.delete(type);
    }
}, 5 * 60 * 1000);

// لا يمنع إغلاق البوت
_cleanupInterval.unref?.();

/**
 * التحقق من cooldown مستخدم لنوع معين.
 *
 * @param {string} type     - نوع الأمر (مثل: 'daily', 'work', 'rob')
 * @param {string} userId   - معرف المستخدم
 * @param {number} durationMs - مدة الـ cooldown بالمللي ثانية
 * @returns {{ onCooldown: boolean, remainingMs: number, message: string }}
 */
function check(type, userId, durationMs) {
    if (!_cooldowns.has(type)) _cooldowns.set(type, new Map());
    const userMap = _cooldowns.get(type);

    const now = Date.now();
    const expiresAt = userMap.get(userId);

    if (expiresAt && now < expiresAt) {
        const remainingMs = expiresAt - now;
        return {
            onCooldown: true,
            remainingMs,
            message: `⏳ انتظر **${_formatDuration(remainingMs)}** قبل استخدام هذا الأمر مجدداً.`,
        };
    }

    // تسجيل الـ cooldown
    userMap.set(userId, now + durationMs);
    return { onCooldown: false, remainingMs: 0, message: '' };
}

/**
 * إزالة cooldown مستخدم يدوياً (للأدمن أو في حالات الخطأ).
 *
 * @param {string} type
 * @param {string} userId
 */
function reset(type, userId) {
    _cooldowns.get(type)?.delete(userId);
}

/**
 * الحصول على الوقت المتبقي بالمللي ثانية (0 إذا لم يكن هناك cooldown).
 *
 * @param {string} type
 * @param {string} userId
 * @returns {number}
 */
function getRemaining(type, userId) {
    const expiresAt = _cooldowns.get(type)?.get(userId);
    if (!expiresAt) return 0;
    return Math.max(0, expiresAt - Date.now());
}

/**
 * تنسيق المدة الزمنية بشكل مقروء (عربي).
 * @param {number} ms
 * @returns {string}
 */
function _formatDuration(ms) {
    const seconds = Math.floor(ms / 1000);
    if (seconds < 60) return `${seconds} ثانية`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} دقيقة`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} ساعة`;
    const days = Math.floor(hours / 24);
    return `${days} يوم`;
}

module.exports = { check, reset, getRemaining };
