'use strict';

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║  🛡️ ADVANCED SECURITY v4.0 — نظام الأمان المتقدم من الجيل القادم       ║
 * ║  كشف التهديدات الذكي | تحليل السلوك | حجب التصيد الاحتيالي              ║
 * ║  Anti-Bot | Anti-Raid v2 | تصنيف المخاطر | نقاط الثقة                  ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');

// ─── نقاط الثقة لكل مستخدم (0-100) ─────────────────────────────────────────
const trustScores = new Map(); // userId -> { score, violations, lastUpdate }
const TRUST_DECAY_RATE = 5; // زيادة الثقة كل ساعة بدون مخالفات
const TRUST_VIOLATION_PENALTY = {
    spam: 15,
    bad_word: 20,
    duplicate: 10,
    mention_spam: 18,
    emoji_spam: 8,
    caps: 5,
    phishing: 50,
    raid: 40
};

// ─── تحليل سلوك المستخدم على مدى الوقت ──────────────────────────────────────
const behaviorProfiles = new Map(); // userId -> BehaviorProfile

class BehaviorProfile {
    constructor(userId) {
        this.userId = userId;
        this.messageTimestamps = [];
        this.messageContents = [];
        this.violations = [];
        this.riskScore = 0; // 0-100
        this.flaggedAt = null;
        this.isNewAccount = false;
        this.joinedAt = Date.now();
        this.avgMessageLength = 0;
        this.messageCount = 0;
        this.uniqueChannels = new Set();
        this.mentionCount = 0;
        this.linkCount = 0;
    }

