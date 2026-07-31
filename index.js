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

// ─── تشغيل لوحة التحكم الاحترافية (تدعم Render تلقائياً) ────────────────────
try {
    const dashboard = require('./dashboard-server');
    dashboard.setClient(client);
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