const { EmbedBuilder } = require('discord.js');
const config = require('../../config');

const ownerMessages = [
    'أوه، انظروا من أصبح الملك! 👑 حاول ألا تدمر السيرفر في أول 5 دقائق، حسناً؟',
    'مبروك يا صاحب الجلالة! 🙄 الآن لديك صلاحية الطرد والحظر، لا تتحمس كثيراً.',
    'تم منحك رتبة أونر. نعم، أنت الآن "مهم" جداً. (لا تصدق ذلك) 😏',
    'أنت الآن الأونر. هل تتوقع تصفيقاً حاراً؟ اعطني راتباً أولاً. 💸',
    'عظيم، أونر جديد... كما لو أننا بحاجة للمزيد من الأوامر. 🤷',
];

module.exports = {
    name: 'رول اونر',
    aliases: ['rol-owner', 'owner-role', 'اعطي اونر', 'اعطِ اونر', 'add-owner'],
    description: 'إعطاء رتبة الأونر لعضو (لمالك البوت فقط)',
    usage: 'رول اونر @user',

    async execute(message, args) {
        // فقط مالك البوت
        if (message.author.id !== config.ownerId) {
            return message.reply('❌ هاها، محاولة جيدة! هذا الأمر لمالك البوت فقط.');
        }

        const target = message.mentions.members.first();
        if (!target) {
            return message.reply('❌ منشن الشخص الذي تريد منحه رتبة **👑 Owner**!\n`رول اونر @user`');
        }

        if (target.id === message.author.id) {
            return message.reply('😂 تبغى تعطي نفسك أونر؟ أنت بالفعل المالك يا حبيبي!');
        }

        // البحث عن رتبة الأونر (تقبل أي صيغة فيها كلمة owner أو أونر)
        const ownerRole = message.guild.roles.cache.find(r =>
            r.name.toLowerCase().includes('owner') ||
            r.name.includes('أونر') ||
            r.name.includes('اونر')
        );

        if (!ownerRole) {
            return message.reply('❌ لم أجد رتبة **Owner** في السيرفر!\nتأكد من وجود رتبة تحتوي على كلمة `owner` أو `أونر` في اسمها.');
        }

        try {
            await target.roles.add(ownerRole);

            const embed = new EmbedBuilder()
                .setColor('#FFD700')
                .setTitle('👑 تعيين أونر جديد')
                .setDescription(`تم تعيين ${target} كـ **${ownerRole.name}**!`)
                .addFields(
                    { name: 'العضو', value: `${target} (${target.user.username})`, inline: true },
                    { name: 'الرتبة', value: `${ownerRole}`, inline: true },
                    { name: 'بواسطة', value: `${message.author}`, inline: true }
                )
                .setThumbnail(target.user.displayAvatarURL())
                .setTimestamp();

            await message.reply({ embeds: [embed] });

            // رسالة خاصة ساخرة للعضو الجديد
            const dm = new EmbedBuilder()
                .setColor('#FFD700')
                .setTitle('👑 مبروك... أعتقد؟')
                .setDescription(ownerMessages[Math.floor(Math.random() * ownerMessages.length)])
                .addFields({ name: 'الصلاحيات الجديدة', value: 'Adminstartor — مع التوفيق يا سيادة الملك 😏' })
                .setFooter({ text: 'رسالة تلقائية من البوت' });

            await target.send({ embeds: [dm] }).catch(() => {
                message.channel.send(`⚠️ لم أستطع إرسال رسالة خاصة لـ ${target} (الخاص مغلق)، لكنه حصل على الرتبة.`);
            });

        } catch (error) {
            console.error('[rol-owner error]:', error);
            return message.reply(`❌ فشل إعطاء الرتبة!\n> تأكد أن رتبة البوت **أعلى** من رتبة **${ownerRole.name}** في قائمة الرول.`);
        }
    }
};
