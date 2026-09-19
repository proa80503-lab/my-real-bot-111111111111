'use strict';

/**
 * welcome.js — نظام الترحيب
 *
 * ══════════════════════════════════════════════════════════
 *  مصدر البيانات الوحيد: Guild DB (per-guild)
 *  ─ welcomeEnabled  : هل الترحيب مفعّل لهذا السيرفر؟
 *  ─ welcomeChannel  : ID قناة الترحيب
 *  ─ welcomeImage    : رابط صورة الخلفية (اختياري)
 *  ─ welcomeAvatarX/Y/Size/Radius : إعدادات موضع الصورة الرمزية
 * ══════════════════════════════════════════════════════════
 */

const { EmbedBuilder, AttachmentBuilder, PermissionsBitField } = require('discord.js');
const db = require('../src/database/db');

// ── الصلاحيات المطلوبة لإرسال الترحيب ────────────────────────────────────────
const REQUIRED_PERMS = [
    PermissionsBitField.Flags.ViewChannel,
    PermissionsBitField.Flags.SendMessages,
];
const REQUIRED_PERMS_EMBED = [
    ...REQUIRED_PERMS,
    PermissionsBitField.Flags.EmbedLinks,
    PermissionsBitField.Flags.AttachFiles,
];

// ── جلب صورة كـ Buffer ────────────────────────────────────────────────────────
async function fetchImageBuffer(url) {
    if (url.startsWith('/uploads/')) {
        const fs = require('fs');
        const path = require('path');
        // مسار الصورة المحلي نسبة لمجلد التشغيل
        const localPath = path.join(process.cwd(), 'data', url);
        return fs.promises.readFile(localPath);
    }
    const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
        signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} للرابط: ${url}`);
    return Buffer.from(await res.arrayBuffer());
}

// ── بناء صورة الترحيب بـ Canvas ──────────────────────────────────────────────
async function buildWelcomeImage(guildData, member) {
    const imageUrl = String(guildData.welcomeImage || '').trim();
    if (!imageUrl) return { attachment: null, error: 'رابط الصورة غير موجود' };

    try {
        const { createCanvas, loadImage } = require('canvas');
        const canvas = createCanvas(1920, 1080);
        const ctx    = canvas.getContext('2d');

        // 1. الخلفية
        const bgBuf = await fetchImageBuffer(imageUrl);
        let bgImg;
        try {
            bgImg = await loadImage(bgBuf);
        } catch (loadErr) {
            throw new Error(`تعذر قراءة الصورة (تأكد أن الرابط مباشر لصورة وليس لصفحة ويب، مثال: ينتهي بـ .png أو .jpg)`);
        }
        ctx.drawImage(bgImg, 0, 0, 1920, 1080);

        // 2. إعدادات الصورة الرمزية
        const aX      = Number(guildData.welcomeAvatarX)    || 960;
        const aY      = Number(guildData.welcomeAvatarY)    || 540;
        const aW      = Number(guildData.welcomeAvatarSize) || 256;
        const aH      = aW; // دائماً مربّع
        const aRadius = Number(guildData.welcomeAvatarRadius) || 50;

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
        let avBuf;
        try {
            const avatarUrl = member.user.displayAvatarURL({ extension: 'png', size: 256, forceStatic: true });
            avBuf = await fetchImageBuffer(avatarUrl);
            ctx.drawImage(await loadImage(avBuf), startX, startY, aW, aH);
        } catch (avErr) {
            console.error('[Welcome] فشل تحميل صورة العضو:', avErr.message);
            // تجاهل خطأ صورة العضو وأكمل الرسم بدونها أو ارسم مربع فارغ
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.fillRect(startX, startY, aW, aH);
        }
        ctx.restore();

        console.log(`[Welcome] ✅ تم بناء صورة الترحيب للعضو ${member.user.tag}`);
        return { attachment: new AttachmentBuilder(canvas.toBuffer('image/png'), { name: 'welcome.png' }), error: null };
    } catch (err) {
        console.error(`[Welcome] ⚠️ فشل بناء الصورة (لن يُوقف الإرسال):`, err.message);
        return { attachment: null, error: err.message };
    }
}

// ── فحص صلاحيات البوت في القناة ──────────────────────────────────────────────
function checkBotPermissions(channel, hasImage) {
    const me = channel.guild?.members?.me;
    if (!me) return { ok: false, missing: ['Bot member not found in guild'] };

    const requiredPerms = hasImage ? REQUIRED_PERMS_EMBED : REQUIRED_PERMS;
    const missing = requiredPerms
        .filter(perm => !channel.permissionsFor(me).has(perm))
        .map(perm => Object.keys(PermissionsBitField.Flags).find(k => PermissionsBitField.Flags[k] === perm) || String(perm));

    return { ok: missing.length === 0, missing };
}

// ── الدالة الرئيسية للترحيب ───────────────────────────────────────────────────
async function sendWelcome(member) {
    const guildId  = member.guild.id;
    const memberId = member.user.id;
    const tag      = member.user.tag;

    // ── [1] قراءة إعدادات السيرفر — المصدر الوحيد ───────────────────────────
    const guildData = db.getGuildData(guildId);

    // ── [2] هل الترحيب مفعّل؟ ───────────────────────────────────────────────
    if (!guildData.welcomeEnabled) {
        console.log(`[Welcome] ⏭️  الترحيب معطّل في Guild ${guildId} — لا يوجد إجراء`);
        return;
    }

    // ── [3] هل تم تحديد قناة ترحيب؟ ────────────────────────────────────────
    const channelId = guildData.welcomeChannel;
    if (!channelId) {
        console.warn(
            `[Welcome] ⚠️  Guild: ${guildId} | Member: ${memberId} (${tag})\n` +
            `  → الترحيب مفعّل لكن لم يتم تحديد قناة ترحيب.\n` +
            `  → الحل: اذهب للـ Dashboard وحدد روم الترحيب.`
        );
        return;
    }

    // ── [4] جلب القناة من Discord ────────────────────────────────────────────
    let welcomeChannel = null;
    try {
        welcomeChannel = await member.client.channels.fetch(channelId);
    } catch (fetchErr) {
        console.error(
            `[Welcome] ❌ فشل جلب قناة الترحيب\n` +
            `  → Guild: ${guildId} | Member: ${memberId} (${tag})\n` +
            `  → Channel ID: ${channelId}\n` +
            `  → السبب: ${fetchErr.message}\n` +
            `  → الحلول المقترحة:\n` +
            `     • تأكد أن القناة لم تُحذف\n` +
            `     • تأكد أن البوت لديه صلاحية View Channel في هذه القناة\n` +
            `     • حدّث قناة الترحيب من الـ Dashboard`
        );
        return;
    }

    // ── [5] تأكد أن القناة تنتمي لنفس السيرفر ──────────────────────────────
    if (welcomeChannel.guildId && welcomeChannel.guildId !== guildId) {
        console.error(
            `[Welcome] ❌ القناة ${channelId} تنتمي لسيرفر مختلف!\n` +
            `  → Guild المتوقع: ${guildId}\n` +
            `  → Guild الفعلي:  ${welcomeChannel.guildId}\n` +
            `  → الحل: أعد تحديد قناة الترحيب الصحيحة من الـ Dashboard`
        );
        return;
    }

    // ── [6] تأكد أن القناة نصية ─────────────────────────────────────────────
    if (!welcomeChannel.isTextBased()) {
        console.error(
            `[Welcome] ❌ القناة ${channelId} ليست قناة نصية\n` +
            `  → Guild: ${guildId} | Type: ${welcomeChannel.type}`
        );
        return;
    }

    // ── [7] فحص صلاحيات البوت ───────────────────────────────────────────────
    const hasImage = Boolean(guildData.welcomeImage);
    const permCheck = checkBotPermissions(welcomeChannel, hasImage);
    if (!permCheck.ok) {
        console.error(
            `[Welcome] ❌ البوت لا يملك الصلاحيات الكافية في قناة الترحيب\n` +
            `  → Guild: ${guildId} | Channel: ${channelId} (#${welcomeChannel.name})\n` +
            `  → الصلاحيات الناقصة: ${permCheck.missing.join(', ')}\n` +
            `  → الحل: أضف الصلاحيات المطلوبة للبوت في إعدادات السيرفر`
        );
        return;
    }

    console.log(
        `[Welcome] 📨 بدء إرسال ترحيب\n` +
        `  → Guild: ${guildId} (${member.guild.name})\n` +
        `  → Member: ${memberId} (${tag})\n` +
        `  → Channel: ${channelId} (#${welcomeChannel.name})\n` +
        `  → Image: ${hasImage ? '✅ موجودة' : '❌ غير موجودة'}`
    );

    // ── [8] بناء الصورة (اختياري) ───────────────────────────────────────────
    let attachment = null;
    let imgError = null;
    if (hasImage) {
        const result = await buildWelcomeImage(guildData, member);
        attachment = result.attachment;
        imgError = result.error;
    }

    // ── [9] إرسال رسالة الترحيب ─────────────────────────────────────────────
    try {
        const payload = {
            content: `||@everyone|| 🎊 مرحباً بك يا ${member}! نورت سيرفر **${member.guild.name}**!`,
        };
        if (attachment) {
            payload.files = [attachment];
        } else if (hasImage) {
            payload.content += `\n\n*(⚠️ فشل إنشاء صورة الترحيب: ${imgError})*`;
        }
        await welcomeChannel.send(payload);
        console.log(`[Welcome] ✅ تم إرسال ترحيب للعضو ${tag} في #${welcomeChannel.name}`);
    } catch (sendErr) {
        console.error(
            `[Welcome] ❌ فشل إرسال رسالة الترحيب\n` +
            `  → Guild: ${guildId} | Member: ${memberId} (${tag})\n` +
            `  → Channel: ${channelId} (#${welcomeChannel.name})\n` +
            `  → Discord Error: ${sendErr.message}`
        );
        return;
    }

    // ── [10] رسالة خاصة للعضو (DM) ─────────────────────────────────────────
    try {
        const { config } = (() => { try { return { config: require('../config') }; } catch { return { config: {} }; } })();
        const dmEmbed = new EmbedBuilder()
            .setColor('#9B59B6')
            .setTitle(`مرحباً بك في ${member.guild.name}! 👋`)
            .setDescription(`أهلاً ${member.user.username}! نحن سعداء جداً بانضمامك!`)
            .addFields(
                { name: '🎮 ابدأ الآن', value: '• `تفعيل` — لإعداد حسابك\n• `يومي` — مكافأة يومية\n• `!help` — جميع الأوامر' },
                { name: '💰 مكافأة الانضمام', value: `حصلت على **${config.startBalance ?? 1000} ${config.currency ?? '💰'}** هدية ترحيب!` },
                { name: '📜 القوانين', value: 'تأكد من قراءة قوانين السيرفر!' }
            )
            .setThumbnail(member.guild.iconURL())
            .setFooter({ text: 'استمتع بوقتك معنا! 🎉' })
            .setTimestamp();
        await member.send({ embeds: [dmEmbed] });
    } catch {
        console.log(`[Welcome] ℹ️ لا يمكن إرسال DM لـ ${tag} (الخصوصية مغلقة أو Block)`);
    }
}

// ── إرسال تجريبي مباشر لقناة محددة (من الـ Dashboard) ──────────────────────
async function sendWelcomeToChannel(channel, member, overrideSettings = {}) {
    // دمج إعدادات الـ Guild مع أي override من الـ Dashboard
    const guildData = member?.guild?.id ? db.getGuildData(member.guild.id) : {};
    const settings  = { ...guildData, ...overrideSettings };
    const hasImage = Boolean(settings.welcomeImage);

    let attachment = null;
    let imgError = null;
    if (hasImage) {
        const result = await buildWelcomeImage(settings, member);
        attachment = result.attachment;
        imgError = result.error;
    }

    const payload = {
        content: `||@everyone|| 🎊 **[تجربة]** مرحباً بك يا ${member}! نورت سيرفر **${member.guild.name}**!`,
    };
    
    if (attachment) {
        payload.files = [attachment];
    } else if (hasImage) {
        payload.content += `\n\n*(⚠️ فشل إنشاء صورة الترحيب: ${imgError})*`;
    }
    
    await channel.send(payload);
    console.log(`[Welcome] 🧪 تجربة ترحيب تم إرسالها إلى #${channel.name} في ${member.guild.name}`);
}

module.exports = { sendWelcome, sendWelcomeToChannel };
