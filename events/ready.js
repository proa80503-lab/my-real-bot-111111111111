const { Events, ActivityType } = require('discord.js');
const autoTasks = require('../utils/auto-tasks');
const ghostPing = require('../utils/ghost-ping');

module.exports = {
    name: Events.ClientReady,
    once: true,
    async execute(client) {
        // ─── رسالة الترحيب الاحترافية في الـ console ───────────────
        const guildCount = client.guilds.cache.size;
        const userCount = client.users.cache.size;

        console.log('\n');
        console.log('╔══════════════════════════════════════════════╗');
        console.log(`║  🤖  ${client.user.tag.padEnd(38)} ║`);
        console.log('╠══════════════════════════════════════════════╣');
        console.log(`║  🌐  السيرفرات: ${String(guildCount).padEnd(28)} ║`);
        console.log(`║  👥  المستخدمون: ${String(userCount).padEnd(27)} ║`);
        console.log(`║  ⚡  الحالة: Online & Ready!                 ║`);
        console.log('╚══════════════════════════════════════════════╝');
        console.log('');

        // ─── تحميل الحالة المحفوظة ───────────────────────────────
        try {
            const fs = require('fs');
            const path = require('path');
            const statusPath = path.join(__dirname, '../data/status.json');
            if (fs.existsSync(statusPath)) {
                const s = JSON.parse(fs.readFileSync(statusPath, 'utf8'));
                const typeMap = {
                    'PLAYING': ActivityType.Playing,
                    'WATCHING': ActivityType.Watching,
                    'LISTENING': ActivityType.Listening,
                    'COMPETING': ActivityType.Competing
                };
                const actType = typeMap[s.type] ?? ActivityType.Watching;
                client.user.setPresence({ activities: [{ name: s.text, type: actType }], status: s.status || 'online' });
                console.log(`✅ [Status] ${s.type}: ${s.text}`);
            } else {
                client.user.setPresence({ activities: [{ name: '!help • اكتب help للمساعدة', type: ActivityType.Watching }], status: 'online' });
            }
        } catch (e) {
            console.error('[Ready] Error loading status:', e.message);
            client.user.setPresence({ activities: [{ name: '!help للمساعدة', type: ActivityType.Watching }], status: 'online' });
        }

        // ─── المهام التلقائية ────────────────────────────────────
        try {
            autoTasks.initializeAutoTasks(client);
            console.log('🤖 [AutoTasks] تم تفعيل المهام التلقائية');
        } catch (error) {
            console.error('[AutoTasks] خطأ:', error.message);
        }

        // ─── المنشن الوهمي ───────────────────────────────────────
        try {
            ghostPing.initialize(client);
            console.log('👻 [GhostPing] تم تفعيل نظام المنشن الوهمي');
        } catch (e) {
            console.warn('[GhostPing] خطأ:', e.message);
        }

        // ─── تحديث قنوات الشركات (بعد 3 ثوانٍ) ──────────────────
        setTimeout(async () => {
            try {
                const companyModule = require('../commands/economy/company');
                for (const guild of client.guilds.cache.values()) {
                    await companyModule.refreshCompaniesChannel(guild).catch(() => {});
                }
                console.log('🏢 [Companies] تم تحديث قنوات الشركات');
            } catch (err) {
                console.warn('[Companies] خطأ:', err.message);
            }
        }, 3000);

        // ─── إشعار المالك عبر DM (بعد 5 ثوانٍ) ──────────────────
        setTimeout(async () => {
            try {
                const ownerDashboard = require('../commands/main/owner-dashboard');
                await ownerDashboard.notifyOwnerOnStartup(client);
                console.log('👑 [Owner] تم إرسال إشعار البدء للمالك');
            } catch (e) {
                console.warn('[Owner] لم يتم إرسال إشعار البدء:', e.message);
            }
        }, 5000);

        // ─── تحديث لوحة المتصدرين تلقائياً (بعد 10 ثواني) ───
        setTimeout(async () => {
            try {
                const leaderboard = require('../commands/main/leaderboard');
                leaderboard.startAutoUpdate(client, 30); // كل 30 دقيقة
                console.log('🏆 [Leaderboard] تفعيل التحديث التلقائي للصدارة كل 30 دقيقة');
            } catch (e) {
                console.warn('[Leaderboard] خطأ في التحديث التلقائي:', e.message);
            }
        }, 10000);
    },
};
