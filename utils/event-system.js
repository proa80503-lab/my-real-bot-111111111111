'use strict';

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║  ⚡ EVENT SYSTEM v3.0 — نظام الأحداث المتقدم (بث، مراقبة، تحليل)       ║
 * ║  EventEmitter محسّن | Middleware | الإحصائيات الآنية | Queue            ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

const EventEmitter = require('events');

class BotEventSystem extends EventEmitter {
    constructor() {
        super();
        this.setMaxListeners(100);
        this._middleware = [];
        this._eventLog = [];
        this._stats = new Map();
        this._queues = new Map();
        this._processing = new Set();
    }

    // إضافة Middleware معالجة الأحداث
    use(fn) {
        this._middleware.push(fn);
        return this;
    }

    // إطلاق حدث مع Middleware
    async fire(event, data = {}) {
        const enriched = {
            event,
            data,
            timestamp: Date.now(),
            id: `${event}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
        };

        // تنفيذ Middleware
        for (const mw of this._middleware) {
            try {
                const result = await mw(enriched);
                if (result === false) return; // إلغاء الحدث
            } catch (e) {
                console.error(`[EventSystem] Middleware error:`, e.message);
            }
        }

        // تسجيل الإحصائيات
        this._stats.set(event, (this._stats.get(event) || 0) + 1);

        // تسجيل في اللوق (آخر 200 حدث)
        this._eventLog.push(enriched);
        if (this._eventLog.length > 200) this._eventLog.shift();

        // إطلاق الحدث الفعلي
        this.emit(event, enriched);
        this.emit('*', enriched); // حدث الاستماع الشامل

        return enriched;
    }

    // إضافة حدث إلى قائمة الانتظار (لتجنب التحميل الزائد)
    queue(event, data = {}, delay = 0) {
        if (!this._queues.has(event)) this._queues.set(event, []);
        const q = this._queues.get(event);
        q.push({ data, delay });

        if (!this._processing.has(event)) {
            this._processQueue(event);
        }
    }

    async _processQueue(event) {
        this._processing.add(event);
        const q = this._queues.get(event);

        while (q && q.length > 0) {
            const item = q.shift();
            if (item.delay > 0) {
                await new Promise(r => setTimeout(r, item.delay));
            }
            await this.fire(event, item.data).catch(() => {});
        }

        this._processing.delete(event);
    }

    // إحصائيات الأحداث
    getStats() {
        const sorted = [...this._stats.entries()].sort((a, b) => b[1] - a[1]);
        return {
            totalEvents: [...this._stats.values()].reduce((a, b) => a + b, 0),
            uniqueEvents: this._stats.size,
            topEvents: sorted.slice(0, 10).map(([e, c]) => ({ event: e, count: c })),
            recentLog: this._eventLog.slice(-10)
        };
    }

    // الاستماع لمرة واحدة مع timeout
    onceWithTimeout(event, timeout = 30000) {
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                this.off(event, handler);
                reject(new Error(`Event ${event} timed out after ${timeout}ms`));
            }, timeout);

            const handler = (data) => {
                clearTimeout(timer);
                resolve(data);
            };

            this.once(event, handler);
        });
    }
}

// حدث البوت الرئيسي (singleton)
const botEvents = new BotEventSystem();

// Middleware: تسجيل الأحداث المهمة
botEvents.use(async (event) => {
    if (['economy:transaction', 'moderation:action', 'security:alert'].includes(event.event)) {
        // يمكن إضافة تسجيل خارجي هنا
    }
    return true;
});

// ─── أحداث البوت الرئيسية ───────────────────────────────────────────────────
const EVENTS = {
    // اقتصاد
    ECONOMY_TRANSACTION: 'economy:transaction',
    ECONOMY_LEVELUP: 'economy:levelup',
    ECONOMY_DAILY: 'economy:daily',
    ECONOMY_PURCHASE: 'economy:purchase',

    // مودريشن
    MOD_BAN: 'moderation:ban',
    MOD_KICK: 'moderation:kick',
    MOD_MUTE: 'moderation:mute',
    MOD_WARN: 'moderation:warn',

    // أمان
    SECURITY_SPAM: 'security:spam',
    SECURITY_RAID: 'security:raid',
    SECURITY_PHISHING: 'security:phishing',
    SECURITY_ALERT: 'security:alert',

    // مستخدم
    USER_JOIN: 'user:join',
    USER_LEAVE: 'user:leave',
    USER_LEVELUP: 'user:levelup',

    // ألعاب
    GAME_START: 'game:start',
    GAME_END: 'game:end',
    GAME_WIN: 'game:win',

    // ذكاء اصطناعي
    AI_RESPONSE: 'ai:response',
    AI_LEARN: 'ai:learn',

    // كلانات
    CLAN_CREATE: 'clan:create',
    CLAN_JOIN: 'clan:join',
    CLAN_LEAVE: 'clan:leave',
};

module.exports = { botEvents, EVENTS };
