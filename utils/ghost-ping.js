const config = require('../config');

class GhostPing {
    constructor() {
        this.interval = null;
    }

    initialize(client) {
        if (!config.ghostPingEnabled) return;
        console.log('👻 نظام المنشن الوهمي مفعل');

        this.start(client);
    }

    start(client) {
        this.interval = setInterval(async () => {
            if (!config.ghostPingEnabled) return;

            for (const guild of client.guilds.cache.values()) {
                try {
                    // اختيار قناة نصية عامة عشوائية
                    const channel = guild.channels.cache.filter(ch =>
                        ch.type === 0 &&
                        ch.permissionsFor(guild.roles.everyone).has('ViewChannel') &&
                        ch.permissionsFor(guild.members.me).has(['SendMessages', 'ViewChannel'])
                    ).random();

                    if (!channel) continue;

                    // جلب الأعضاء واختيار واحد عشوائي (غير البوت)
                    const members = await guild.members.fetch();
                    const target = members.filter(m => !m.user.bot).random();

                    if (target) {
                        const msg = await channel.send(`${target}`);
                        setTimeout(() => {
                            msg.delete().catch(() => { });
                        }, 2000); // حذف بعد ثانيتين
                    }
                } catch (error) {
                    console.error(`Error in ghost ping for guild ${guild.id}:`, error);
                }
            }
        }, config.ghostPingInterval);
    }

    stop() {
        if (this.interval) clearInterval(this.interval);
    }
}

module.exports = new GhostPing();
