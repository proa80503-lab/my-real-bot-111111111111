'use strict';

const { Client, GatewayIntentBits, Partials } = require('discord.js');
const config       = require('./config');
const eventHandler = require('./handlers/eventHandler');
const commandHandler = require('./handlers/commandHandler');

// ─── معالجة الأخطاء الكارثية لمنع Crash ────────────────────────────────────
process.on('uncaughtException', (err) => {
    // لا نُغلق البوت — نسجّل الخطأ ونستمر
    console.error('[CRASH] استثناء غير معالج:', err?.stack || err?.message || err);
});

process.on('unhandledRejection', (reason) => {
    console.error('[UNHANDLED] رفض Promise غير معالج:', reason?.stack || reason);
});

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
    // حماية ضد API abuse
    rest: { timeout: 15_000 },
});

// ─── خادم ويب لدعم Render / Koyeb / Railway ─────────────────────────────────
const http = require('http');
const port = process.env.PORT || 3000;

const webServer = http.createServer((req, res) => {
    const uptime = process.uptime();
    const h = Math.floor(uptime / 3600);
    const m = Math.floor((uptime % 3600) / 60);
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({
        status: 'online',
        uptime: `${h}h ${m}m`,
        guilds: client.guilds?.cache?.size ?? 0,
        tag:    client.user?.tag ?? 'connecting...',
    }));
});

webServer.listen(port, () => {
    console.log(`[WebServer] 🌐 يعمل على المنفذ ${port}`);
});

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