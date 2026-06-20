const { EmbedBuilder } = require('discord.js');
const config = require('../../config');

const adminMessages = [
    'أهلاً بك في فريق الإدارة! 🎉 جهز نفسك للصداع ومشاكل الأعضاء التي لا تنتهي.',
    'مبروك رتبة الأدمن! الآن يمكنك الاستمتاع بقراءة شات العقوبات طوال اليوم. 😅',
    'تم ترقيتك لأدمن. تذكر: القوة العظيمة تأتي مع... رغبة كبيرة في حظر الجميع. 😏',
    'أصبحت أدمن؟ رائع. الآن اذهب ونظف الشات، إنه فوضوي. 🧹',
    'مبروك! لقد فزت بلقب "جليس الأطفال" الرسمي للسيرفر. 👶',
];

module.exports = {
    name: 'رول ادمن',
    aliases: ['rol-admin', 'admin-role', 'اعطي ادمن', 'اعطِ ادمن', 'add-admin'],
    description: 'إعطاء رتبة الادمن لعضو (لمالك البوت فقط)',
    usage: 'رول ادمن @user',

    async execute(message, args) {
        // فقط مالك البوت
        if (message.author.id !== config.ownerId) {
            return message.reply('❌ من تظن نفسك؟ هذا الأمر لمالك البوت فقط.');
        }

        const target = message.mentions.members.first();
        if (!target) {
            return message.reply('❌ منشن الشخص الذي تريد منحه رتبة **👮 Admin**!\n`رول ادمن @user`');
        }

        if (target.id === message.author.id) {
            return message.reply('أنت المالك يا صاحبي، ما تحتاج ادمن 😄');
        }

        // البحث عن رتبة الأدمن (تقبل أي صيغة فيها كلمة admin أو ادمن أو أدمن)
        const adminRole = message.guild.roles.cache.find(r =>
            r.name.toLowerCase().includes('admin') ||
            r.name.includes('أدمن') ||
            r.name.includes('ادمن')
        );

        if (!adminRole) {
            return message.reply('❌ لم أجد رتبة **Admin** في السيرفر!\nتأكد من وجود رتبة تحتوي على كلمة `admin` أو `ادمن` في اسمها.');
        }

        try {
            await target.roles.add(adminRole);

            const embed = new EmbedBuilder()
                .setColor('#E74C3C')
                .setTitle('👮 تعيين أدمن جديد')
                .setDescription(`تم تعيين ${target} كـ **${adminRole.name}**!`)
                .addFields(
                    { name: 'العضو', value: `${target} (${target.user.username})`, inline: true },
                    { name: 'الرتبة', value: `${adminRole}`, inline: true },
                    { name: 'بواسطة', value: `${message.author}`, inline: true }
                )
                .setThumbnail(target.user.displayAvatarURL())
                .setTimestamp();

            await message.reply({ embeds: [embed] });

            // رسالة خاصة ساخرة للأدمن الجديد
            const dm = new EmbedBuilder()
                .setColor('#E74C3C')
                .setTitle('👮 ترقية إدارية — مبروك!')
                .setDescription(adminMessages[Math.floor(Math.random() * adminMessages.length)])
                .addFields({ name: 'الصلاحيات', value: 'طرد، حظر، إدارة الرومات، والمزيد...' })
                .setFooter({ text: 'حظاً موفقاً، ستحتاجه.' });

            await target.send({ embeds: [dm] }).catch(() => {
                message.channel.send(`⚠️ لم أستطع إرسال رسالة خاصة لـ ${target} (الخاص مغلق)، لكنه أصبح أدمن.`);
            });

        } catch (error) {
            console.error('[rol-admin error]:', error);
            return message.reply(`❌ فشل إعطاء الرتبة!\n> تأكد أن رتبة البوت **أعلى** من رتبة **${adminRole.name}** في قائمة الرول.`);
        }
    }
};
