'use strict';

const { Client, GatewayIntentBits, Partials } = require('discord.js');
const config = require('./config');
const eventHandler = require('./handlers/eventHandler');
const commandHandler = require('./handlers/commandHandler');

// ─── معالجة الأخطاء الكارثية لمنع Crash ─────────────────────────────────
process.on('uncaughtException', (err) => {
    console.error('[CRASH] استثناء غير معالج:', err);
    // لا نغلق البوت — نسجّل الخطأ فقط ونستمر
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('[UNHANDLED] رفض Promise غير معالج:', reason);
    // لا نغلق البوت — نسجّل الخطأ فقط ونستمر
});

// ─── تخصيص البوت ──────────────────────────────────────────────────
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
});

// ─── خادم ويب بسيط لدعم الاستضافة (Render/Koyeb) ──────────────────────────
const http = require('http');
const port = process.env.PORT || 3000;
http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.write('البوت يعمل بنجاح 24/7! 🚀');
    res.end();
}).listen(port, () => {
    console.log(`[Web Server] 🌐 الخادم يعمل على المنفذ: ${port}`);
});

// ─── تحميل الـ Handlers ───────────────────────────────────────────────────
try {
    eventHandler(client);
    commandHandler(client);
    console.log('[Handlers] ✅ تم تحميل الأوامر والأحداث بنجاح.');
} catch (err) {
    console.error('[Handlers] ❌ فشل تحميل الـ Handlers:', err);
}

// ─── تسجيل الدخول ─────────────────────────────────────────────────────────
client.login(config.token).catch((err) => {
    console.error('[Login] فشل تسجيل الدخول — تحقق من DISCORD_TOKEN في .env:', err.message);
    process.exit(1);
});