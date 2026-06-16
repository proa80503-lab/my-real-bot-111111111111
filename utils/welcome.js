const { EmbedBuilder, AttachmentBuilder } = require('discord.js');
const config = require('../config');

// رسالة ترحيب للأعضاء الجدد
async function sendWelcome(member) {
    try {
        // البحث عن قناة الترحيب
        const welcomeChannel = member.guild.channels.cache.find(
            ch => ch.name === 'الترحيب' || ch.name === 'welcome' || ch.name === '👋┃الترحيب'
        ) || member.guild.systemChannel;

        if (!welcomeChannel) return;

        const memberCount = member.guild.memberCount;

        const embed = new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle('🎉 عضو جديد انضم!')
            .setDescription(`مرحباً ${member}! نحن سعداء بانضمامك إلى **${member.guild.name}**!`)
            .setThumbnail(member.user.displayAvatarURL({ size: 256 }))
            .addFields(
                {
                    name: '👤 العضو',
                    value: `<@${member.id}>`,
                    inline: true
                },
                {
                    name: '📅 تاريخ الإنشاء',
                    value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`,
                    inline: true
                },
                {
                    name: '👥 العدد الكلي',
                    value: `أنت العضو رقم **${memberCount}**`,
                    inline: true
                },
                {
                    name: '💡 نصائح للبداية',
                    value: `• اكتب \`تفعيل\` لإعداد حسابك\n• اكتب \`يومي\` للحصول على مكافأة\n• اكتب \`!help\` لرؤية جميع الأوامر`
                }
            )
            .setFooter({ text: `${member.guild.name}` })
            .setTimestamp();

        await welcomeChannel.send({
            content: `||@everyone|| 🎊 عضو جديد!`,
            embeds: [embed]
        });

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
