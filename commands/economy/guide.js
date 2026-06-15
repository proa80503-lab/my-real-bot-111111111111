const {
    EmbedBuilder, ActionRowBuilder, ButtonBuilder,
    ButtonStyle, MessageFlags
} = require('discord.js');
const config = require('../../config');

// ─── صفحات الدليل ─────────────────────────────────────────
const GUIDE_PAGES = [
    {
        emoji: '💰',
        title: 'دليل الاقتصاد — البداية',
        color: '#FFD700',
        description: [
            '> مرحباً بك في نظام الاقتصاد! هذا الدليل يشرح كل شيء.',
            '',
            '**📌 المفاهيم الأساسية:**',
            '`محفظة` — المال الذي تحمله في جيبك، قابل للسرقة',
            '`بنك` — مال مودع في البنك، آمن نسبياً',
            '`خزنة شخصية` — مال محمي 100% لا يُسرق (تُشترى من المتجر)',
            '',
            '**📋 أهم الأوامر للبدء:**',
            `\`رصيد\` — لوحة الاقتصاد الكاملة بأزرار`,
            `\`عمل\` — اعمل واكسب (cooldown: ${Math.floor((config.workCooldown || 3600000) / 60000)} دقيقة)`,
            `\`يومي\` — مكافأة يومية مع streak (كل 24 ساعة)`,
            `\`راتب\` — مكافأة أسبوعية (كل 7 أيام)`,
            '',
            '**💡 نصيحة:** ابدأ بـ`يومي` كل يوم للحصول على مكافأة الـ Streak!'
        ].join('\n')
    },
    {
        emoji: '🏦',
        title: 'دليل الاقتصاد — البنك',
        color: '#3498DB',
        description: [
            '**🏦 نظام البنك:**',
            '',
            '`ايداع <مبلغ>` — أودع من المحفظة للبنك',
            '`سحب <مبلغ>` — اسحب من البنك للمحفظة',
            '`تحويل @user <مبلغ>` — حوّل مال لشخص آخر',
            '',
            '**الكلمات المختصرة:**',
            '`كامل` أو `all` — كل المبلغ',
            '`نصف` أو `half` — نصف المبلغ',
            '`ربع` أو `quarter` — ربع المبلغ',
            '`ثلث` أو `third` — ثلث المبلغ',
            '',
            '**مثال:**',
            '`ايداع نصف` — يودع نصف محفظتك في البنك',
            '`سحب 5000` — يسحب 5000 من البنك',
            '',
            '> **نصيحة:** أودع مالك في البنك لحمايته من السرقة!'
        ].join('\n')
    },
    {
        emoji: '🔐',
        title: 'دليل الاقتصاد — الخزنة الشخصية',
        color: '#F1C40F',
        description: [
            '**🔐 الخزنة الشخصية:**',
            '',
            '> خزنة شخصية تُشترى من المتجر (قسم VIP) بـ **8,000** عملة',
            '',
            '**كيفية الاستخدام:**',
            '1️⃣ اكتب `متجر` أو `رصيد` واضغط المتجر',
            '2️⃣ اذهب لقسم **👑 VIP**',
            '3️⃣ اشترِ **🏦 خزنة شخصية** (8000 عملة)',
            '4️⃣ بعد الشراء، سيظهر زر **🔐 خزنتي** في لوحة `رصيد`',
            '5️⃣ اضغطه وستجد أزرار **إيداع** و**سحب**',
            '',
            '**مزايا الخزنة:**',
            '✅ لا أحد يسرق منها — حتى بطقم السرقة VIP',
            '✅ سعة تصل 100,000 عملة',
            '✅ تظهر في لوحة الرصيد الرئيسية',
            '',
            '> **مهم:** الخزنة للادخار طويل المدى، ليست للاستخدام اليومي!'
        ].join('\n')
    },
    {
        emoji: '🕵️',
        title: 'دليل الاقتصاد — السرقة',
        color: '#E74C3C',
        description: [
            '**🕵️ نظام السرقة:**',
            '',
            '`سرقة @user` — محاولة سرقة شخص',
            '',
            '**احتمالات النجاح:**',
            '— عادي: **40%** نجاح',
            '— مع 🍀 جرعة الحظ: **60%** نجاح',
            '— مع 🕵️ طقم السرقة: استخدام شحنة بدلاً من cooldown',
            '',
            '**عند النجاح:** تأخذ 10-40% من محفظة الهدف',
            '**عند الفشل:** تدفع 10% من محفظتك كـ ذعيرة',
            '',
            '**الحمايات:**',
            '🛡️ **درع الحماية**: يمنع سرقتك 24 ساعة',
            '⚔️ **مناعة السرقة VIP**: حماية دائمة أبدية',
            '🔐 **الخزنة**: المال فيها آمن دائماً',
            '',
            `⏰ **Cooldown السرقة:** ${Math.floor((config.robCooldown || 86400000) / 3600000)} ساعة`
        ].join('\n')
    },
    {
        emoji: '🛒',
        title: 'دليل الاقتصاد — المتجر',
        color: '#9B59B6',
        description: [
            '**🛒 متجر السيرفر:**',
            '',
            '`متجر` — فتح المتجر بالأزرار',
            '',
            '**الأقسام:**',
            '',
            '**🎒 الأدوات:**',
            '`🛡️ درع` — حماية من السرقة 24ساعة (500)',
            '`🍀 حظ` — سرقة 60% نجاح (300)',
            '`⚡ XP` — مضاعف XP ساعتين (400)',
            '`💰 كيس مال` — +1200~1800 فوراً (1000)',
            '`🕵️ طقم سرقة` — 3 محاولات إضافية (800)',
            '`⏩ إعادة Cooldown` — يصفر العمل والسرقة (700)',
            '',
            '**⬆️ الترقيات:**',
            '`💫/🌟 XP` — حزم XP فورية (500/1500)',
            '`🎁 مضاعف اليومي` — مكافأة ×2 (1200)',
            '`🏦 توسّع البنك` — +50K حد (2000)',
            '',
            '**👑 VIP:**',
            '`👑 شارة VIP` — دائم (5000)',
            '`🔐 خزنة` — مال محمي (8000)',
            '`⚔️ مناعة السرقة` — دائم (10000)',
        ].join('\n')
    },
    {
        emoji: '⭐',
        title: 'دليل الاقتصاد — المستويات والـ Streak',
        color: '#2ECC71',
        description: [
            '**⭐ نظام المستويات:**',
            '',
            '— كل رسالة تعطيك **5 XP** (مرة كل 30 ثانية)',
            '— كل عمل ناجح يعطي **3 XP** إضافية',
            '— عند ارتفاع المستوى تحصل على **مكافأة فورية**',
            '— كل 5 مستويات: **+1000 إضافية**',
            '— كل 10 مستويات: **مكافأة كبيرة** جداً',
            '',
            '**🔥 نظام الـ Streak (يومي):**',
            '',
            '— كل يوم تأخذ `يومي` يتراكم Streak',
            '— كل يوم إضافي = **+100 عملة** bonus',
            '— الحد الأقصى: **+1000 عملة** إضافية',
            '— لو نسيت يوماً سيصفر الـ Streak (إلا مع 🔒 حماية Streak)',
            '',
            '**🏆 قائمة المتصدرين:**',
            '`رصيد` ← زر المتصدرين — أغنى 10 أشخاص بالسيرفر',
        ].join('\n')
    },
];

