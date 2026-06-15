const { EmbedBuilder } = require('discord.js');
const db = require('../../utils/database');
const config = require('../../config');
const levels = require('../../utils/levels');

const JOBS = [
    { name: 'مبرمج', emoji: '💻', min: 250, max: 550, desc: 'كتبت كوداً احترافياً وأنجزت مشروعاً ضخماً' },
    { name: 'طبيب', emoji: '⚕️', min: 350, max: 650, desc: 'أجريت عملية ناجحة وأنقذت حياة مريض' },
    { name: 'مهندس', emoji: '🔧', min: 280, max: 580, desc: 'صممت مبنى ضخماً وأشرفت على بنائه' },
    { name: 'معلم', emoji: '📚', min: 180, max: 420, desc: 'أعطيت درساً مميزاً وأثّرت في طلابك' },
    { name: 'طاهي', emoji: '👨‍🍳', min: 200, max: 480, desc: 'طبخت وجبة فاخرة نالت استحسان الجميع' },
    { name: 'سائق', emoji: '🚗', min: 150, max: 380, desc: 'أوصلت عملاءك بأمان في وقت قياسي' },
    { name: 'تاجر', emoji: '🏪', min: 300, max: 620, desc: 'أتممت صفقة تجارية مربحة بمهارة' },
    { name: 'مصمم', emoji: '🎨', min: 220, max: 500, desc: 'صممت شعاراً احترافياً أعجب العميل كثيراً' },
    { name: 'رياضي', emoji: '⚽', min: 200, max: 450, desc: 'سجّلت هدفاً رائعاً وفزت بالمباراة' },
    { name: 'صياد', emoji: '🎣', min: 150, max: 400, desc: 'اصطدت سمكة ضخمة وبعتها بسعر مرتفع' },
    { name: 'نجار', emoji: '🪚', min: 200, max: 460, desc: 'صنعت أثاثاً خشبياً فاخراً بيد بارعة' },
    { name: 'حارس أمن', emoji: '🛡️', min: 160, max: 360, desc: 'أمّنت الحدث بكفاءة عالية دون أي مشكلة' },
    { name: 'كاتب', emoji: '✍️', min: 190, max: 430, desc: 'كتبت مقالاً رائعاً نشر على أكبر المواقع' },
    { name: 'مسوّق', emoji: '📊', min: 240, max: 520, desc: 'أطلقت حملة تسويقية ناجحة لمنتج جديد' },
];

module.exports = {
    name: 'work',
    aliases: ['عمل', 'شتغل', 'اشتغل'],
    description: 'القيام بعمل لكسب المال',
    usage: 'عمل',

    async execute(message) {
        try {
            const userData = db.getUserData(message.author.id);
            const now = Date.now();
            const cooldown = config.workCooldown || 3600000; // ساعة

            if (userData.lastWork && (now - userData.lastWork) < cooldown) {
                const timeLeft = cooldown - (now - userData.lastWork);
                const minutes = Math.floor(timeLeft / 60000);
                const seconds = Math.floor((timeLeft % 60000) / 1000);
                return message.reply(`⏰ يمكنك العمل مرة أخرى بعد **${minutes} دقيقة و${seconds} ثانية**!`);
            }

            const job = JOBS[Math.floor(Math.random() * JOBS.length)];
            let earned = Math.floor(Math.random() * (job.max - job.min + 1)) + job.min;

            // تأثير مشتريات المتجر على الأرباح
            const inv = userData.inventory || {};
            if (inv.laptop && inv.laptop.expiresAt > now) {
                earned = Math.floor(earned * 1.5); // +50%
            } else if (inv.pickaxe && inv.pickaxe.expiresAt > now) {
                earned = Math.floor(earned * 1.2); // +20%
            }

            // تأثير daily_boost (مضاعف اليومي) على العمل أيضاً
            if (userData.dailyBoostUntil && now < userData.dailyBoostUntil) {
                earned = Math.floor(earned * 1.25); // +25% مع البوست
            }

            db.updateFields(message.author.id, {
                balance: (userData.balance || 0) + earned,
                lastWork: now
            });

            db.addTransaction(message.author.id, 'work', earned, `Work as ${job.name}`);
            levels.addXP(message.author.id, 3, message);

            // تجميع نص البوست إذا وجد
            let boostNote = '';
            if (inv.laptop?.expiresAt > now) boostNote = '\n💻 *بوست اللابتوب مفعّل (+50%)*';
            else if (inv.pickaxe?.expiresAt > now) boostNote = '\n⛏️ *بوست المعول مفعّل (+20%)*';
            if (userData.dailyBoostUntil > now) boostNote += '\n🎁 *مضاعف اليومي مفعّل (+25%)*';

            const embed = new EmbedBuilder()
                .setColor('#00CED1')
                .setTitle(`${job.emoji} عمل كـ ${job.name}!`)
                .setDescription(`${job.desc}\n\nكسبت **${earned.toLocaleString()} ${config.currency}**!${boostNote}`)
                .addFields({ name: '💰 رصيدك الحالي', value: `${((userData.balance || 0) + earned).toLocaleString()} ${config.currency}` })
                .setTimestamp();

            message.reply({ embeds: [embed] });
        } catch (error) {
            console.error('[work error]:', error);
            message.reply('❌ حدث خطأ في أمر العمل.').catch(() => { });
        }
    }
};
