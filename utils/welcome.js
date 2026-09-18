'use strict';

const { EmbedBuilder, AttachmentBuilder } = require('discord.js');
const config      = require('../config');
const botSettings = require('../src/database/bot-settings-db');
const db          = require('../src/database/db');
const { createCanvas, loadImage } = require('canvas');

// ── جلب صورة كـ Buffer ─────────────────────────────────────────────────────────
async function fetchImageBuffer(url) {
    const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
        signal: AbortSignal.timeout(10000), // timeout 10 ثانية
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
    return Buffer.from(await res.arrayBuffer());
}

// ── بناء صورة الترحيب Canvas ───────────────────────────────────────────────────
async function buildWelcomeImage(settings, member) {
    const imageUrl = String(settings.welcomeImage || '').trim();
    if (!imageUrl) return null;

    try {
        const canvas = createCanvas(1920, 1080);
        const ctx    = canvas.getContext('2d');

        // 1. الخلفية
        const bgBuf = await fetchImageBuffer(imageUrl);
        ctx.drawImage(await loadImage(bgBuf), 0, 0, 1920, 1080);

        // 2. إعدادات الصورة الرمزية
        const aX      = Number(settings.welcomeAvatarX)      || 960;
        const aY      = Number(settings.welcomeAvatarY)      || 540;
        const aW      = Number(settings.welcomeAvatarWidth)  || 256;
        const aH      = Number(settings.welcomeAvatarHeight) || 256;
        const aRadius = Number(settings.welcomeAvatarRadius) || 50;

        const startX       = aX - aW / 2;
        const startY       = aY - aH / 2;
        const cornerRadius = (aRadius / 50) * Math.min(aW, aH) / 2;

        // 3. قص مستدير للصورة الرمزية
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(startX + cornerRadius, startY);
        ctx.lineTo(startX + aW - cornerRadius, startY);
        ctx.quadraticCurveTo(startX + aW, startY, startX + aW, startY + cornerRadius);
        ctx.lineTo(startX + aW, startY + aH - cornerRadius);
        ctx.quadraticCurveTo(startX + aW, startY + aH, startX + aW - cornerRadius, startY + aH);
        ctx.lineTo(startX + cornerRadius, startY + aH);
        ctx.quadraticCurveTo(startX, startY + aH, startX, startY + aH - cornerRadius);
        ctx.lineTo(startX, startY + cornerRadius);
        ctx.quadraticCurveTo(startX, startY, startX + cornerRadius, startY);
        ctx.closePath();
        ctx.clip();

        // 4. رسم صورة العضو
        const avatarUrl = member.user.displayAvatarURL({ extension: 'png', size: 256, forceStatic: true });
        const avBuf     = await fetchImageBuffer(avatarUrl);
        ctx.drawImage(await loadImage(avBuf), startX, startY, aW, aH);
        ctx.restore();

        console.log('[Welcome] ✅ تم بناء صورة الترحيب');
        return new AttachmentBuilder(canvas.toBuffer('image/png'), { name: 'welcome.png' });
    } catch (err) {
        console.error('[Welcome] ❌ فشل بناء الصورة:', err.message);
        return null;
    }
}

