const { EmbedBuilder, AttachmentBuilder } = require('discord.js');
const config = require('../config');
const botSettings = require('./bot-settings');
const { createCanvas, loadImage } = require('canvas');

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
                const bgImage = await loadImage(settings.welcomeImage);
                ctx.drawImage(bgImage, 0, 0, canvas.width, canvas.height);

                // 2. Avatar Settings
                const aX = settings.welcomeAvatarX || 960;
                const aY = settings.welcomeAvatarY || 540;
                const aSize = settings.welcomeAvatarSize || 256;
                const aRadiusPercent = settings.welcomeAvatarRadius || 50;

                // 3. Calculate positioning (X, Y are center)
                const startX = aX - (aSize / 2);
                const startY = aY - (aSize / 2);
                
                // Border radius calculation
                const cornerRadius = (aRadiusPercent / 100) * aSize;

                // 4. Draw Avatar with rounded corners
                ctx.save();
                ctx.beginPath();
                ctx.moveTo(startX + cornerRadius, startY);
                ctx.lineTo(startX + aSize - cornerRadius, startY);
                ctx.quadraticCurveTo(startX + aSize, startY, startX + aSize, startY + cornerRadius);
                ctx.lineTo(startX + aSize, startY + aSize - cornerRadius);
                ctx.quadraticCurveTo(startX + aSize, startY + aSize, startX + aSize - cornerRadius, startY + aSize);
                ctx.lineTo(startX + cornerRadius, startY + aSize);
                ctx.quadraticCurveTo(startX, startY + aSize, startX, startY + aSize - cornerRadius);
                ctx.lineTo(startX, startY + cornerRadius);
                ctx.quadraticCurveTo(startX, startY, startX + cornerRadius, startY);
                ctx.closePath();
                ctx.clip();

                const avatarImg = await loadImage(member.user.displayAvatarURL({ extension: 'png', size: aSize }));
                ctx.drawImage(avatarImg, startX, startY, aSize, aSize);
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