    addMessage(message) {
        const now = Date.now();
        this.messageTimestamps.push(now);
        // احتفظ فقط بالـ 60 ثانية الأخيرة
        this.messageTimestamps = this.messageTimestamps.filter(t => now - t < 60000);

        // تحديث معدل طول الرسائل
        this.avgMessageLength = (this.avgMessageLength * this.messageCount + message.content.length) / (this.messageCount + 1);
        this.messageCount++;

        if (message.channel) this.uniqueChannels.add(message.channel.id);
        this.mentionCount += message.mentions.users.size + message.mentions.roles.size;
        this.linkCount += (message.content.match(/https?:\/\//g) || []).length;

        this._updateRiskScore();
    }

    addViolation(type) {
        this.violations.push({ type, ts: Date.now() });
        // احتفظ بمخالفات 24 ساعة
        this.violations = this.violations.filter(v => Date.now() - v.ts < 24 * 60 * 60 * 1000);
        this.riskScore = Math.min(100, this.riskScore + (TRUST_VIOLATION_PENALTY[type] || 10));
    }

    _updateRiskScore() {
        // تخفيض المخاطر تلقائياً مع مرور الوقت
        const decayFactor = Math.min(1, (Date.now() - this.joinedAt) / (30 * 60 * 1000)); // 30 دقيقة
        this.riskScore = Math.max(0, this.riskScore * (1 - 0.01 * decayFactor));
    }

    getRiskLevel() {
        if (this.riskScore >= 70) return 'critical';
        if (this.riskScore >= 40) return 'high';
        if (this.riskScore >= 20) return 'medium';
        return 'low';
    }

    // معدل الرسائل في آخر دقيقة
    getMessagesPerMinute() {
        return this.messageTimestamps.length;
    }
}

function getProfile(userId) {
    if (!behaviorProfiles.has(userId)) {
        behaviorProfiles.set(userId, new BehaviorProfile(userId));
    }
    return behaviorProfiles.get(userId);
}

// ─── نظام الـ Rate Limiting المتقدم ──────────────────────────────────────────
class RateLimiter {
    constructor() {
        this._buckets = new Map();
    }

    // هل يُسمح لهذا المستخدم؟
    check(key, maxRequests = 5, windowMs = 5000) {
        const now = Date.now();
        if (!this._buckets.has(key)) this._buckets.set(key, []);
        const bucket = this._buckets.get(key);

        // إزالة القديم
        const fresh = bucket.filter(t => now - t < windowMs);
        this._buckets.set(key, fresh);

        if (fresh.length >= maxRequests) {
            return {
                allowed: false,
                remaining: 0,
                resetIn: windowMs - (now - fresh[0])
            };
        }

        fresh.push(now);
        return { allowed: true, remaining: maxRequests - fresh.length, resetIn: 0 };
    }

    clear(key) {
        this._buckets.delete(key);
    }
}

const rateLimiter = new RateLimiter();

// ─── نظام Reputation المتطور ─────────────────────────────────────────────────
function getTrustScore(userId) {
    const profile = getProfile(userId);
    return Math.max(0, 100 - profile.riskScore);
}

function getTrustBadge(score) {
    if (score >= 90) return '🟢 موثوق جداً';
    if (score >= 70) return '🔵 موثوق';
    if (score >= 50) return '🟡 محايد';
    if (score >= 30) return '🟠 مشبوه';
    return '🔴 خطر';
}

// ─── كشف سلوك البوت (Anti-Bot Detection) ─────────────────────────────────────
function detectBotBehavior(userId, messages) {
    const profile = getProfile(userId);
    const indicators = [];

    // 1. رسائل متسارعة جداً
    if (profile.getMessagesPerMinute() > 15) {
        indicators.push('rapid_messages');
    }

    // 2. رسائل قصيرة جداً ومتكررة
    if (profile.avgMessageLength < 5 && profile.messageCount > 10) {
        indicators.push('short_repeated');
    }

    // 3. قنوات كثيرة في وقت قصير
    if (profile.uniqueChannels.size > 10 && profile.messageCount < 30) {
        indicators.push('channel_hopping');
    }

    // 4. منشنات كثيرة
    const mentionRatio = profile.mentionCount / Math.max(profile.messageCount, 1);
    if (mentionRatio > 0.5) {
        indicators.push('mention_heavy');
    }

    // 5. روابط كثيرة
    const linkRatio = profile.linkCount / Math.max(profile.messageCount, 1);
    if (linkRatio > 0.3) {
        indicators.push('link_heavy');
    }

    const confidence = indicators.length / 5;
    return {
        isLikelyBot: confidence >= 0.6,
        confidence: (confidence * 100).toFixed(0) + '%',
        indicators
    };
}

// ─── حماية من Token Harvesting ───────────────────────────────────────────────
const TOKEN_PATTERNS = [
    /[A-Za-z0-9_-]{24}\.[A-Za-z0-9_-]{6}\.[A-Za-z0-9_-]{27}/g, // Discord token format
    /MTk[A-Za-z0-9._-]{70,}/g, // New token format
    /discord\.com\/api\/webhooks\/\d+\/[A-Za-z0-9_-]+/g // Webhook URLs
];

function checkTokenHarvest(text) {
    for (const pattern of TOKEN_PATTERNS) {
        if (pattern.test(text)) {
            pattern.lastIndex = 0;
            return true;
        }
    }
    return false;
}

// ─── كشف التصيد الاحتيالي المتطور ───────────────────────────────────────────
const PHISHING_PATTERNS = [
    /discord\s*-\s*gift/i,
    /free\s*nitro/i,
    /claim\s*your\s*prize/i,
    /اضغط\s*هنا.*جائزة/i,
    /سحب\s*عشوائي/i,
    /ادخل.*بياناتك/i,
    /verify.*account/i,
    /steamcommunit[ye]/i,
    /discordapp\.com\/.*gift/i,
    /dl\.discordapp/i,
    /dis\s*cord\s*\.gg(?!\/)/i,
    /انتهت.*صلاحية.*حسابك/i,
    /تم.*اختيارك.*للفوز/i,
];

function checkPhishingContent(text) {
    return PHISHING_PATTERNS.some(p => p.test(text));
}

// ─── نظام الحجب التلقائي الذكي ───────────────────────────────────────────────
const autoBlockList = new Set(); // Set<userId>

async function smartAutoAction(message, riskLevel, reason) {
    const member = message.member;
    if (!member) return;

    try {
        switch (riskLevel) {
            case 'low':
                // تحذير فقط
                await message.delete().catch(() => {});
                const warn = await message.channel.send({
                    content: `⚠️ ${message.author} — ${reason}`,
                    allowedMentions: { users: [message.author.id] }
                });
                setTimeout(() => warn.delete().catch(() => {}), 6000);
                break;

            case 'medium':
                // حذف + تايم أوت 5 دقائق
                await message.delete().catch(() => {});
                await member.timeout(5 * 60 * 1000, reason).catch(() => {});
                const warn2 = await message.channel.send({
                    content: `🔇 ${message.author} — **تم كتمك 5 دقائق:** ${reason}`,
                    allowedMentions: { users: [message.author.id] }
                });
                setTimeout(() => warn2.delete().catch(() => {}), 8000);
                break;

            case 'high':
                // حذف + تايم أوت 30 دقيقة
                await message.delete().catch(() => {});
                await member.timeout(30 * 60 * 1000, reason).catch(() => {});
                const warn3 = await message.channel.send({
                    content: `🔴 ${message.author} — **تهديد عالي! تم كتمك 30 دقيقة:** ${reason}`,
                    allowedMentions: { users: [message.author.id] }
                });
                setTimeout(() => warn3.delete().catch(() => {}), 10000);
                break;

            case 'critical':
                // باند تلقائي
                await message.delete().catch(() => {});
                if (member.kickable) {
                    await member.ban({ reason: `[Auto-Security] ${reason}`, deleteMessageSeconds: 86400 }).catch(() => {});
                }
                break;
        }
    } catch (e) {
        console.error('[AdvancedSecurity] خطأ في الإجراء التلقائي:', e.message);
    }
}

// ─── تنظيف دوري ──────────────────────────────────────────────────────────────
setInterval(() => {
    const cutoff = Date.now() - 2 * 60 * 60 * 1000; // ساعتان
    for (const [uid, profile] of behaviorProfiles) {
        // مسح إذا لم يكن نشطاً
        if (profile.messageTimestamps.length === 0 || 
            Math.max(...profile.messageTimestamps) < cutoff) {
            behaviorProfiles.delete(uid);
        }
    }
    // تنظيف الـ Rate Limiter
    rateLimiter._buckets.clear();
}, 60 * 60 * 1000).unref?.();

module.exports = {
    getProfile,
    getTrustScore,
    getTrustBadge,
    detectBotBehavior,
    checkTokenHarvest,
    checkPhishingContent,
    smartAutoAction,
    rateLimiter,
    autoBlockList,
    behaviorProfiles
};
