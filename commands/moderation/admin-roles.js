const { PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const config = require('../../config');

// رسائل ساخرة للأونر
const ownerMessages = [
    "أوه، انظروا من أصبح الملك! 👑 حاول ألا تدمر السيرفر في أول 5 دقائق، حسناً؟",
    "مبروك يا صاحب الجلالة! 🙄 الآن لديك صلاحية الطرد والحظر، لا تتحمس كثيراً.",
    "تم منحك رتبة أونر. نعم، أنت الآن \"مهم\" جداً. (لا تصدق ذلك)",
    "أنت الآن الأونر. هل تتوقع تصفيقاً حاراً؟ اعطني راتباً أولاً.",
    "عظيم، أونر جديد... كما لو أننا بحاجة للمزيد من الأوامر."
];

// رسائل ساخرة للأدمن
const adminMessages = [
    "أهلاً بك في فريق الإدارة! 🎉 جهز نفسك للصداع ومشاكل الأعضاء التي لا تنتهي.",
    "مبروك رتبة الأدمن! الآن يمكنك الاستمتاع بقراءة شات العقوبات طوال اليوم.",
    "تم ترقيتك لأدمن. تذكر: القوة العظيمة تأتي مع... رغبة كبيرة في حظر الجميع.",
    "أصبحت أدمن؟ رائع. الآن اذهب ونظف الشات، إنه فوضوي.",
    "مبروك! لقد فزت بلقب \"جليس الأطفال\" الرسمي للسيرفر."
];

async function giveOwner(message, args) {
    // التحقق من أن المستخدم هو مالك البوت (config.ownerId)
    if (message.author.id !== config.ownerId) {
        return message.reply('❌ هاها، محاولة جيدة! هذا الأمر لمالك البوت فقط.');
    }

    const target = message.mentions.members.first();
    if (!target) {
        return message.reply('❌ منشن الشخص الذي تريد توريطه برتبة الأونر!');
    }

    const ownerRole = message.guild.roles.cache.find(r => r.name === '👑 Owner' || r.name.toLowerCase() === 'owner');
    if (!ownerRole) {
        return message.reply('❌ رتبة **👑 Owner** غير موجودة! تأكد من وجود رتبة بهذا الاسم بالضبط.');
    }

    try {
        await target.roles.add(ownerRole);
        message.reply(`✅ تم تعيين ${target} كـ **👑 Owner**! الله يستر.`);
    } catch (error) {
        console.error('Error adding Owner role:', error);
        return message.reply('❌ فشل إعطاء الرتبة! تأكد أن رتبة البوت أعلى من رتبة **👑 Owner**.');
    }

    // إرسال رسالة خاصة ساخرة
    const randomMsg = ownerMessages[Math.floor(Math.random() * ownerMessages.length)];
    try {
        const dmEmbed = new EmbedBuilder()
            .setColor('#FFD700')
            .setTitle('👑 مبروك... أعتقد؟')
            .setDescription(randomMsg)
            .addFields({ name: 'الصلاحيات', value: 'كل شيء تقريباً. (Administrator)' })
            .setFooter({ text: 'رسالة تلقائية من بوتك الساخر المفضل' });

        await target.send({ embeds: [dmEmbed] });
    } catch (e) {
        message.channel.send(`⚠️ لم أستطع إرسال رسالة خاصة لـ ${target} (ربما الخاص مغلق)، لكنه حصل على الرتبة.`);
    }
}

async function giveAdmin(message, args) {
    // التحقق من أن المستخدم هو مالك البوت
    if (message.author.id !== config.ownerId) {
        return message.reply('❌ من تظن نفسك؟ هذا الأمر لمالك البوت فقط.');
    }

    const target = message.mentions.members.first();
    if (!target) {
        return message.reply('❌ منشن الضحية... أقصد العضو الجديد للإدارة!');
    }

    const adminRole = message.guild.roles.cache.find(r => r.name === '👮 Admin' || r.name.toLowerCase() === 'admin');
    if (!adminRole) {
        return message.reply('❌ رتبة **👮 Admin** غير موجودة! تأكد من وجود رتبة بهذا الاسم بالضبط.');
    }

    try {
        await target.roles.add(adminRole);
        message.reply(`✅ تم تعيين ${target} كـ **👮 Admin**! جهزوا الأسبرين.`);
    } catch (error) {
        console.error('Error adding Admin role:', error);
        return message.reply('❌ فشل إعطاء الرتبة! تأكد أن رتبة البوت أعلى من رتبة **👮 Admin**.');
    }

    // إرسال رسالة خاصة ساخرة
    const randomMsg = adminMessages[Math.floor(Math.random() * adminMessages.length)];
    try {
        const dmEmbed = new EmbedBuilder()
            .setColor('#E74C3C')
            .setTitle('👮 ترقية إدارية')
            .setDescription(randomMsg)
            .addFields({ name: 'الصلاحيات', value: 'طرد، حظر، إدارة رومات، والمزيد...' })
            .setFooter({ text: 'حظاً موفقاً، ستحتاجه.' });

        await target.send({ embeds: [dmEmbed] });
    } catch (e) {
        message.channel.send(`⚠️ لم أستطع إرسال رسالة خاصة لـ ${target}، لكنه أصبح أدمن.`);
    }
}

module.exports = {
    // ─── واجهة الأمر المطلوبة من commandHandler ──────────────────
    name: 'admin-roles',
    aliases: ['رول-ادمن', 'رول-اونر'],
    description: 'إعطاء رتبة Owner أو Admin لشخص (مالك البوت فقط)',
    usage: 'admin-roles [owner/admin] @user',

    async execute(message, args) {
        const sub = args[0]?.toLowerCase();
        if (sub === 'owner' || sub === 'اونر') return giveOwner(message, args.slice(1));
        if (sub === 'admin' || sub === 'ادمن') return giveAdmin(message, args.slice(1));
        return message.reply('❌ استخدام: `admin-roles owner @user` أو `admin-roles admin @user`');
    },

    // ─── export الدوال للاستخدام المباشر ────────────────────────
    giveOwner,
    giveAdmin,
};
