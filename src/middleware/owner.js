'use strict';

const config = require('../../config');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = async function ownerMiddleware(message) {
    if (message.author.id !== config.ownerId) return true;

    const lowMsg = message.content.toLowerCase().trim();

    // ── 🔑 أوامر المالك الخاصة — #1 أو داشبورد → يرسل رابط لوحة التحكم عبر DM
    const ownerTriggers = ['#1', '!#1', 'داشبورد', 'dashboard', '!داشبورد', '!dashboard', 'لوحة', 'panel'];
    if (ownerTriggers.includes(lowMsg)) {
        try {
            // جلب رابط الداشبورد الآمن
            let dashUrl = null;
            try {
                const dashMod = require('../../dashboard-server');
                dashUrl = dashMod.getDashboardUrl?.();
            } catch {}

            const embed = new EmbedBuilder()
                .setColor('#5865f2')
                .setTitle('🎛️ لوحة التحكم الاحترافية')
                .setDescription([
                    '```',
                    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
                    '   🤖  رابط لوحة التحكم جاهز  🤖',
                    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
                    '```',
                    dashUrl
                        ? `> 🔗 **الرابط:** ${dashUrl}`
                        : '> ⚠️ لوحة التحكم غير مُشغَّلة حالياً',
                    '',
                    '> 🔒 الرابط يحتوي على مفتاح أمان خاص — لا تشاركه مع أحد',
                ].join('\n'))
                .addFields(
                    { name: '📊 الأقسام المتاحة', value: '`نظرة عامة` • `التحكم` • `النظام`', inline: false },
                    { name: '🌐 البيئة', value: process.env.RENDER_EXTERNAL_URL ? '☁️ Render Cloud' : '💻 Local', inline: true },
                    { name: '⏱️ وقت التشغيل', value: (() => { const u = process.uptime(); const h = Math.floor(u/3600), m = Math.floor((u%3600)/60); return `${h}h ${m}m`; })(), inline: true },
                )
                .setFooter({ text: '👑 لوحة تحكم المالك الحصرية — My Real Bot' })
                .setTimestamp();

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setLabel('🌐 فتح لوحة التحكم')
                    .setStyle(ButtonStyle.Link)
                    .setURL(dashUrl || 'https://discord.com')
                    .setDisabled(!dashUrl),
            );

            // إرسال في الخاص
            await message.author.send({ embeds: [embed], components: [row] }).catch(async () => {
                // إذا كانت الخاصة مغلقة، نرسل في نفس القناة
                await message.reply({ embeds: [embed], components: [row] });
            });

            // تأكيد مرئي في القناة
            await message.react('✅').catch(() => {});
        } catch (e) {
            console.error('[DashboardDM] خطأ:', e.message);
        }
        return false; // Stop pipeline
    }

    // أوامر لوحة التحكم الديسكورد الداخلية (owner-dashboard)
    const discordDashTriggers = ['هيلب', 'help', '!help'];
    if (discordDashTriggers.includes(lowMsg)) {
        try {
            const ownerDashboard = require('../../commands/main/owner-dashboard');
            await ownerDashboard.sendOwnerDashboard(message);
        } catch (e) {
            console.error('[OwnerDashboard] خطأ:', e.message);
        }
        return false; // Stop pipeline
    }

    return true; // Continue
};
