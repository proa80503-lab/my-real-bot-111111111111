'use strict';

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║  📊 ANALYTICS COMMAND — أمر التحليلات المتقدمة من الجيل القادم          ║
 * ║  إحصائيات آنية | رسوم بيانية | تقارير ذكية | مقارنات                  ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const analytics = require('../../utils/analytics');
const { getTrustScore, getTrustBadge, getProfile } = require('../../utils/advanced-security');
const config = require('../../config');

module.exports = {
    name: 'analytics',
    aliases: ['احصائيات', 'تحليلات', 'stats-advanced', 'بيانات'],
    description: 'تحليلات متقدمة للبوت والسيرفر',
    usage: 'analytics [يومي|شامل|مستخدم @user]',
    ownerOnly: false,

    async execute(message, args) {
        const sub = args[0]?.toLowerCase() || 'daily';
        const isOwner = message.author.id === config.ownerId;

        try {
            if (sub === 'يومي' || sub === 'daily' || sub === 'اليوم') {
                return await sendDailyReport(message);
            } else if ((sub === 'شامل' || sub === 'all' || sub === 'كل') && isOwner) {
                return await sendAllTimeStats(message);
            } else if ((sub === 'مستخدم' || sub === 'user') && message.mentions.users.first()) {
                return await sendUserStats(message, message.mentions.users.first());
            } else if (sub === 'رسم' || sub === 'chart') {
                return await sendHourlyChart(message);
            } else {
                return await sendDailyReport(message);
            }
        } catch (e) {
            console.error('[Analytics]', e);
            return message.reply('❌ خطأ في التحليلات').catch(() => {});
        }
    }
};

async function sendDailyReport(message) {
    const report = analytics.getDailyReport();
    const hourly = analytics.getHourlyChart(12);

    const topCmds = report.topCommands.map((c, i) =>
        `\`${i + 1}.\` **${c[0]}** — ${c[1].toLocaleString()} مرة`
    ).join('\n') || '*لا توجد بيانات بعد*';

    const changeIcon = report.changeFromYesterday === 'N/A' ? '📊' :
        parseFloat(report.changeFromYesterday) >= 0 ? '📈' : '📉';

    const embed = new EmbedBuilder()
        .setColor('#7289DA')
        .setTitle('📊 تقرير اليوم التحليلي')
        .setDescription([
            '```',
            hourly.chart || '░░░░░░░░░░░░',
            '```',
            `\`نشاط آخر 12 ساعة\``
        ].join('\n'))
        .addFields(
            {
                name: '⚡ النشاط العام',
                value: [
                    `> **الأوامر:** \`${report.totalCommands.toLocaleString()}\` ${changeIcon} (${report.changeFromYesterday}%)`,
                    `> **المستخدمون النشطون:** \`${report.activeUsers}\``,
                    `> **متوسط وقت الاستجابة:** \`${report.avgResponseMs}ms\``,
                    `> **الأخطاء:** \`${report.errors}\``,
                ].join('\n'),
                inline: false
            },
            {
                name: '💰 تدفق الاقتصاد',
                value: [
                    `> **مكتسب:** \`${(report.economy.earned || 0).toLocaleString()}\` 💰`,
                    `> **منفق:** \`${(report.economy.spent || 0).toLocaleString()}\` 💸`,
                    `> **محوّل:** \`${(report.economy.transferred || 0).toLocaleString()}\` ↔️`,
                ].join('\n'),
                inline: true
            },
            {
                name: '🏆 أكثر الأوامر استخداماً',
                value: topCmds,
                inline: true
            }
        )
        .setFooter({ text: `📅 ${report.date} • بيانات محدّثة لحظياً` })
        .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('analytics_chart')
            .setLabel('📈 رسم بياني')
            .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId('analytics_refresh')
            .setLabel('🔄 تحديث')
            .setStyle(ButtonStyle.Primary)
    );

    const reply = await message.reply({ embeds: [embed], components: [row] });

    // معالجة الأزرار
    const collector = reply.createMessageComponentCollector({ time: 60000 });
    collector.on('collect', async (i) => {
        if (i.user.id !== message.author.id) {
            return i.reply({ content: '❌ فقط من طلب الأمر يمكنه استخدام هذه الأزرار', flags: MessageFlags.Ephemeral });
        }
        if (i.customId === 'analytics_refresh') {
            const newReport = analytics.getDailyReport();
            embed.setTimestamp();
            await i.update({ embeds: [embed] });
        } else if (i.customId === 'analytics_chart') {
            const chartEmbed = await buildChartEmbed();
            await i.update({ embeds: [chartEmbed] });
        }
    });
}