// ── الدالة الرئيسية للترحيب ────────────────────────────────────────────────────
async function sendWelcome(member) {
    try {
        // جمع الإعدادات من المصدرين: botSettings + guildData
        // guildData يأخذ الأولوية لصورة الترحيب والقناة إذا كانت موجودة فيه
        const globalSettings = botSettings.getAll();
        const guildData      = db.getGuildData(member.guild.id);

        const settings = {
            ...globalSettings,
            // إذا وجدت صورة في guildData نستخدمها، وإلا نستخدم من botSettings
            welcomeImage:       guildData.welcomeImage       || globalSettings.welcomeImage       || '',
            welcomeAvatarX:     guildData.welcomeAvatarX     || globalSettings.welcomeAvatarX     || 960,
            welcomeAvatarY:     guildData.welcomeAvatarY     || globalSettings.welcomeAvatarY     || 540,
            welcomeAvatarWidth: guildData.welcomeAvatarSize  || globalSettings.welcomeAvatarWidth || 256,
            welcomeAvatarHeight:guildData.welcomeAvatarSize  || globalSettings.welcomeAvatarHeight|| 256,
            welcomeAvatarRadius:guildData.welcomeAvatarRadius|| globalSettings.welcomeAvatarRadius|| 50,
            welcomeChannelId:   guildData.welcomeChannel     || globalSettings.welcomeChannelId   || '',
        };

        console.log('[Welcome] 📋 Settings:', {
            image: settings.welcomeImage ? '✅ موجودة' : '❌ غير موجودة',
            channel: settings.welcomeChannelId || 'غير محدد'
        });

        // ── تحديد قناة الترحيب ──────────────────────────────────────────────────
        let welcomeChannel = null;

        if (settings.welcomeChannelId) {
            try {
                // استخدم client.channels.fetch مباشرة — الأكثر موثوقية
                welcomeChannel = await member.client.channels.fetch(settings.welcomeChannelId);
            } catch (e) {
                console.warn('[Welcome] فشل جلب القناة من الـ ID:', e.message);
            }
        }

        // احتياطي: قناة اسمها الترحيب أو systemChannel
        if (!welcomeChannel) {
            welcomeChannel = member.guild.channels.cache.find(
                ch => ch.name === 'الترحيب' || ch.name === 'welcome' || ch.name === '👋┃الترحيب'
            ) || member.guild.systemChannel;
        }

        if (!welcomeChannel) {
            console.warn('[Welcome] ⚠️ لم يُعثر على قناة ترحيب — اضبط Channel ID في لوحة التحكم');
            return;
        }

        // ── بناء الصورة ──────────────────────────────────────────────────────────
        const attachment = await buildWelcomeImage(settings, member);

        // ── إرسال رسالة الترحيب ──────────────────────────────────────────────────
        const payload = {
            content: `||@everyone|| 🎊 مرحباً بك يا ${member}! نورت سيرفر **${member.guild.name}**!`,
        };
        if (attachment) payload.files = [attachment];
        await welcomeChannel.send(payload);
        console.log(`[Welcome] ✅ ترحيب بـ ${member.user.tag} في #${welcomeChannel.name}`);

        // ── رسالة خاصة ───────────────────────────────────────────────────────────
        try {
            const dmEmbed = new EmbedBuilder()
                .setColor('#9B59B6')
                .setTitle(`مرحباً بك في ${member.guild.name}! 👋`)
                .setDescription(`أهلاً ${member.user.username}! نحن سعداء جداً بانضمامك!`)
                .addFields(
                    { name: '🎮 ابدأ الآن', value: '• `تفعيل` — لإعداد حسابك\n• `يومي` — مكافأة يومية\n• `!help` — جميع الأوامر' },
                    { name: '💰 مكافأة الانضمام', value: `حصلت على **${config.startBalance} ${config.currency}** هدية ترحيب!` },
                    { name: '📜 القوانين', value: 'تأكد من قراءة قوانين السيرفر!' }
                )
                .setThumbnail(member.guild.iconURL())
                .setFooter({ text: 'استمتع بوقتك معنا! 🎉' })
                .setTimestamp();
            await member.send({ embeds: [dmEmbed] });
        } catch {
            console.log(`[Welcome] ℹ️ لا يمكن إرسال DM لـ ${member.user.tag}`);
        }

    } catch (error) {
        console.error('[Welcome] ❌ خطأ عام:', error);
    }
}

// ── دالة إرسال مباشر بقناة محددة (للتجربة من الداشبورد) ───────────────────────
async function sendWelcomeToChannel(channel, member, settings) {
    const attachment = await buildWelcomeImage(settings, member);
    const payload = {
        content: `||@everyone|| 🎊 **[تجربة]** مرحباً بك يا ${member}! نورت سيرفر **${member.guild.name}**!`,
    };
    if (attachment) payload.files = [attachment];
    await channel.send(payload);
}

module.exports = { sendWelcome, sendWelcomeToChannel };
