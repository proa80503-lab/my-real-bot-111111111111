'use strict';

/**
 * نظام تسجيل وتوجيه التفاعلات (Buttons, Modals, SelectMenus).
 * استبدال سلسلة if/else الكبيرة بنظام Registry قابل للتوسع.
 *
 * كيفية إضافة handler جديد:
 *   module.handlers.set('my_prefix_', myModule.handleMyInteraction);
 *   أو:
 *   module.exactHandlers.set('exact_custom_id', myModule.handleExact);
 */

const handlers = new Map(); // prefix → handler (string match)
const exactHandlers = new Map(); // customId === exact string → handler

/**
 * تسجيل handler بـ prefix
 * @param {string}   prefix
 * @param {Function} fn  async (interaction) => void
 */
function register(prefix, fn) {
    handlers.set(prefix, fn);
}

/**
 * تسجيل handler لـ customId بالضبط
 * @param {string}   customId
 * @param {Function} fn
 */
function registerExact(customId, fn) {
    exactHandlers.set(customId, fn);
}

/**
 * توجيه التفاعل للـ handler المناسب.
 * @param {import('discord.js').Interaction} interaction
 * @returns {Promise<boolean>} true إذا وُجِد handler
 */
async function dispatch(interaction) {
    const id = interaction.customId;

    // 1. البحث عن exact match
    if (exactHandlers.has(id)) {
        await exactHandlers.get(id)(interaction);
        return true;
    }

    // 2. البحث عن prefix match (بترتيب الطول تنازلياً لتفادي تعارض الـ prefixes)
    const sortedHandlers = [...handlers.entries()].sort((a, b) => b[0].length - a[0].length);
    for (const [prefix, fn] of sortedHandlers) {
        if (id.startsWith(prefix)) {
            await fn(interaction);
            return true;
        }
    }

    return false; // لا يوجد handler مسجل
}

module.exports = { register, registerExact, dispatch };
