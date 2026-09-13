'use strict';

/**
 * ═══════════════════════════════════════════════════════════
 * 🛒 متجر السيرفر المطور — Shop Command
 * (الآن الشراء يتم بالكامل و بأمان من داخل لوحة التحكم بالرابط)
 * ═══════════════════════════════════════════════════════════
 */

const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const db = require('../../utils/database');
const config = require('../../config');
const dashboard = require('../../dashboard-server');

// ── إرسال رابط المتجر بالخاص (DM) ──────────────────────────────────────
async function sendShopDM(user) {
    const userData = db.getUserData(user.id);
    const balance = userData.balance || 0;
    const bank = userData.bank || 0;

    const token = dashboard.generateWebToken(user);
    const storeUrl = `${process.env.RENDER_EXTERNAL_URL || 'http://localhost:' + (process.env.PORT || 3000)}/store?token=${token}`;

    const embed = new EmbedBuilder()
        .setColor('#2ECC71')
        .setTitle('🛒 رابط متجرك السري')
        .setDescription('تم تجهيز المتجر لك! يمكنك الآن شراء الأغراض والأصول مباشرة بضغطة زر من الموقع.')
        .addFields(
            {
                name: '💰 رصيدك الحالي',
                value: `المحفظة: **${balance.toLocaleString()}** | البنك: **${bank.toLocaleString()}** ${config.currency}`,
                inline: false
            },
            {
                name: '🔒 تنبيه أمني',
                value: 'هذا الرابط خاص بك وفيه جلسة آمنة لشراء الأغراض لحسابك. **لا تشاركه مع أحد!** ينتهي الرابط بعد ساعة.',
                inline: false
            }
        )
        .setImage('https://images.unsplash.com/photo-1555529771-835f59fc5efe?q=80&w=800')
        .setFooter({ text: 'انقر على الزر بالأسفل لفتح المتجر المباشر' })
        .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setLabel('🌐 الدخول للمتجر والشراء').setStyle(ButtonStyle.Link).setURL(storeUrl)
    );

    try {
        await user.send({ embeds: [embed], components: [row] });
        return true;
    } catch {
        return false; // المستخدم أغلق الخاص
    }
}

module.exports = {
    name: 'shop',
    aliases: ['متجر', 'شوب', 'store', 'buy', 'شراء'],
    description: 'يفتح رابط متجرك الشخصي لتتمكن من الشراء منه مباشرة',
    usage: 'متجر',

    async execute(message) {
        try {
            const user = message.author;
            
            // إرسال الرابط بالخاص (DM)
            const sent = await sendShopDM(user);
            if (sent) {
                await message.reply('📬 تم إرسال رابط متجرك **بالخاص** للتسوق المباشر والآمن! يرجى التحقق من رسائلك الخاصة.').catch(() => {});
            } else {
                // المستخدم أغلق الـ DMs — نعطيه رابط مباشر هنا ونخبره أنه غير آمن
                const token = dashboard.generateWebToken(user);
                const storeUrl = `${process.env.RENDER_EXTERNAL_URL || 'http://localhost:' + (process.env.PORT || 3000)}/store?token=${token}`;
                
                const embed = new EmbedBuilder()
                    .setColor('#E74C3C')
                    .setTitle('⚠️ لم نتمكن من إرسال الرابط بالخاص')
                    .setDescription('يرجى فتح الرسائل الخاصة لتلقي رابط المتجر بأمان مستقبلاً.\n\nإليك رابطك الموقت (لا تشاركه مع أحد):')
                    .setTimestamp();

                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setLabel('🌐 الدخول للمتجر').setStyle(ButtonStyle.Link).setURL(storeUrl)
                );

                await message.reply({ embeds: [embed], components: [row] });
            }
        } catch (err) {
            console.error('[Shop Command Error]', err);
            message.reply('حدث خطأ أثناء فتح المتجر.').catch(() => {});
        }
    }
};