module.exports = {
    name: 'دليل',
    aliases: ['guide', 'help-eco', 'شرح', 'مساعدة اقتصاد', 'كيف اشتغل'],
    description: 'دليل شامل لنظام الاقتصاد',
    usage: 'دليل',

    async execute(message) {
        let page = 0;
        const userId = message.author.id;

        const buildMsg = (p) => {
            const g = GUIDE_PAGES[p];
            const embed = new EmbedBuilder()
                .setColor(g.color)
                .setTitle(`${g.emoji} ${g.title}`)
                .setDescription(g.description)
                .setFooter({ text: `صفحة ${p + 1} / ${GUIDE_PAGES.length}  •  اقتصاد السيرفر` })
                .setTimestamp();

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('guide_prev')
                    .setLabel('◀ السابق')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(p === 0),
                new ButtonBuilder()
                    .setCustomId('guide_page')
                    .setLabel(`${p + 1} / ${GUIDE_PAGES.length}`)
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(true),
                new ButtonBuilder()
                    .setCustomId('guide_next')
                    .setLabel('التالي ▶')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(p === GUIDE_PAGES.length - 1),
                new ButtonBuilder()
                    .setCustomId('guide_economy')
                    .setLabel('💼 لوحة الاقتصاد')
                    .setStyle(ButtonStyle.Success)
            );

            return { embeds: [embed], components: [row] };
        };

        const reply = await message.reply(buildMsg(0));

        const collector = reply.createMessageComponentCollector({
            filter: i => i.user.id === userId,
            time: 3 * 60 * 1000
        });

        collector.on('collect', async (i) => {
            if (i.customId === 'guide_prev') { page = Math.max(0, page - 1); }
            else if (i.customId === 'guide_next') { page = Math.min(GUIDE_PAGES.length - 1, page + 1); }
            else if (i.customId === 'guide_economy') {
                const ecoHub = require('./economy-hub');
                const panel = await ecoHub.buildMainPanel(userId, i.client);
                return i.update({ ...panel });
            }
            await i.update(buildMsg(page));
        });

        collector.on('end', () => {
            reply.edit({ components: [] }).catch(() => { });
        });
    }
};
