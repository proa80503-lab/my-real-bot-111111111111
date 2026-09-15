const { EmbedBuilder, AttachmentBuilder } = require('discord.js');
const config      = require('../config');
const botSettings = require('../src/database/bot-settings-db');
const { createCanvas, loadImage } = require('canvas');

// دالة مساعدة لجلب الصور كـ Buffer (تتخطى حماية Discord وImgBB)
async function fetchImageBuffer(url) {
    const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
    return Buffer.from(await res.arrayBuffer());
}

/**
 * إرسال رسالة الترحيب مع الصورة
 * @param {import('discord.js').GuildMember} member
 */
async function sendWelcome(member) {
    try {
        const settings = botSettings.getAll();

        // ── تحديد قناة الترحيب ──────────────────────────────────────────────────
        let welcomeChannel = null;

        if (settings.welcomeChannelId) {
            // الأولوية: الروم المحدد يدوياً من لوحة التحكم
            try {
                const guild = settings.welcomeGuildId
                    ? member.client.guilds.cache.get(settings.welcomeGuildId) || member.guild
                    : member.guild;
                welcomeChannel = guild.channels.cache.get(settings.welcomeChannelId);
            } catch {}
        }

        if (!welcomeChannel) {
            // الاحتياطي: أي روم اسمه الترحيب أو النظام
            welcomeChannel = member.guild.channels.cache.find(
                ch => ch.name === 'الترحيب' || ch.name === 'welcome' || ch.name === '👋┃الترحيب'
            ) || member.guild.systemChannel;
        }

        if (!welcomeChannel) {
            console.warn('[Welcome] ⚠️ لم يتم العثور على قناة ترحيب — تأكد من ضبط Channel ID في لوحة التحكم');
            return;
        }

        // ── بناء صورة الترحيب ───────────────────────────────────────────────────
        let attachment = null;
        const imageUrl = (settings.welcomeImage || '').trim();

        if (imageUrl) {
            try {
                const canvas = createCanvas(1920, 1080);
                const ctx    = canvas.getContext('2d');

                // 1. خلفية
                const bgBuffer = await fetchImageBuffer(imageUrl);
                const bgImage  = await loadImage(bgBuffer);
                ctx.drawImage(bgImage, 0, 0, canvas.width, canvas.height);

                // 2. إعدادات الصورة الرمزية
                const aX      = Number(settings.welcomeAvatarX)      || 960;
                const aY      = Number(settings.welcomeAvatarY)      || 540;
                const aWidth  = Number(settings.welcomeAvatarWidth)  || 256;
                const aHeight = Number(settings.welcomeAvatarHeight) || 256;
                const aRadius = Number(settings.welcomeAvatarRadius) || 50;

                const startX       = aX - aWidth  / 2;
                const startY       = aY - aHeight / 2;
                const maxRadius    = Math.min(aWidth, aHeight) / 2;
                const cornerRadius = (aRadius / 50) * maxRadius;

                // 3. قص مستدير
                ctx.save();
                ctx.beginPath();
                ctx.moveTo(startX + cornerRadius, startY);
                ctx.lineTo(startX + aWidth - cornerRadius, startY);
                ctx.quadraticCurveTo(startX + aWidth, startY, startX + aWidth, startY + cornerRadius);
                ctx.lineTo(startX + aWidth, startY + aHeight - cornerRadius);
                ctx.quadraticCurveTo(startX + aWidth, startY + aHeight, startX + aWidth - cornerRadius, startY + aHeight);
                ctx.lineTo(startX + cornerRadius, startY + aHeight);
                ctx.quadraticCurveTo(startX, startY + aHeight, startX, startY + aHeight - cornerRadius);
                ctx.lineTo(startX, startY + cornerRadius);
                ctx.quadraticCurveTo(startX, startY, startX + cornerRadius, startY);
                ctx.closePath();
                ctx.clip();

                // 4. رسم الصورة الرمزية
                const avatarUrl = member.user.displayAvatarURL({ extension: 'png', size: 256 });
                const avBuffer  = await fetchImageBuffer(avatarUrl);
                const avatarImg = await loadImage(avBuffer);
                ctx.drawImage(avatarImg, startX, startY, aWidth, aHeight);
                ctx.restore();

                attachment = new AttachmentBuilder(canvas.toBuffer('image/png'), { name: 'welcome.png' });
                console.log('[Welcome] ✅ تم إنشاء صورة الترحيب');
            } catch (err) {
                console.error('[Welcome] ❌ فشل إنشاء الصورة:', err.message);
            }
        } else {
            console.warn('[Welcome] ⚠️ لا توجد صورة ترحيب مضبوطة في الإعدادات');
        }

        // ── إرسال الرسالة ────────────────────────────────────────────────────────
        const payload = {
            content: `||@everyone|| 🎊 مرحباً بك يا ${member}! نورت سيرفر **${member.guild.name}**!`,
        };
        if (attachment) payload.files = [attachment];
        await welcomeChannel.send(payload);
        console.log(`[Welcome] ✅ تم إرسال ترحيب لـ ${member.user.tag} في #${welcomeChannel.name}`);

        // ── رسالة خاصة ──────────────────────────────────────────────────────────
        try {
            const dmEmbed = new EmbedBuilder()
                .setColor('#9B59B6')
                .setTitle(`مرحباً بك في ${member.guild.name}! 👋`)
                .setDescription(`أهلاً ${member.user.username}! نحن سعداء جداً بانضمامك!`)
                .addFields(
                    { name: '🎮 ابدأ الآن', value: '• `تفعيل` - لإعداد حسابك\n• `يومي` - للحصول على مكافأة يومية\n• `!help` - لرؤية جميع الأوامر' },
                    { name: '💰 مكافأة الانضمام', value: `لقد حصلت على **${config.startBalance} ${config.currency}** كمكافأة ترحيب!` },
                    { name: '📜 القوانين', value: 'تأكد من قراءة قوانين السيرفر واحترامها!' }
                )
                .setThumbnail(member.guild.iconURL())
                .setFooter({ text: 'استمتع بوقتك معنا!' })
                .setTimestamp();
            await member.send({ embeds: [dmEmbed] });
        } catch {
            console.log(`[Welcome] ℹ️ لا يمكن إرسال DM لـ ${member.user.tag}`);
        }

    } catch (error) {
        console.error('[Welcome] ❌ خطأ عام:', error);
    }
}

module.exports = { sendWelcome };
