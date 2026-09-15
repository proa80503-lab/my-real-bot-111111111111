const { EmbedBuilder, AttachmentBuilder } = require('discord.js');
const config = require('../config');
const botSettings = require('./bot-settings');
const { createCanvas, loadImage } = require('canvas');

// دالة مساعدة لجلب الصور (لتخطي حماية Discord و ImgBB للـ Canvas)
async function fetchImageBuffer(url) {
    const res = await fetch(url, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
    });
    if (!res.ok) throw new Error(`Failed to fetch image: ${res.status}`);
    const arrayBuffer = await res.arrayBuffer();
    return Buffer.from(arrayBuffer);
}

// رسالة ترحيب للأعضاء الجدد
async function sendWelcome(member) {
    try {
        // البحث عن قناة الترحيب
        const welcomeChannel = member.guild.channels.cache.find(
            ch => ch.name === 'الترحيب' || ch.name === 'welcome' || ch.name === '👋┃الترحيب'
        ) || member.guild.systemChannel;

        if (!welcomeChannel) return;

        // ─── Generate Welcome Image ──────────────────────────────────────────
        const settings = botSettings.getAll();
        let attachment = null;

        if (settings.welcomeImage) {
            try {
                const canvas = createCanvas(1920, 1080);
                const ctx = canvas.getContext('2d');

                // 1. Draw Background
                const bgBuffer = await fetchImageBuffer(settings.welcomeImage);
                const bgImage = await loadImage(bgBuffer);
                ctx.drawImage(bgImage, 0, 0, canvas.width, canvas.height);

                // 2. Avatar Settings
                const aX = settings.welcomeAvatarX || 960;
                const aY = settings.welcomeAvatarY || 540;
                const aWidth = settings.welcomeAvatarWidth || 256;
                const aHeight = settings.welcomeAvatarHeight || 256;
                const aRadiusPercent = settings.welcomeAvatarRadius || 50;

                // 3. Calculate positioning (X, Y are center)
                const startX = aX - (aWidth / 2);
                const startY = aY - (aHeight / 2);
                
                // Border radius calculation
                // For a rectangle, the maximum border radius is half the smaller dimension
                const maxRadius = Math.min(aWidth, aHeight) / 2;
                const cornerRadius = (aRadiusPercent / 50) * maxRadius; // 50% = maxRadius

                // 4. Draw Avatar with rounded corners
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

                // Fetch avatar at size 256 to ensure good quality
                const avatarUrl = member.user.displayAvatarURL({ extension: 'png', size: 256 });
                const avatarBuffer = await fetchImageBuffer(avatarUrl);
                const avatarImg = await loadImage(avatarBuffer);
                ctx.drawImage(avatarImg, startX, startY, aWidth, aHeight);
                ctx.restore();

                // Generate Buffer
                const buffer = canvas.toBuffer('image/png');
                attachment = new AttachmentBuilder(buffer, { name: 'welcome.png' });
            } catch (err) {
                console.error('[Welcome Image Error]', err.message);
            }
        }

        const messagePayload = {
            content: `||@everyone|| 🎊 مرحباً بك يا ${member}! نورت سيرفر **${member.guild.name}**!`,
        };

        if (attachment) {
            messagePayload.files = [attachment];
        }

        await welcomeChannel.send(messagePayload);

        // رسالة خاصة للعضو
        try {
            const dmEmbed = new EmbedBuilder()
                .setColor('#9B59B6')
                .setTitle(`مرحباً بك في ${member.guild.name}! 👋`)
                .setDescription(`أهلاً ${member.user.username}! نحن سعداء جداً بانضمامك!`)
                .addFields(
                    {
                        name: '🎮 ابدأ الآن',
                        value: 'توجه إلى السيرفر واكتب:\n• `تفعيل` - لإعداد حسابك\n• `يومي` - للحصول على مكافأة يومية\n• `!help` - لرؤية جميع الأوامر'
                    },
                    {
                        name: '💰 مكافأة الانضمام',
                        value: `لقد حصلت على **${config.startBalance} ${config.currency}** كمكافأة ترحيب!`
                    },
                    {
                        name: '📜 القوانين',
                        value: 'تأكد من قراءة قوانين السيرفر واحترامها!'
                    }
                )
                .setThumbnail(member.guild.iconURL())
                .setFooter({ text: 'استمتع بوقتك معنا!' })
                .setTimestamp();

            await member.send({ embeds: [dmEmbed] });
        } catch (error) {
            console.log(`لا يمكن إرسال رسالة خاصة لـ ${member.user.tag}`);
        }

    } catch (error) {
        console.error('خطأ في رسالة الترحيب:', error);
    }
}

module.exports = { sendWelcome };
