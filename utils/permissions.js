'use strict';

/**
 * ======================================================
 * 🔑 نظام الصلاحيات المركزي
 * ======================================================
 * صاحب البوت يتخطى جميع فحوصات الصلاحيات تلقائياً.
 * باقي الأعضاء يخضعون للصلاحيات المطلوبة كالمعتاد.
 * ======================================================
 */

const config = require('../config');

/**
 * هل المستخدم هو صاحب البوت؟
 * @param {string} userId - معرف المستخدم
 * @returns {boolean}
 */
function isOwner(userId) {
    return String(userId) === String(config.ownerId);
}

/**
 * هل للعضو الصلاحية المطلوبة — أو هو صاحب البوت؟
 * @param {import('discord.js').GuildMember} member - العضو
 * @param {bigint|bigint[]} permission - الصلاحية أو مصفوفة صلاحيات
 * @returns {boolean}
 */
function hasPermOrOwner(member, permission) {
    if (!member) return false;
    // صاحب البوت يتخطى الكل
    if (isOwner(member.user?.id || member.id)) return true;
    // عضو عادي — فحص الصلاحيات
    if (Array.isArray(permission)) {
        return permission.every(p => member.permissions.has(p));
    }
    return member.permissions.has(permission);
}

/**
 * الحصول على userId من سياق الأمر (رسالة أو تفاعل)
 * @param {import('discord.js').Message|import('discord.js').Interaction} context
 * @returns {string}
 */
function getAuthorId(context) {
    return context.author?.id || context.user?.id || '';
}

/**
 * الحصول على المستخدم (User) من سياق الأمر
 * @param {import('discord.js').Message|import('discord.js').Interaction} context
 * @returns {import('discord.js').User}
 */
function getAuthor(context) {
    return context.author || context.user;
}

/**
 * الحصول على الـ GuildMember من سياق الأمر
 * @param {import('discord.js').Message|import('discord.js').Interaction} context
 * @returns {import('discord.js').GuildMember|null}
 */
function getMember(context) {
    return context.member || null;
}

module.exports = { isOwner, hasPermOrOwner, getAuthorId, getAuthor, getMember };
