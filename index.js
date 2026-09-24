'use strict';

require('dotenv').config();

const { Client, GatewayIntentBits, Partials } = require('discord.js');
const config         = require('./config');
const eventHandler   = require('./handlers/eventHandler');
const commandHandler = require('./handlers/commandHandler');

// ─── معالجة الأخطاء الكارثية لمنع Crash ────────────────────────────────────
process.on('uncaughtException',  (err) => console.error('[CRASH] استثناء غير معالج:',        err?.stack || err?.message || err));
process.on('unhandledRejection', (reason) => console.error('[UNHANDLED] رفض Promise غير معالج:', reason?.stack || reason));

// ─── إنشاء Client ───────────────────────────────────────────────────────────
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildModeration,
        GatewayIntentBits.GuildPresences,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.DirectMessageTyping,
        GatewayIntentBits.GuildVoiceStates,
    ],
    partials: [Partials.Channel, Partials.Message],
    rest: { timeout: 15_000 },
});

// ─── تحميل قاعدة البيانات ───────────────────────────────────────────────────
const dbInstance = require('./src/database/db-instance');
const db = require('./src/database/db');
const botSettingsDb = require('./src/database/bot-settings-db');

async function startBot() {
    try {
        // 1. الاتصال بـ MongoDB
        await dbInstance.connectDb();
        
        // 2. تحميل البيانات من MongoDB إلى الذاكرة المؤقتة
        await db.loadDatabase();
        await botSettingsDb.loadBotSettings();
        
        console.log('[Startup] ✅ Database and caches loaded successfully.');

        // ─── تنظيف ملفات JSON القديمة (مرّة واحدة) ───────────────────────────
        try {
            const cleanup = require('./utils/startup-cleanup');
            cleanup.cleanupLegacyFiles();
            cleanup.auditLegacyUsage();
        } catch (err) {
            console.warn('[Startup] ⚠️ Cleanup skipped:', err.message);
        }
    } catch (err) {
        console.error('[Startup] ❌ Database initialization failed:', err.message);
        process.exit(1);
    }

    // ─── تشغيل لوحة التحكم الاحترافية (تدعم Render تلقائياً) ────────────────────
    try {
        const dashboard = require('./dashboard-server');
        dashboard.setClient(client);
        dashboard.start(); 
        console.log('[Dashboard] ✅ لوحة التحكم مُشغَّلة');
    } catch (err) {
        console.error('[Dashboard] ❌ فشل تشغيل لوحة التحكم:', err.message);
    }

    // ─── تحميل الـ Handlers ──────────────────────────────────────────────────────
    try {
        eventHandler(client);
        commandHandler(client);
        console.log('[Handlers] ✅ الأحداث والأوامر محمّلة بنجاح');
    } catch (err) {
        console.error('[Handlers] ❌ فشل التحميل:', err.message);
        process.exit(1);
    }

    // ─── تسجيل الدخول ───────────────────────────────────────────────────────────
    client.login(config.token).catch((err) => {
        console.error('[Login] ❌ فشل تسجيل الدخول — تحقق من DISCORD_TOKEN في .env:', err.message);
        process.exit(1);
    });
}

// تشغيل البوت
startBot();