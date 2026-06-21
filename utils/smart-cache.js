'use strict';

/**
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║  🚀 SMART CACHE v2.0 — نظام تخزين مؤقت ذكي من الجيل القادم        ║
 * ║  TTL | LRU Eviction | Event Hooks | Statistics                      ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 */

class SmartCache {
    constructor(options = {}) {
        this.maxSize = options.maxSize || 10000;
        this.defaultTTL = options.defaultTTL || 5 * 60 * 1000; // 5 دقائق
        this._store = new Map();
        this._stats = { hits: 0, misses: 0, evictions: 0, sets: 0 };
        this._hooks = { onSet: null, onDelete: null, onExpire: null };

        // تنظيف دوري كل دقيقتين
        const _cleanup = setInterval(() => this._cleanup(), 2 * 60 * 1000);
        _cleanup.unref?.();
    }

    set(key, value, ttl = this.defaultTTL) {
        if (this._store.size >= this.maxSize) {
            this._evictLRU();
        }
        const entry = {
            value,
            expires: ttl > 0 ? Date.now() + ttl : Infinity,
            accessed: Date.now(),
            hits: 0
        };
        this._store.set(key, entry);
        this._stats.sets++;
        this._hooks.onSet?.(key, value);
        return this;
    }

    get(key) {
        const entry = this._store.get(key);
        if (!entry) {
            this._stats.misses++;
            return undefined;
        }
        if (entry.expires < Date.now()) {
            this._store.delete(key);
            this._stats.misses++;
            this._hooks.onExpire?.(key);
            return undefined;
        }
        entry.accessed = Date.now();
        entry.hits++;
        this._stats.hits++;
        return entry.value;
    }

    has(key) {
        const entry = this._store.get(key);
        if (!entry) return false;
        if (entry.expires < Date.now()) {
            this._store.delete(key);
            return false;
        }
        return true;
    }

    delete(key) {
        const had = this._store.has(key);
        this._store.delete(key);
        if (had) this._hooks.onDelete?.(key);
        return had;
    }

    clear() {
        this._store.clear();
    }

    getOrSet(key, factory, ttl = this.defaultTTL) {
        const cached = this.get(key);
        if (cached !== undefined) return cached;
        const value = factory();
        this.set(key, value, ttl);
        return value;
    }

    async getOrSetAsync(key, factory, ttl = this.defaultTTL) {
        const cached = this.get(key);
        if (cached !== undefined) return cached;
        const value = await factory();
        this.set(key, value, ttl);
        return value;
    }

    getStats() {
        const total = this._stats.hits + this._stats.misses;
        return {
            ...this._stats,
            size: this._store.size,
            hitRate: total > 0 ? ((this._stats.hits / total) * 100).toFixed(1) + '%' : '0%'
        };
    }

    onHook(event, fn) {
        this._hooks[event] = fn;
        return this;
    }

    _cleanup() {
        const now = Date.now();
        for (const [key, entry] of this._store) {
            if (entry.expires < now) {
                this._store.delete(key);
                this._hooks.onExpire?.(key);
            }
        }
    }

    _evictLRU() {
        let oldest = Infinity;
        let oldestKey = null;
        for (const [key, entry] of this._store) {
            if (entry.accessed < oldest) {
                oldest = entry.accessed;
                oldestKey = key;
            }
        }
        if (oldestKey) {
            this._store.delete(oldestKey);
            this._stats.evictions++;
        }
    }

    get size() { return this._store.size; }
}

// كاشات مخصصة للبوت
const userCache = new SmartCache({ maxSize: 5000, defaultTTL: 10 * 60 * 1000 });
const guildCache = new SmartCache({ maxSize: 500, defaultTTL: 30 * 60 * 1000 });
const commandCache = new SmartCache({ maxSize: 2000, defaultTTL: 5 * 60 * 1000 });
const aiCache = new SmartCache({ maxSize: 1000, defaultTTL: 15 * 60 * 1000 });
const leaderboardCache = new SmartCache({ maxSize: 100, defaultTTL: 2 * 60 * 1000 });

module.exports = { SmartCache, userCache, guildCache, commandCache, aiCache, leaderboardCache };