async function buildChartEmbed() {
    const hourly = analytics.getHourlyChart(24);
    return new EmbedBuilder()
        .setColor('#00FF88')
        .setTitle('📈 نشاط البوت — آخر 24 ساعة')
        .setDescription([
            '```',
            hourly.chart || '░░░░░░░░░░░░',
            hourly.labels,
            '```',
            `**الإجمالي:** \`${hourly.total.toLocaleString()}\` رسالة | **الذروة:** \`${hourly.max}\``
        ].join('\n'))
        .setTimestamp();
}

async function sendAllTimeStats(message) {
    const stats = analytics.getAllTimeStats();
    const topCmds = stats.topCommands.map((c, i) =>
        `\`${i + 1}.\` **${c[0]}** — ${c[1].toLocaleString()}`
    ).join('\n') || '*لا توجد*';

    const embed = new EmbedBuilder()
        .setColor('#FFD700')
        .setTitle('🌟 الإحصائيات الكاملة (All-Time)')
        .addFields(
            { name: '📊 الأرقام الكاملة', value: [
                `> **إجمالي الأوامر:** \`${stats.totalCommands.toLocaleString()}\``,
                `> **إجمالي الرسائل:** \`${stats.totalMessages.toLocaleString()}\``,
                `> **المستخدمون:** \`${stats.totalUsers.toLocaleString()}\``,
                `> **السيرفرات المتتبعة:** \`${stats.guildsTracked}\``,
            ].join('\n'), inline: false },
            { name: '🏆 الأوامر الأكثر استخداماً (كل الوقت)', value: topCmds, inline: false }
        )
        .setFooter({ text: '📊 إحصائيات تراكمية منذ بداية تشغيل البوت' })
        .setTimestamp();

    await message.reply({ embeds: [embed] });
}

async function sendUserStats(message, targetUser) {
    const stats = analytics.getUserStats(targetUser.id);
    const trustScore = getTrustScore(targetUser.id);
    const trustBadge = getTrustBadge(trustScore);
    const profile = getProfile(targetUser.id);

    const embed = new EmbedBuilder()
        .setColor('#9B59B6')
        .setTitle(`📊 إحصائيات ${targetUser.username}`)
        .setThumbnail(targetUser.displayAvatarURL())
        .addFields(
            { name: '💬 النشاط', value: [
                `> **الرسائل:** \`${(stats.messages || 0).toLocaleString()}\``,
                `> **الأوامر:** \`${(stats.commands || 0).toLocaleString()}\``,
                `> **آخر نشاط:** \`${stats.lastSeen ? new Date(stats.lastSeen).toLocaleDateString('ar-SA') : 'غير معروف'}\``
            ].join('\n'), inline: true },
            { name: '🛡️ الأمان', value: [
                `> **نقاط الثقة:** \`${trustScore}/100\``,
                `> **المستوى:** ${trustBadge}`,
                `> **المخالفات:** \`${profile.violations.length}\``
            ].join('\n'), inline: true }
        )
        .setTimestamp();

    await message.reply({ embeds: [embed] });
}

async function sendHourlyChart(message) {
    const embed = await buildChartEmbed();
    await message.reply({ embeds: [embed] });
}
