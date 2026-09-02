'use strict';

/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║  🔍 Channel Resolver — نظام التعرف الذكي على القنوات                      ║
 * ║  يبحث عن القنوات بالـ ID أولاً، ثم بالاسم، ثم يحفظها تلقائياً           ║
 * ║  يُستخدم من: punishments, logger, protection, owner-dashboard             ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */

const db = require('./database');

// ─── خريطة أسماء القنوات المعروفة ────────────────────────────────────────────
const CHANNEL_NAMES = {
    // قنوات سجلات وإدارة
    logChannel:         ['سجلات-كاملة', 'الحماية', 'سجلات', 'log', 'logs', 'bot-logs', 'سجل', 'audit-log'],
    punishmentsChannel: ['العقوبات', 'عقوبات', 'punishments', 'مخالفات'],
    ownerChannel:       ['لوحة-الأونر', 'لوحة-التحكم', 'owner', 'owner-panel', 'الأونر'],
    adminChannel:       ['الإدارة-العامة', 'ادارة', 'إدارة', 'admin', 'staff'],
    reportsChannel:     ['التقارير', 'تقارير', 'reports'],
    // قنوات عامة
    bankChannel:        ['البنك', 'bank', 'الاقتصاد'],
    gamesChannel:       ['الألعاب-المصغرة', 'الألعاب', 'games', 'ألعاب'],
    welcomeChannel:     ['الترحيب', 'welcome', 'ترحيب'],
    announcementsChannel: ['الإعلانات', 'اعلانات', 'announcements'],
    aiChannel:          ['البوت-الذكي', 'ai', 'ذكاء', 'الذكاء'],
    botChannel:         ['أوامر-البوت', 'بوت', 'bot-commands', 'commands'],
    leaderboardChannel: ['لوحة-الصدارة', 'صدارة', 'leaderboard'],
    colorsChannel:      ['اختيار-الألوان', 'ألوان', 'colors'],
    roomsChannel:       ['شرح-نظام-الغرف', 'غرف', 'rooms'],
    jailChannel:        ['السجن', 'سجن', 'jail'],
};

// ─── Cache لتسريع البحث ───────────────────────────────────────────────────────
const _cache = new Map(); // guildId_key → channelId

/**
 * يبحث عن قناة بذكاء:
 *  1. يجرب الـ ID المحفوظ في قاعدة البيانات
 *  2. يبحث عن قناة بالاسم
 *  3. يحفظ النتيجة تلقائياً في DB
 *
 * @param {Guild} guild
 * @param {string} key  مفتاح القناة (logChannel, punishmentsChannel, ...)
 * @returns {TextChannel|null}
 */
function resolve(guild, key) {
    if (!guild) return null;

    const cacheKey = `${guild.id}_${key}`;

    // ── 1. فحص الـ Cache أولاً ──────────────────────────────────────────────
    if (_cache.has(cacheKey)) {
        const cachedId = _cache.get(cacheKey);
        const ch = guild.channels.cache.get(cachedId);
        if (ch) return ch;
        _cache.delete(cacheKey); // القناة محذوفة → امسح من الـ cache
    }

    const guildData = db.getGuildData(guild.id);

    // ── 2. فحص قاعدة البيانات ───────────────────────────────────────────────
    if (guildData[key]) {
        const ch = guild.channels.cache.get(guildData[key]);
        if (ch) {
            _cache.set(cacheKey, ch.id);
            return ch;
        }
        // الـ ID مخزن لكن القناة محذوفة → مسح من DB
        db.updateGuildData(guild.id, { [key]: null });
    }

    // ── 3. البحث بالاسم ──────────────────────────────────────────────────────
    const names = CHANNEL_NAMES[key] || [];
    if (names.length > 0) {
        const found = guild.channels.cache.find(ch => {
            if (ch.type !== 0) return false; // GuildText فقط
            const chName = ch.name.toLowerCase().replace(/[┃•|]/g, '').trim();
            return names.some(n => chName.includes(n.toLowerCase()));
        });

        if (found) {
            // حفظ في DB و Cache
            db.updateGuildData(guild.id, { [key]: found.id });
            _cache.set(cacheKey, found.id);
            return found;
        }
    }

    return null;
}

/**
 * يحفظ قناة معروفة يدوياً في قاعدة البيانات
 * @param {string} guildId
 * @param {string} key
 * @param {string} channelId
 */
function save(guildId, key, channelId) {
    db.updateGuildData(guildId, { [key]: channelId });
    _cache.set(`${guildId}_${key}`, channelId);
}

/**
 * يمسح الـ Cache لسيرفر معين (بعد إعادة setup)
 * @param {string} guildId
 */
function invalidate(guildId) {
    for (const key of _cache.keys()) {
        if (key.startsWith(`${guildId}_`)) _cache.delete(key);
    }
}

/**
 * يفحص جميع مفاتيح القنوات للسيرفر ويحفظها دفعة واحدة
 * يُستخدم بعد setup لربط كل القنوات تلقائياً
 * @param {Guild} guild
 * @returns {Object} ملخص القنوات المكتشفة
 */
function scanAndSaveAll(guild) {
    const result = {};
    for (const key of Object.keys(CHANNEL_NAMES)) {
        const ch = resolve(guild, key);
        result[key] = ch ? ch.id : null;
    }
    return result;
}

/**
 * يُرسل embed إلى قناة بذكاء (مع fallback)
 * @param {Guild} guild
 * @param {string} key
 * @param {Object} payload  { embeds, content, components }
 * @param {TextChannel} [fallbackChannel]
 */
async function sendTo(guild, key, payload, fallbackChannel = null) {
    const ch = resolve(guild, key) || fallbackChannel;
    if (!ch) return false;
    try {
        await ch.send(payload);
        return true;
    } catch (err) {
        console.error(`[ChannelResolver] فشل الإرسال إلى ${key}:`, err.message);
        return false;
    }
}

module.exports = { resolve, save, invalidate, scanAndSaveAll, sendTo, CHANNEL_NAMES };
