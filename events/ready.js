const { Events, ActivityType } = require('discord.js');
const autoTasks = require('../utils/auto-tasks');
const ghostPing = require('../utils/ghost-ping');

// ── الأنظمة الاختيارية ─────────────────────────────────────────────────────
let analytics = null;
let botEvents = null;
try { analytics = require('../utils/analytics'); } catch {}
try { ({ botEvents } = require('../utils/event-system')); } catch {}

module.exports = {
    name: Events.ClientReady,
    once: true,

    async execute(client) {
        const guildCount   = client.guilds.cache.size;
        const userCount    = client.users.cache.size;
        const commandCount = client.commands?.size ?? '?';

        // ─── رسالة الترحيب في الـ console ────────────────────────────
        const LINE = '═'.repeat(48);
        console.log(`\n╔${LINE}╗`);
        console.log(`║  🤖  ${client.user.tag.padEnd(42)}║`);
        console.log(`╠${LINE}╣`);
        console.log(`║  🌐  السيرفرات : ${String(guildCount).padEnd(29)}║`);
        console.log(`║  👥  المستخدمون: ${String(userCount).padEnd(29)}║`);
        console.log(`║  ⚡  الأوامر   : ${String(commandCount).padEnd(29)}║`);
        console.log(`║  ✅  الحالة    : Online & Ready!               ║`);
        console.log(`╚${LINE}╝\n`);

        // ─── تحميل الحالة المحفوظة ─────────────────────────────────
        try {
            const fs   = require('fs');
            const path = require('path');
            const statusPath = path.join(__dirname, '../data/status.json');

            if (fs.existsSync(statusPath)) {
                const s = JSON.parse(fs.readFileSync(statusPath, 'utf8'));
                const typeMap = {
                    PLAYING:   ActivityType.Playing,
                    WATCHING:  ActivityType.Watching,
                    LISTENING: ActivityType.Listening,
                    COMPETING: ActivityType.Competing,
                };
                const actType = typeMap[s.type] ?? ActivityType.Watching;
                client.user.setPresence({
                    activities: [{ name: s.text, type: actType }],
                    status: s.status || 'online',
                });
                console.log(`✅ [Status] ${s.type}: ${s.text}`);
            } else {
                client.user.setPresence({
                    activities: [{ name: '!help • اكتب help', type: ActivityType.Watching }],
                    status: 'online',
                });
            }
        } catch (e) {
            console.error('[Ready] خطأ في تحميل الحالة:', e.message);
            client.user.setPresence({
                activities: [{ name: 'help • للمساعدة', type: ActivityType.Watching }],
                status: 'online',
            });
        }

        // ─── المهام التلقائية ────────────────────────────────────────
        try {
            autoTasks.initializeAutoTasks(client);
            console.log('🤖 [AutoTasks] المهام التلقائية مفعّلة');
        } catch (err) {
            console.error('[AutoTasks] خطأ:', err.message);
        }

        // ─── المنشن الوهمي ──────────────────────────────────────────
        try {
            ghostPing.initialize(client);
            console.log('👻 [GhostPing] مفعّل');
        } catch (e) {
            console.warn('[GhostPing] خطأ:', e.message);
        }

        // ─── تحديث قنوات الشركات (بعد 3 ثوانٍ) ────────────────────
        setTimeout(async () => {
            try {
                const companyModule = require('../commands/economy/company');
                for (const guild of client.guilds.cache.values()) {
                    await companyModule.refreshCompaniesChannel(guild).catch(() => {});
                }
                console.log('🏢 [Companies] قنوات الشركات محدَّثة');
            } catch (err) {
                console.warn('[Companies] خطأ:', err.message);
            }
        }, 3_000);

        // ─── إشعار المالك عبر DM (بعد 5 ثوانٍ) ────────────────────
        setTimeout(async () => {
            try {
                const ownerDashboard = require('../commands/main/owner-dashboard');
                await ownerDashboard.notifyOwnerOnStartup(client);
                console.log('👑 [Owner] تم إرسال إشعار البدء');
            } catch (e) {
                console.warn('[Owner] لم يتم إرسال إشعار البدء:', e.message);
            }
        }, 5_000);

        // ─── تحديث المتصدرين تلقائياً (بعد 10 ثوانٍ) ──────────────
        setTimeout(async () => {
            try {
                const leaderboard = require('../commands/main/leaderboard');
                leaderboard.startAutoUpdate(client, 30); // كل 30 دقيقة
                console.log('🏆 [Leaderboard] التحديث التلقائي كل 30 دقيقة');
            } catch (e) {
                console.warn('[Leaderboard] خطأ:', e.message);
            }
        }, 10_000);

        // ─── تهيئة الأنظمة المتقدمة (بعد 15 ثانية) ────────────────
        setTimeout(() => {
            try {
                analytics?.trackEvent?.('bot_start', {
                    guilds:   client.guilds.cache.size,
                    users:    client.users.cache.size,
                    commands: client.commands?.size ?? 0,
                    tag:      client.user.tag,
                });

                botEvents?.fire?.('bot:ready', { client });

                console.log('🚀 [Systems] الأنظمة المتقدمة:');
                console.log('   📊 Analytics Engine  ✔️');
                console.log('   🛡️ Advanced Security ✔️');
                console.log('   🎛️ Event System      ✔️');
            } catch (e) {
                console.warn('[Systems] خطأ:', e.message);
            }
        }, 15_000);
    },
};
