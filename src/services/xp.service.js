'use strict';

const levels = require('../../utils/levels');

// XP Cooldown
const xpCooldowns = new Map();
const XP_COOLDOWN = 30000; // 30 seconds

// تنظيف xpCooldowns كل 5 دقائق
const _xpCleanup = setInterval(() => {
    const now = Date.now();
    for (const [uid, ts] of xpCooldowns) {
        if (now - ts > XP_COOLDOWN) xpCooldowns.delete(uid);
    }
}, 5 * 60 * 1000);
_xpCleanup.unref?.();

async function handleMessageXP(message) {
    // ── نظام الـ XP
    // التأكد من أن القناة عامة ومسموح التحدث فيها
    const isPublicChannel = message.guild
        ? (message.channel.permissionsFor(message.guild.roles.everyone)?.has('SendMessages') ?? true)
        : true;

    if (isPublicChannel) {
        const now = Date.now();
        const lastXP = xpCooldowns.get(message.author.id) || 0;
        if (now - lastXP >= XP_COOLDOWN) {
            xpCooldowns.set(message.author.id, now);
            await levels.addXP(message.author.id, 5, message);
        }
    }
}

module.exports = {
    handleMessageXP
};
