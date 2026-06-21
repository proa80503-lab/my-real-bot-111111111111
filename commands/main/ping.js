'use strict';

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║  🤖 SMART COMMANDS — أوامر ذكية متطورة من المستقبل                     ║
 * ║  ping ذكي | معلومات مفصلة | نصائح | رسم بيانات                         ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const config = require('../../config');
const db = require('../../utils/database');

let analytics = null;
try { analytics = require('../../utils/analytics'); } catch {}

module.exports = {
    name: 'ping',
    aliases: ['بينج', 'latency', 'سرعة', 'اختبار', 'ping'],
    description: 'فحص سرعة البوت والخوادم',
    usage: 'ping',

    async execute(message) {
        const startTime = Date.now();

        const loadingEmbed = new EmbedBuilder()
            .setColor('#FFD700')
            .setTitle('🔍 جاري قياس السرعة...')
            .setDescription('```\n⏳ يُقاس...\n```');

        const reply = await message.reply({ embeds: [loadingEmbed] });
        const roundTrip = Date.now() - startTime;
        const apiPing = message.client.ws.ping;
        const dbStart = Date.now();

        // قياس سرعة قاعدة البيانات
        let dbLatency = 0;
        try {
            db.getUserData(message.author.id);
            dbLatency = Date.now() - dbStart;
        } catch { dbLatency = -1; }

        // تقييم السرعة
        const rateSpeed = (ms) => {
            if (ms < 100) return { icon: '🟢', label: 'ممتاز' };
            if (ms < 200) return { icon: '🟡', label: 'جيد' };
            if (ms < 500) return { icon: '🟠', label: 'متوسط' };
            return { icon: '🔴', label: 'بطيء' };
        };

        const rtRating = rateSpeed(roundTrip);
        const apiRating = rateSpeed(apiPing);
        const dbRating = dbLatency >= 0 ? rateSpeed(dbLatency) : { icon: '🔴', label: 'خطأ' };

        // إحصائيات التحليلات
        const report = analytics?.getDailyReport();

        const embed = new EmbedBuilder()
            .setColor(roundTrip < 200 ? '#00FF88' : roundTrip < 500 ? '#FFD700' : '#FF4444')
            .setTitle('🏓 Pong! — تقرير الأداء')
            .setDescription([
                '```',
                `🔄 Round Trip   ${roundTrip}ms    ${rtRating.icon} ${rtRating.label}`,
                `📡 WebSocket    ${apiPing}ms      ${apiRating.icon} ${apiRating.label}`,
                `💾 Database     ${dbLatency >= 0 ? dbLatency + 'ms' : 'خطأ'}    ${dbRating.icon} ${dbRating.label}`,
                '```'
            ].join('\n'))
            .addFields(
                {
                    name: '🤖 معلومات البوت',
                    value: [
                        `> **السيرفرات:** \`${message.client.guilds.cache.size}\``,
                        `> **المستخدمون:** \`${message.client.users.cache.size.toLocaleString()}\``,
                        `> **Uptime:** \`${formatUptime(process.uptime())}\``,
                    ].join('\n'),
                    inline: true
                },
                {
                    name: '💻 موارد النظام',
                    value: [
                        `> **الذاكرة:** \`${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1)} MB\``,
                        `> **Node.js:** \`${process.version}\``,
                        `> **النظام:** \`${process.platform}\``,
                    ].join('\n'),
                    inline: true
                }
            );

        if (report) {
            embed.addFields({
                name: '📊 إحصائيات اليوم',
                value: [
                    `> **الأوامر المنفذة:** \`${report.totalCommands.toLocaleString()}\``,
                    `> **المستخدمون النشطون:** \`${report.activeUsers}\``,
                    `> **متوسط وقت الاستجابة:** \`${report.avgResponseMs}ms\``,
                ].join('\n'),
                inline: false
            });
        }

        embed.setFooter({ text: `⏰ ${new Date().toLocaleString('ar-SA')}` }).setTimestamp();

        await reply.edit({ embeds: [embed] });
    }
};

function formatUptime(seconds) {
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (d > 0) return `${d}ي ${h}س ${m}د`;
    if (h > 0) return `${h}س ${m}د ${s}ث`;
    return `${m}د ${s}ث`;
}
