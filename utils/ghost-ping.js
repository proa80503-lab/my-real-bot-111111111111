'use strict';

/**
 * Ghost Ping — مرتبط بـ bot-settings (معطّل افتراضياً)
 * يمكن تفعيله/تعطيله من Dashboard أو أمر البوت
 */

const botSettings = require('./bot-settings');

class GhostPing {
    constructor() {
        this.intervalRef = null;
        this._client = null;
    }

    initialize(client) {
        this._client = client;

        // معطّل افتراضياً — يتحقق من bot-settings
        if (!botSettings.get('ghostPingEnabled')) {
            console.log('👻 [GhostPing] معطّل (يمكن تفعيله من Dashboard)');
            return;
        }

        console.log('👻 [GhostPing] مفعّل');
        this._start();
    }

    _start() {
        if (this.intervalRef) clearInterval(this.intervalRef);

        const intervalMs = botSettings.get('ghostPingInterval') || 21600000; // 6 ساعات

        this.intervalRef = setInterval(async () => {
            // إعادة التحقق عند كل تنفيذ
            if (!botSettings.get('ghostPingEnabled')) return;
            if (!this._client) return;

            for (const guild of this._client.guilds.cache.values()) {
                try {
                    const channel = guild.channels.cache.filter(ch =>
                        ch.type === 0 &&
                        ch.permissionsFor(guild.roles.everyone)?.has('ViewChannel') &&
                        ch.permissionsFor(guild.members.me)?.has(['SendMessages', 'ViewChannel'])
                    ).random();

                    if (!channel) continue;

                    const members = await guild.members.fetch();
                    const target = members.filter(m => !m.user.bot).random();

                    if (target) {
                        const msg = await channel.send(`${target}`);
                        setTimeout(() => msg.delete().catch(() => {}), 2000);
                    }
                } catch (e) {
                    // تجاهل أخطاء الصلاحيات والغيلد
                }
            }
        }, intervalMs);

        this.intervalRef.unref?.();
    }

    /** تفعيل من الخارج (Dashboard) */
    enable() {
        botSettings.set('ghostPingEnabled', true);
        if (this._client) this._start();
    }

    /** تعطيل من الخارج (Dashboard) */
    disable() {
        botSettings.set('ghostPingEnabled', false);
        if (this.intervalRef) {
            clearInterval(this.intervalRef);
            this.intervalRef = null;
        }
    }
}

module.exports = new GhostPing();
