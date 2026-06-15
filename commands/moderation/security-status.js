'use strict';

const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { PremiumEmbedBuilder, ICONS } = require('../../utils/embed-builder');
const securityMonitor = require('../../utils/security-monitor');

module.exports = {
    name: 'security-status',
    aliases: ['أمان', 'حماية-حالة', 'security', 'security-log'],
    description: 'عرض حالة أنظمة الحماية وآخر الحوادث الأمنية',
    permissions: PermissionFlagsBits.ManageGuild,

    async execute(message, args) {
        if (!message.guild) return;

        // ── التحكم: تفعيل/تعطيل نظام معين
        if (args[0] === 'toggle' && args[1]) {
            if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
                return message.reply('❌ هذا الأمر يحتاج صلاحية Administrator!');
            }
            const systemName = args[1].toLowerCase();
            const setTo = args[2] !== 'off';
            const done = securityMonitor.toggleSystem(systemName, setTo);
            if (done) {
                return message.reply(`✅ نظام \`${systemName}\` تم ${setTo ? 'تفعيله ✅' : 'تعطيله ❌'}`);
            }
            return message.reply(`❌ النظام \`${systemName}\` غير موجود. الأنظمة المتاحة: antiNuke, antiPhishing, antiTokenSniff, antiAdminAbuse, antiMassDM, antiBotAbuse`);
        }

        // ── عرض الحالة العامة
        const status = securityMonitor.getSystemStatus();
        const incidents = securityMonitor.getIncidentLog(message.guild.id, 5);

        const systemsField = [
            `${PremiumEmbedBuilder.statusEmoji(status.antiNuke)} — **Anti-Nuke** (تدمير السيرفر)`,
            `${PremiumEmbedBuilder.statusEmoji(status.antiPhishing)} — **Anti-Phishing** (روابط احتيال)`,
            `${PremiumEmbedBuilder.statusEmoji(status.antiTokenSniff)} — **Token Guard** (توكنات)`,
            `${PremiumEmbedBuilder.statusEmoji(status.antiAdminAbuse)} — **Admin Guard** (إساءة صلاحيات)`,
            `${PremiumEmbedBuilder.statusEmoji(status.antiMassDM)} — **Mass DM** (سبام خاص)`,
            `${PremiumEmbedBuilder.statusEmoji(status.antiBotAbuse)} — **Bot Verifier** (بوتات مشبوهة)`,
            `🛡️ — **Channel Privacy** (خصوصية الشركات والسجلات: **نشط 🔒**)`,
            `${status.lockdownMode ? '🔒 **LOCKDOWN مفعّل!**' : '🟢 **لا يوجد إغلاق**'}`,
        ].join('\n');

        const incidentsField = incidents.length > 0
            ? incidents.map(i => {
                const timeAgo = Math.floor((Date.now() - i.time) / 60000);
                return `\`${i.type}\` — <@${i.userId}> — منذ ${timeAgo} دقيقة`;
            }).join('\n')
            : '✅ لا توجد حوادث أخيرة';

        const totalNuke = incidents.filter(i => i.type === 'Anti-Nuke').length;
        const totalPhish = incidents.filter(i => i.type === 'Phishing').length;
        const totalToken = incidents.filter(i => i.type === 'TokenSniff').length;

        const embed = new EmbedBuilder()
            .setColor(status.lockdownMode ? '#FF0000' : '#00FF7F')
            .setTitle('🛡️ نظام المراقبة الأمنية — Security Monitor v2.0')
            .setDescription('مراقبة مستمرة 24/7 — كشف التهديدات وإيقافها فوراً بدون تردد')
            .addFields(
                {
                    name: '⚙️ حالة الأنظمة',
                    value: systemsField,
                    inline: false
                },
                {
                    name: '📊 إحصائيات (آخر 50 حادثة)',
                    value: [
                        `🚨 Anti-Nuke: **${totalNuke}** حادثة`,
                        `🎣 Phishing: **${totalPhish}** حادثة`,
                        `🔑 Token Sniff: **${totalToken}** حادثة`,
                        `📌 إجمالي: **${incidents.length}** حادثة مسجّلة`,
                    ].join('\n'),
                    inline: true
                },
                {
                    name: '📋 آخر الحوادث',
                    value: incidentsField,
                    inline: false
                }
            )
            .addFields({
                name: '🔧 التحكم',
                value: [
                    '`!أمان toggle <system> off/on` — تفعيل/تعطيل نظام',
                    '`!أمان toggle antiNuke off` — مثال لتعطيل Anti-Nuke',
                    '`!فك-الإغلاق` — رفع وضع Lockdown الفوري',
                ].join('\n'),
                inline: false
            })
            .setTimestamp()
            .setFooter({ text: `🛡️ Security Monitor | حالة الأمان في ${message.guild.name}` });

        await message.reply({ embeds: [embed] });
    }
};
