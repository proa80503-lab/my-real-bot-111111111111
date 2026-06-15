'use strict';

/**
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║   🏆 NEXUS SERVER SETUP v4.0 — نظام بناء السيرفر الكامل 2060     ║
 * ║   يُفعَّل بكتابة: تفعيل | اعادة تفعيل | setup | reset-server    ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 */

const {
    EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle,
    ChannelType, PermissionFlagsBits
} = require('discord.js');
const config = require('../../config');
const db = require('../../utils/database');

// ─── الألوان ──────────────────────────────────────────────────────────────────
const C = {
    gold:   '#FFD700',
    cyan:   '#00FFFF',
    purple: '#9B59B6',
    green:  '#2ECC71',
    red:    '#E74C3C',
    blue:   '#3498DB',
    orange: '#FF8C00',
    pink:   '#FF69B4',
    dark:   '#2C3E50',
    neon:   '#39FF14',
    teal:   '#1ABC9C',
    indigo: '#6610F2',
};

// ─── القوانين ─────────────────────────────────────────────────────────────────
const SERVER_RULES = [
    { num: '١', icon: '🚫', rule: 'ممنوع السب والشتم والتنمر بأي شكل أو بأي لغة كانت' },
    { num: '٢', icon: '🎵', rule: 'ممنوع إرسال روابط الأغاني أو الترفيه في قنوات غير مخصصة لها' },
    { num: '٣', icon: '👑', rule: 'ممنوع الاستغلال بالسلطة أو التعسف في استخدام الصلاحيات الإدارية' },
    { num: '٤', icon: '🕌', rule: 'ممنوع الطائفية والتعصب الديني أو القبلي — نحن هنا للعب معاً' },
    { num: '٥', icon: '🛡️', rule: 'ممنوع انتقاد القائد (أونر السيرفر) علناً — إذا كان لديك ملاحظة تواصل خاص' },
    { num: '٦', icon: '☮️', rule: 'دعوا الطائفية جانباً — عيشوا بسلام وتعاون من أجل المتعة والألعاب' },
    { num: '٧', icon: '📵', rule: 'ممنوع الإعلانات والدعاية لأي سيرفر أو منتج أو خدمة دون إذن الإدارة' },
    { num: '٨', icon: '🔞', rule: 'ممنوع نشر أي محتوى مسيء أو غير لائق أو للكبار فقط' },
    { num: '٩', icon: '🤝', rule: 'احترام جميع الأعضاء واجب — التمييز العنصري ممنوع منعاً باتاً' },
];

// ─── بنية السيرفر الكاملة ─────────────────────────────────────────────────────
function buildServerStructure(guild) {
    return {
        categories: [
            // ══════════════════════════════════
            {
                name: '📌 المعلومات والإعلانات',
                emoji: '📌',
                locked: true,       // الفئة كلها للقراءة فقط
                channels: [
                    {
                        name: '📜┃القوانين',
                        type: ChannelType.GuildText,
                        topic: '⚖️ قوانين السيرفر — يرجى القراءة والالتزام',
                        readOnly: true,
                        botPost: 'rules',   // البوت ينشر هنا
                    },
                    {
                        name: '📢┃الإعلانات',
                        type: ChannelType.GuildText,
                        topic: '📢 الإعلانات الرسمية من الإدارة',
                        readOnly: true,
                    },
                    {
                        name: '👋┃الترحيب',
                        type: ChannelType.GuildText,
                        topic: '🌟 مرحباً بالأعضاء الجدد — رحلتك تبدأ هنا!',
                        readOnly: true,
                    },
                    {
                        name: '🤖┃أوامر-البوت',
                        type: ChannelType.GuildText,
                        topic: '⚙️ اكتب أوامر البوت هنا | شرح كامل: اكتب شرح',
                        readOnly: false,
                        dbKey: 'botChannel',
                        botPost: 'botGuide',
                    },
                ]
            },
            // ══════════════════════════════════
            {
                name: '💬 الدردشة العامة',
                emoji: '💬',
                channels: [
                    {
                        name: '💬┃الدردشة-العامة',
                        type: ChannelType.GuildText,
                        topic: '🗣️ تكلم عن أي شيء — الدردشة العامة للجميع',
                    },
                    {
                        name: '🖼️┃الصور-والميمز',
                        type: ChannelType.GuildText,
                        topic: '🎭 شارك أجمل الصور والميمز المضحكة',
                    },
                    {
                        name: '📲┃السوشيال-ميديا',
                        type: ChannelType.GuildText,
                        topic: '📱 شارك محتوى السوشيال ميديا — يوتيوب، تيك توك، انستا',
                    },
                    {
                        name: '🤖┃البوت-الذكي',
                        type: ChannelType.GuildText,
                        topic: '🧠 تكلم مع الذكاء الاصطناعي — امنشن البوت أو اكتب رسالة',
                        dbKey: 'aiChannel',
                    },
                ]
            },
            // ══════════════════════════════════
            {
                name: '💰 البنك والاقتصاد',
                emoji: '💰',
                channels: [
                    {
                        name: '💰┃البنك',
                        type: ChannelType.GuildText,
                        topic: '🏦 عمليات البنك — رصيد، يومي، عمل، تحويل',
                        dbKey: 'bankChannel',
                    },
                    {
                        name: '🛒┃المتجر',
                        type: ChannelType.GuildText,
                        topic: '🛍️ اكتب: متجر | أيتمز نادرة وعروض يومية',
                    },
                    {
                        name: '📈┃الأسهم-والاستثمار',
                        type: ChannelType.GuildText,
                        topic: '💹 اكتب: استثمار | ضاعف ثروتك',
                    },
                    {
                        name: '🏆┃لوحة-الصدارة',
                        type: ChannelType.GuildText,
                        topic: '👑 أثرى أعضاء السيرفر — اكتب: صدارة',
                        dbKey: 'leaderboardChannel',
                        botPost: 'leaderboard',
                    },
                ]
            },
            // ══════════════════════════════════
            {
                name: '🎮 ألعاب البوت',
                emoji: '🎮',
                channels: [
                    {
                        name: '🎮┃الألعاب-المصغرة',
                        type: ChannelType.GuildText,
                        topic: '🎲 العب XO، RPS، تريفيا — اكتب: العاب',
                        dbKey: 'gamesChannel',
                    },
                    {
                        name: '🎯┃التريفيا',
                        type: ChannelType.GuildText,
                        topic: '🧠 اختبر معلوماتك — اكتب: تريفيا',
                    },
                    {
                        name: '🎰┃الكازينو',
                        type: ChannelType.GuildText,
                        topic: '🎲 بلاك جاك، روليت، سلوت — اكتب: كازينو',
                    },
                    {
                        name: '🏆┃الإنجازات',
                        type: ChannelType.GuildText,
                        topic: '⭐ مستوياتك وإنجازاتك — اكتب: بروفايل',
                    },
                ]
            },
            // ══════════════════════════════════
            {
                name: '🕹️ غرف الألعاب الشهيرة',
                emoji: '🕹️',
                channels: [
                    {
                        name: '👾┃عام-الألعاب',
                        type: ChannelType.GuildText,
                        topic: '🎮 دردشة الألعاب العامة — شارك كليباتك ونتائجك',
                    },
                    {
                        name: '🔴┃أموك-اص-Among-Us',
                        type: ChannelType.GuildText,
                        topic: '👀 من هو الغاشّ؟ | كتابة: غرفة جديدة [اسم] امونق اص',
                        game: 'AmongUs',
                    },
                    {
                        name: '🟡┃ببجي-PUBG',
                        type: ChannelType.GuildText,
                        topic: '🔫 غرف PUBG | كتابة: غرفة جديدة [اسم] ببجي',
                        game: 'PUBG',
                    },
                    {
                        name: '🟢┃كول-اوف-ديوتي-COD',
                        type: ChannelType.GuildText,
                        topic: '💥 غرف COD Warzone | كتابة: غرفة جديدة [اسم] كول اوف ديوتي',
                        game: 'COD',
                    },
                    {
                        name: '🔵┃فورتنايت',
                        type: ChannelType.GuildText,
                        topic: '🏗️ غرف Fortnite | كتابة: غرفة جديدة [اسم] فورتنايت',
                        game: 'Fortnite',
                    },
                    {
                        name: '🟣┃فالورانت',
                        type: ChannelType.GuildText,
                        topic: '🎯 غرف Valorant | كتابة: غرفة جديدة [اسم] فالورانت',
                        game: 'Valorant',
                    },
                    {
                        name: '⚫┃ماين-كرافت',
                        type: ChannelType.GuildText,
                        topic: '⛏️ غرف Minecraft | كتابة: غرفة جديدة [اسم] ماين كرافت',
                        game: 'Minecraft',
                    },
                    {
                        name: '🌟┃موبايل-ليجند',
                        type: ChannelType.GuildText,
                        topic: '⚔️ غرف Mobile Legends | كتابة: غرفة جديدة [اسم] موبايل ليجند',
                        game: 'MobileLegends',
                    },
                    {
                        name: '📣┃الإعلان-عن-غرف',
                        type: ChannelType.GuildText,
                        topic: '📣 أعلن عن غرفتك هنا — لأي لعبة كانت',
                    },
                ]
            },
            // ══════════════════════════════════
            {
                name: '🎨 الألوان والزينة',
                emoji: '🎨',
                channels: [
                    {
                        name: '🎨┃اختيار-الألوان',
                        type: ChannelType.GuildText,
                        topic: '🌈 اختر لون بروفايلك — اضغط على الأزرار!',
                        readOnly: true,
                        dbKey: 'colorsChannel',
                        botPost: 'colors',
                    },
                ]
            },
            // ══════════════════════════════════
            {
                name: '🏠 الغرف المخصصة',
                emoji: '🏠',
                channels: [
                    {
                        name: '📖┃شرح-نظام-الغرف',
                        type: ChannelType.GuildText,
                        topic: '💡 كيف تنشئ غرفتك الخاصة؟',
                        readOnly: true,
                        dbKey: 'roomsChannel',
                        botPost: 'roomsGuide',
                    },
                ]
            },
            // ══════════════════════════════════
            {
                name: '⚖️ العقوبات والتقارير',
                emoji: '⚖️',
                privateAdmin: true,
                channels: [
                    {
                        name: '⚖️┃العقوبات',
                        type: ChannelType.GuildText,
                        topic: '📋 سجل العقوبات التلقائية',
                        privateAdmin: true,
                        dbKey: 'punishmentsChannel',
                    },
                    {
                        name: '🚨┃التقارير',
                        type: ChannelType.GuildText,
                        topic: '📝 تقارير الأعضاء — الإدارة ستتابع فوراً',
                        privateAdmin: true,
                    },
                    {
                        name: '🛡️┃الحماية',
                        type: ChannelType.GuildText,
                        topic: '🔒 سجل أحداث الأمان — Anti-Nuke, Anti-Spam',
                        privateAdmin: true,
                        dbKey: 'logChannel',
                    },
                ]
            },
            // ══════════════════════════════════
            {
                name: '🔒 السجن',
                emoji: '🔒',
                isJail: true,
                channels: [
                    {
                        name: '🔒┃السجن',
                        type: ChannelType.GuildText,
                        topic: '⛓️ أنت هنا لأنك خالفت القوانين',
                        dbKey: 'jailChannel',
                    },
                ]
            },
            // ══════════════════════════════════
            {
                name: '👑 الإدارة',
                emoji: '👑',
                privateAdmin: true,
                channels: [
                    {
                        name: '👑┃لوحة-الأونر',
                        type: ChannelType.GuildText,
                        topic: '🔐 حصري للأونر — لوحة التحكم الكاملة',
                        privateAdmin: true,
                    },
                    {
                        name: '⚙️┃الإدارة-العامة',
                        type: ChannelType.GuildText,
                        topic: '🛠️ قناة الإدارة — نقاشات داخلية',
                        privateAdmin: true,
                    },
                    {
                        name: '📝┃السجلات-الكاملة',
                        type: ChannelType.GuildText,
                        topic: '📊 سجلات النظام التفصيلية',
                        privateAdmin: true,
                    },
                ]
            },
            // ══════════════════════════════════
            {
                name: '🔊 القنوات الصوتية',
                emoji: '🔊',
                voice: true,
                channels: [
                    { name: '🔊┃صوتي-عام-1',    type: ChannelType.GuildVoice },
                    { name: '🔊┃صوتي-عام-2',    type: ChannelType.GuildVoice },
                    { name: '👾┃Among-Us-🔴',   type: ChannelType.GuildVoice },
                    { name: '🔫┃PUBG-🟡',        type: ChannelType.GuildVoice },
                    { name: '💥┃COD-🟢',         type: ChannelType.GuildVoice },
                    { name: '🏗️┃Fortnite-🔵',   type: ChannelType.GuildVoice },
                    { name: '🎯┃Valorant-🟣',    type: ChannelType.GuildVoice },
                    { name: '🌟┃Mobile-Legends', type: ChannelType.GuildVoice },
                    { name: '🎵┃الموسيقى',       type: ChannelType.GuildVoice },
                    { name: '🔕┃AFK-غائب',       type: ChannelType.GuildVoice },
                ]
            },
        ]
    };
}

// ─── نشر القوانين ─────────────────────────────────────────────────────────────
async function postRules(guild, rulesChannel) {
    try {
        // حذف الرسائل القديمة
        const old = await rulesChannel.messages.fetch({ limit: 20 }).catch(() => null);
        if (old && old.size > 0) {
            await rulesChannel.bulkDelete(old).catch(() => {});
        }

        // Embed القوانين الرئيسي
        const rulesEmbed = new EmbedBuilder()
            .setColor(C.gold)
            .setTitle('⚖️ قوانين السيرفر الرسمية')
            .setDescription([
                '```ansi',
                '\u001b[1;33m══════════════════════════════════════════\u001b[0m',
                '\u001b[1;33m      قوانين يجب الالتزام بها للجميع      \u001b[0m',
                '\u001b[1;33m══════════════════════════════════════════\u001b[0m',
                '```',
                '',
                '> 📌 **قراءة القوانين والالتزام بها إلزامية لجميع الأعضاء**',
                '> ⚠️ **المخالفة تؤدي إلى عقوبات تلقائية فورية**',
            ].join('\n'))
            .setThumbnail(guild.iconURL({ size: 256 }) || null)
            .setTimestamp()
            .setFooter({ text: `${guild.name} • نظام القوانين الرسمي`, iconURL: guild.iconURL() || undefined });

        SERVER_RULES.forEach(r => {
            rulesEmbed.addFields({
                name: `${r.icon} القانون ${r.num}`,
                value: `> ${r.rule}`,
                inline: false,
            });
        });

        // Embed الإقرار
        const acceptEmbed = new EmbedBuilder()
            .setColor(C.green)
            .setTitle('✅ إقرار القبول والالتزام')
            .setDescription([
                '**بمجرد انضمامك للسيرفر فأنت توافق تلقائياً على:**',
                '',
                '• 📖 قراءة جميع القوانين المذكورة أعلاه',
                '• ✅ الالتزام التام بها في جميع الأوقات',
                '• ⚖️ قبول أي عقوبة تترتب على المخالفة',
                '• 🤝 المساهمة في بيئة إيجابية ومحترمة',
                '',
                '```',
                'نتمنى لك وقتاً ممتعاً في سيرفرنا! 🎮✨',
                '```',
            ].join('\n'))
            .setTimestamp();

        await rulesChannel.send({ embeds: [rulesEmbed] });
        await rulesChannel.send({ embeds: [acceptEmbed] });
        console.log('[ServerSetup] ✅ تم نشر القوانين');
        return true;
    } catch (err) {
        console.error('[ServerSetup] خطأ في نشر القوانين:', err.message);
        return false;
    }
}

// ─── نشر شرح نظام الغرف ─────────────────────────────────────────────────────
async function postRoomsGuide(guild, roomsChannel) {
    try {
        const old = await roomsChannel.messages.fetch({ limit: 10 }).catch(() => null);
        if (old && old.size > 0) await roomsChannel.bulkDelete(old).catch(() => {});

        const embed = new EmbedBuilder()
            .setColor(C.purple)
            .setTitle('🏠 نظام الغرف المخصصة — دليل كامل')
            .setDescription([
                '```ansi',
                '\u001b[1;35m═══════════════════════════════════════\u001b[0m',
                '\u001b[1;35m     أنشئ غرفتك الخاصة الآن! 🏠      \u001b[0m',
                '\u001b[1;35m═══════════════════════════════════════\u001b[0m',
                '```',
            ].join('\n'))
            .addFields(
                {
                    name: '🎮 الألعاب المدعومة',
                    value: [
                        '> **👾 امونق اص** (Among Us)',
                        '> **🔫 ببجي** (PUBG)',
                        '> **💥 كول اوف ديوتي** (COD)',
                        '> **🏗️ فورتنايت** (Fortnite)',
                        '> **🎯 فالورانت** (Valorant)',
                        '> **⛏️ ماين كرافت** (Minecraft)',
                        '> **🌟 موبايل ليجند** (Mobile Legends)',
                    ].join('\n'),
                    inline: false,
                },
                {
                    name: '🏠 إنشاء غرفة خاصة',
                    value: [
                        '```',
                        'الأمر: غرفة جديدة [اسم الغرفة] [اللعبة]',
                        'مثال: غرفة جديدة غرفة الصقور ببجي',
                        'مثال: غرفة جديدة عشيرة النور موبايل ليجند',
                        '```',
                        '💰 **التكلفة:** **2,500** عملة من البنك',
                        '⏰ **المدة:** 7 أيام (قابلة للتجديد)',
                        '👑 **الصلاحيات:** تحكم كامل بالغرفة',
                    ].join('\n'),
                    inline: false,
                },
                {
                    name: '⚙️ صلاحيات صاحب الغرفة',
                    value: [
                        '✅ تغيير اسم الغرفة',
                        '✅ طرد الأعضاء من الصوتي',
                        '✅ كتم الأعضاء',
                        '✅ قفل/فتح الغرفة',
                        '✅ تجديد الغرفة (+1000 عملة)',
                        '✅ حذف الغرفة في أي وقت',
                    ].join('\n'),
                    inline: true,
                },
                {
                    name: '⚠️ قواعد الغرف',
                    value: [
                        '❌ تطبق قوانين السيرفر كاملاً',
                        '❌ ممنوع إيذاء الأعضاء',
                        '❌ ممنوع الإعلانات التجارية',
                        '❌ الغرف غير النشطة 48 ساعة تُحذف',
                        '❌ غرفة واحدة فقط لكل شخص',
                    ].join('\n'),
                    inline: true,
                },
                {
                    name: '📋 أوامر الغرف',
                    value: [
                        '`غرفة جديدة [اسم] [لعبة]` — إنشاء غرفة',
                        '`غرف` — عرض جميع الغرف النشطة',
                        '`غرفتي` — إدارة غرفتك بأزرار',
                        '`تجديد غرفة` — تجديد 7 أيام (1000 💰)',
                        '`حذف غرفة` — حذف غرفتك',
                    ].join('\n'),
                    inline: false,
                }
            )
            .setFooter({ text: '💡 الغرف تُحذف تلقائياً بعد انتهاء المدة أو عدم النشاط' })
            .setTimestamp();

        // أزرار إنشاء غرفة سريع
        const row1 = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('quickroom_pubg').setLabel('🔫 ببجي').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('quickroom_cod').setLabel('💥 COD').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('quickroom_valorant').setLabel('🎯 فالورانت').setStyle(ButtonStyle.Danger),
            new ButtonBuilder().setCustomId('quickroom_ml').setLabel('🌟 موبايل ليجند').setStyle(ButtonStyle.Secondary),
        );
        const row2 = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('quickroom_fortnite').setLabel('🏗️ فورتنايت').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('quickroom_among').setLabel('👾 أموك اص').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('quickroom_minecraft').setLabel('⛏️ ماين كرافت').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('quickroom_custom').setLabel('🏠 غرفة خاصة').setStyle(ButtonStyle.Danger),
        );

        await roomsChannel.send({ embeds: [embed], components: [row1, row2] });
        console.log('[ServerSetup] ✅ تم نشر دليل الغرف');
    } catch (err) {
        console.error('[ServerSetup] خطأ في نشر شرح الغرف:', err.message);
    }
}

// ─── نشر شرح الألوان ────────────────────────────────────────────────────────
async function postColorsGuide(guild, colorsChannel) {
    try {
        const old = await colorsChannel.messages.fetch({ limit: 10 }).catch(() => null);
        if (old && old.size > 0) await colorsChannel.bulkDelete(old).catch(() => {});

        const embed = new EmbedBuilder()
            .setColor(C.pink)
            .setTitle('🎨 اختر لون بروفايلك')
            .setDescription([
                '> **اضغط على الزر أدناه لتغيير لون اسمك في السيرفر!**',
                '> 💎 **الألوان المميزة** تحتاج شارة VIP من المتجر',
                '',
                '```diff',
                '+ الألوان المجانية المتاحة:',
                '```',
            ].join('\n'))
            .addFields(
                { name: '🔴 أحمر ناري',     value: '`لون أحمر`',     inline: true },
                { name: '🔵 أزرق سماوي',   value: '`لون أزرق`',     inline: true },
                { name: '🟢 أخضر زمردي',   value: '`لون أخضر`',     inline: true },
                { name: '🟡 ذهبي فاخر',     value: '`لون ذهبي`',     inline: true },
                { name: '🟣 بنفسجي ملكي',  value: '`لون بنفسجي`',   inline: true },
                { name: '🌸 وردي جميل',     value: '`لون وردي`',     inline: true },
                { name: '🟠 برتقالي',       value: '`لون برتقالي`',  inline: true },
                { name: '💠 سماوي فاتح',    value: '`لون سماوي`',    inline: true },
                { name: '⚫ أسود أنيق',     value: '`لون أسود`',     inline: true },
                { name: '⚪ أبيض ناصع',     value: '`لون أبيض`',     inline: true },
                {
                    name: '💎 ألوان VIP حصرية',
                    value: [
                        '🌈 **رادجيانت** `لون رادجيانت` — 5000 💰',
                        '🌟 **نيون** `لون نيون` — 3000 💰',
                        '🔥 **ناري** `لون ناري` — 4000 💰',
                        '⚡ **كهربائي** `لون كهربائي` — 3500 💰',
                    ].join('\n'),
                    inline: false,
                }
            )
            .setFooter({ text: '🎨 غير لونك وتميز بين الأعضاء!' })
            .setTimestamp();

        const row1 = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('color_btn_أحمر').setLabel('🔴 أحمر').setStyle(ButtonStyle.Danger),
            new ButtonBuilder().setCustomId('color_btn_أزرق').setLabel('🔵 أزرق').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('color_btn_أخضر').setLabel('🟢 أخضر').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('color_btn_ذهبي').setLabel('🟡 ذهبي').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('color_btn_بنفسجي').setLabel('🟣 بنفسجي').setStyle(ButtonStyle.Secondary),
        );
        const row2 = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('color_btn_وردي').setLabel('🌸 وردي').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('color_btn_برتقالي').setLabel('🟠 برتقالي').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('color_btn_سماوي').setLabel('💠 سماوي').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('color_btn_أسود').setLabel('⚫ أسود').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('color_btn_أبيض').setLabel('⚪ أبيض').setStyle(ButtonStyle.Secondary),
        );

        await colorsChannel.send({ embeds: [embed], components: [row1, row2] });
        console.log('[ServerSetup] ✅ تم نشر دليل الألوان');
    } catch (err) {
        console.error('[ServerSetup] خطأ في نشر الألوان:', err.message);
    }
}

// ─── نشر دليل البوت ─────────────────────────────────────────────────────────
async function postBotGuide(guild, botChannel) {
    try {
        const old = await botChannel.messages.fetch({ limit: 10 }).catch(() => null);
        if (old && old.size > 0) await botChannel.bulkDelete(old).catch(() => {});

        const embed = new EmbedBuilder()
            .setColor(C.cyan)
            .setTitle('🤖 دليل البوت الكامل — نظام 2060')
            .setDescription([
                '```ansi',
                '\u001b[1;36m══════════════════════════════════════════════\u001b[0m',
                '\u001b[1;36m   مرحباً بك في أذكى بوت ديسكورد! 🧠🚀    \u001b[0m',
                '\u001b[1;36m══════════════════════════════════════════════\u001b[0m',
                '```',
                '> **البوت يعمل بدون برفكس — اكتب الأمر مباشرةً!**',
            ].join('\n'))
            .addFields(
                {
                    name: '💰 الاقتصاد',
                    value: [
                        '`رصيد` — رصيدك الكامل',
                        '`يومي` — مكافأة يومية',
                        '`عمل` — اكسب عملات',
                        '`متجر` — تسوق',
                        '`استثمار` — استثمر',
                        '`بنك` — عمليات البنك',
                    ].join('\n'),
                    inline: true,
                },
                {
                    name: '🎮 الألعاب',
                    value: [
                        '`العاب` — قائمة الألعاب',
                        '`xo @شخص` — XO',
                        '`رحجة @شخص` — حجرة ورقة',
                        '`تريفيا` — اختبر معلوماتك',
                        '`كازينو` — كازينو',
                        '`سباق` — سباق الألعاب',
                    ].join('\n'),
                    inline: true,
                },
                {
                    name: '📊 البروفايل',
                    value: [
                        '`بروفايل` — بروفايلك',
                        '`مستوى` — مستواك وXP',
                        '`إنجازات` — إنجازاتك',
                        '`تحديات` — التحديات اليومية',
                        '`سمعة @شخص` — السمعة',
                        '`rep @شخص` — امنح سمعة',
                    ].join('\n'),
                    inline: true,
                },
                {
                    name: '🏠 الغرف',
                    value: [
                        '`غرفة جديدة [اسم] [لعبة]`',
                        '`غرف` — كل الغرف',
                        '`غرفتي` — إدارة غرفتك',
                        '`تجديد غرفة` — تجديد',
                        '`حذف غرفة` — حذف',
                    ].join('\n'),
                    inline: true,
                },
                {
                    name: '🎨 التخصيص',
                    value: [
                        '`ألوان` — ألوان البروفايل',
                        '`لون [اسم]` — غير لونك',
                        '`بول [سؤال]` — استطلاع',
                        '`كلان` — إدارة الكلان',
                    ].join('\n'),
                    inline: true,
                },
                {
                    name: '🛡️ الإدارة',
                    value: [
                        '`مساعدة` — قائمة الأوامر',
                        '`تقرير @شخص` — بلّغ',
                        '`عقوبات` — عقوباتك',
                        '`بان @شخص` — حظر',
                        '`ميوت @شخص` — كتم',
                    ].join('\n'),
                    inline: true,
                },
                {
                    name: '🧠 الذكاء الاصطناعي',
                    value: [
                        '> 💬 **تكلم مع البوت في قناة البوت-الذكي**',
                        '> 🤖 يتذكر محادثاتك السابقة',
                        '> 📚 يتعلم من الأعضاء باستمرار',
                        '> 🌟 يتكيف مع أسلوبك الشخصي',
                    ].join('\n'),
                    inline: false,
                }
            )
            .setFooter({ text: '🚀 نظام البوت 2060 — الجيل القادم من الذكاء الاصطناعي' })
            .setTimestamp();

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('bot_guide_economy').setLabel('💰 الاقتصاد').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('bot_guide_games').setLabel('🎮 الألعاب').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('bot_guide_rooms').setLabel('🏠 الغرف').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('bot_guide_ai').setLabel('🧠 الذكاء').setStyle(ButtonStyle.Danger),
        );

        await botChannel.send({ embeds: [embed], components: [row] });
        console.log('[ServerSetup] ✅ تم نشر دليل البوت');
    } catch (err) {
        console.error('[ServerSetup] خطأ في نشر دليل البوت:', err.message);
    }
}

// ─── Embed شريط التقدم ────────────────────────────────────────────────────────
function buildProgressEmbed(status, percent, isReset) {
    const filled = Math.floor(percent / 5);
    const empty = 20 - filled;
    const bar = '█'.repeat(filled) + '░'.repeat(empty);

    return new EmbedBuilder()
        .setColor(percent === 100 ? C.green : C.cyan)
        .setTitle(isReset ? '♻️ إعادة تفعيل السيرفر' : '🚀 تفعيل السيرفر')
        .setDescription([
            '```ansi',
            '\u001b[1;36m[' + bar + ']\u001b[0m',
            `\u001b[1;33m${percent}%\u001b[0m`,
            '```',
            `> **${status}**`,
        ].join('\n'))
        .setTimestamp();
}

// ─── Embed النتيجة النهائية ────────────────────────────────────────────────────
function buildSuccessEmbed(guild, results, isReset) {
    return new EmbedBuilder()
        .setColor(C.gold)
        .setTitle(isReset ? '✅ تمت إعادة التفعيل بنجاح!' : '🚀 تم التفعيل بنجاح!')
        .setDescription([
            '```ansi',
            '\u001b[1;32m══════════════════════════════════════\u001b[0m',
            '\u001b[1;32m  السيرفر جاهز ومُهيأ بالكامل! 🎮   \u001b[0m',
            '\u001b[1;32m══════════════════════════════════════\u001b[0m',
            '```',
            `> 🏠 **السيرفر:** ${guild.name}`,
            `> 📅 **التاريخ:** <t:${Math.floor(Date.now() / 1000)}:f>`,
        ].join('\n'))
        .addFields(
            { name: '📁 الفئات',  value: `**${results.categories}** فئة`,  inline: true },
            { name: '📣 القنوات', value: `**${results.channels}** قناة`,   inline: true },
            { name: '❌ الأخطاء', value: `**${results.errors}** خطأ`,      inline: true },
            {
                name: '📋 ما تم تنفيذه',
                value: [
                    '✅ قنوات المعلومات والإعلانات',
                    '✅ قنوات الدردشة العامة',
                    '✅ قنوات البنك والاقتصاد',
                    '✅ قنوات ألعاب البوت',
                    '✅ غرف 8 ألعاب شهيرة + Mobile Legends',
                    '✅ نظام الألوان التفاعلي بأزرار',
                    '✅ نظام الغرف المخصصة بأزرار',
                    '✅ قنوات الإدارة السرية',
                    '✅ 10 قنوات صوتية',
                    '✅ نشر القوانين تلقائياً ✨',
                    '✅ نشر جميع الأدلة تلقائياً ✨',
                ].join('\n'),
                inline: false,
            }
        )
        .setThumbnail(guild.iconURL({ size: 256 }) || null)
        .setTimestamp()
        .setFooter({ text: '🤖 نظام البوت 2060 — خدمة متكاملة' });
}

// ─── دالة البناء الرئيسية ────────────────────────────────────────────────────
async function buildServer(guild, progressMsg, isReset = false) {
    const structure = buildServerStructure(guild);
    const guildData = db.getGuildData(guild.id);
    const results = { categories: 0, channels: 0, errors: 0 };

    // خريطة لحفظ مراجع القنوات المنشأة
    const channelRefs = {};

    // ─── الخطوة 1: حذف البنية القديمة ─────────────────────────────────────
    await progressMsg.edit({ embeds: [buildProgressEmbed('🗑️ حذف الهيكل القديم...', 5, isReset)] }).catch(() => {});

    if (isReset) {
        const currentChannel = progressMsg.channel;
        const allChannels = guild.channels.cache;

        // حذف قنوات نصية
        for (const [, ch] of allChannels.filter(c => c.type === ChannelType.GuildText && c.id !== currentChannel.id)) {
            await ch.delete('♻️ إعادة تفعيل').catch(() => {});
            await _sleep(300);
        }
        // حذف قنوات صوتية
        for (const [, ch] of allChannels.filter(c => c.type === ChannelType.GuildVoice)) {
            await ch.delete('♻️ إعادة تفعيل').catch(() => {});
            await _sleep(300);
        }
        // حذف الفئات
        for (const [, cat] of allChannels.filter(c => c.type === ChannelType.GuildCategory)) {
            await cat.delete('♻️ إعادة تفعيل').catch(() => {});
            await _sleep(300);
        }
    }

    await progressMsg.edit({ embeds: [buildProgressEmbed('🏗️ إنشاء الرتب الأساسية...', 12, isReset)] }).catch(() => {});

    // ─── الخطوة 2: إنشاء الرتب ─────────────────────────────────────────────
    let adminRole = guild.roles.cache.find(r => r.name === '🛡️ إدارة');
    if (!adminRole) {
        adminRole = await guild.roles.create({
            name: '🛡️ إدارة',
            color: '#E74C3C',
            hoist: true,
            permissions: [PermissionFlagsBits.Administrator],
            reason: '⚙️ إعداد السيرفر التلقائي',
        }).catch(() => null);
    }

    let jailRole = guild.roles.cache.find(r => r.name === config.jailRoleName);
    if (!jailRole) {
        jailRole = await guild.roles.create({
            name: config.jailRoleName,
            color: '#000000',
            reason: '⚙️ إعداد السيرفر التلقائي - رتبة السجن',
        }).catch(() => null);
    }
    if (jailRole) {
        guildData.jailRole = jailRole.id;
    }

    const everyoneRole = guild.roles.everyone;
    const totalCats = structure.categories.length;
    let progress = 15;

    // ─── الخطوة 3: إنشاء الفئات والقنوات ──────────────────────────────────
    for (let i = 0; i < structure.categories.length; i++) {
        const catDef = structure.categories[i];
        progress = 15 + Math.floor((i / totalCats) * 65);

        await progressMsg.edit({
            embeds: [buildProgressEmbed(`🏗️ إنشاء: ${catDef.name}`, progress, isReset)]
        }).catch(() => {});

        try {
            // صلاحيات الفئة
            const catPermissions = [];
            if (jailRole) {
                if (catDef.isJail) {
                    catPermissions.push({ id: jailRole.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] });
                } else {
                    catPermissions.push({ id: jailRole.id, deny: [PermissionFlagsBits.ViewChannel] });
                }
            }

            if (catDef.isJail) {
                catPermissions.push({ id: everyoneRole.id, deny: [PermissionFlagsBits.ViewChannel] });
                if (adminRole) {
                    catPermissions.push({ id: adminRole.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] });
                }
            } else if (catDef.privateAdmin) {
                catPermissions.push({ id: everyoneRole.id, deny: [PermissionFlagsBits.ViewChannel] });
                if (adminRole) {
                    catPermissions.push({ id: adminRole.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] });
                }
            } else if (catDef.locked) {
                catPermissions.push({
                    id: everyoneRole.id,
                    allow: [PermissionFlagsBits.ViewChannel],
                    deny: [PermissionFlagsBits.SendMessages],
                });
                if (adminRole) {
                    catPermissions.push({ id: adminRole.id, allow: [PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageMessages] });
                }
            }

            const category = await guild.channels.create({
                name: catDef.name,
                type: ChannelType.GuildCategory,
                permissionOverwrites: catPermissions,
                reason: '⚙️ إعداد السيرفر',
            });
            results.categories++;

            // إنشاء القنوات داخل الفئة
            for (const chDef of catDef.channels) {
                try {
                    const chPermissions = [];

                    if (catDef.privateAdmin || chDef.privateAdmin) {
                        // قنوات الإدارة السرية
                        chPermissions.push({ id: everyoneRole.id, deny: [PermissionFlagsBits.ViewChannel] });
                        if (adminRole) {
                            chPermissions.push({ id: adminRole.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] });
                        }
                    } else if (chDef.adminOnly) {
                        // مرئية للجميع لكن الكتابة للإدارة فقط
                        chPermissions.push({
                            id: everyoneRole.id,
                            allow: [PermissionFlagsBits.ViewChannel],
                            deny: [PermissionFlagsBits.SendMessages],
                        });
                        if (adminRole) {
                            chPermissions.push({ id: adminRole.id, allow: [PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageMessages] });
                        }
                    } else if (chDef.readOnly || catDef.locked) {
                        // للقراءة فقط
                        chPermissions.push({
                            id: everyoneRole.id,
                            allow: [PermissionFlagsBits.ViewChannel],
                            deny: [PermissionFlagsBits.SendMessages, PermissionFlagsBits.AddReactions],
                        });
                        if (adminRole) {
                            chPermissions.push({ id: adminRole.id, allow: [PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageMessages, PermissionFlagsBits.AddReactions] });
                        }
                    }

                    const channel = await guild.channels.create({
                        name: chDef.name,
                        type: chDef.type || ChannelType.GuildText,
                        parent: category,
                        topic: chDef.topic || null,
                        permissionOverwrites: chPermissions,
                        reason: '⚙️ إعداد السيرفر',
                    });

                    // حفظ معرف القنوات المهمة
                    if (chDef.dbKey) {
                        guildData[chDef.dbKey] = channel.id;
                        channelRefs[chDef.dbKey] = channel;
                    }

                    // تسجيل مرجع للنشر لاحقاً
                    if (chDef.botPost) {
                        channelRefs[`post_${chDef.botPost}`] = channel;
                    }

                    results.channels++;
                    await _sleep(350);
                } catch (err) {
                    results.errors++;
                    console.error(`[ServerSetup] فشل إنشاء ${chDef.name}:`, err.message);
                }
            }

            await _sleep(400);
        } catch (err) {
            results.errors++;
            console.error(`[ServerSetup] فشل إنشاء فئة ${catDef.name}:`, err.message);
        }
    }

    // ─── الخطوة 4: حفظ البيانات ────────────────────────────────────────────
    guildData.setupComplete = true;
    guildData.setupDate = Date.now();
    db.updateGuildData(guild.id, guildData);

    // ─── الخطوة 5: نشر المحتوى ─────────────────────────────────────────────
    await progressMsg.edit({ embeds: [buildProgressEmbed('📝 نشر القوانين والأدلة...', 88, isReset)] }).catch(() => {});

    // نشر القوانين
    if (channelRefs['post_rules']) {
        await postRules(guild, channelRefs['post_rules']);
    }

    // نشر دليل الغرف
    if (channelRefs['post_roomsGuide']) {
        await postRoomsGuide(guild, channelRefs['post_roomsGuide']);
    }

    // نشر دليل الألوان
    if (channelRefs['post_colors']) {
        await postColorsGuide(guild, channelRefs['post_colors']);
    }

    // نشر دليل البوت
    if (channelRefs['post_botGuide']) {
        await postBotGuide(guild, channelRefs['post_botGuide']);
    }

    // نشر لوحة المتصدرين الأولية
    if (channelRefs['post_leaderboard']) {
        try {
            const leaderboard = require('../main/leaderboard');
            await leaderboard.sendLeaderboardToChannel(
                channelRefs['post_leaderboard'],
                guild.client,
                guild.id
            );
            console.log('[ServerSetup] ✅ تم نشر لوحة المتصدرين');
        } catch (err) {
            console.warn('[ServerSetup] تعذر نشر لوحة المتصدرين:', err.message);
        }
    }

    await progressMsg.edit({ embeds: [buildProgressEmbed('✅ اكتمل البناء!', 100, isReset)] }).catch(() => {});

    return { results, channelRefs };
}

// ─── مساعد: تأخير ────────────────────────────────────────────────────────────
function _sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}

// ─── تصدير الوحدة ────────────────────────────────────────────────────────────
module.exports = {
    name: 'server-setup',
    aliases: ['تفعيل', 'اعادة تفعيل', 'اعادة-تفعيل', 'setup-server', 'reset-server', 'بناء-سيرفر'],
    description: 'بناء وإعداد السيرفر بالكامل',
    permissions: [PermissionFlagsBits.Administrator],
    category: 'إدارة',

    async execute(message, args) {
        // فحص الصلاحيات
        if (!message.member?.permissions.has(PermissionFlagsBits.Administrator) &&
            message.author.id !== config.ownerId) {
            return message.reply('❌ هذا الأمر يحتاج صلاحية **Administrator**!');
        }

        const isReset = message.content.toLowerCase().includes('اعادة') ||
            message.content.toLowerCase().includes('reset');

        // رسالة التأكيد بأزرار
        const confirmEmbed = new EmbedBuilder()
            .setColor(C.orange)
            .setTitle(isReset ? '⚠️ تأكيد إعادة التفعيل الكامل' : '🚀 تأكيد تفعيل السيرفر')
            .setDescription([
                isReset
                    ? '> **⚠️ سيتم حذف جميع القنوات الحالية وإعادة بنائها من الصفر!**'
                    : '> **🚀 سيتم بناء هيكل السيرفر الكامل!**',
                '',
                '**📋 ما سيحدث:**',
                isReset ? '• 🗑️ حذف جميع القنوات الحالية' : '• ✅ بناء قنوات جديدة',
                '• 📁 إنشاء 10 فئات منظمة',
                '• 🎮 8 غرف ألعاب + Mobile Legends',
                '• 💰 نظام البنك والاقتصاد',
                '• 📜 نشر القوانين تلقائياً في روم القوانين',
                '• 🏠 دليل الغرف مع أزرار إنشاء سريع',
                '• 🎨 نظام الألوان التفاعلي بأزرار',
                '• 🤖 دليل البوت الكامل',
                '• 🔒 قنوات الإدارة السرية',
                '',
                '> **اضغط ✅ للتأكيد أو ❌ للإلغاء (30 ثانية)**',
            ].join('\n'))
            .setTimestamp();

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('setup_confirm')
                .setLabel(isReset ? '✅ نعم، إعادة تفعيل' : '✅ نعم، تفعيل')
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId('setup_cancel')
                .setLabel('❌ إلغاء')
                .setStyle(ButtonStyle.Danger),
        );

        const confirmMsg = await message.reply({ embeds: [confirmEmbed], components: [row] });

        const filter = i => i.user.id === message.author.id;
        try {
            const response = await confirmMsg.awaitMessageComponent({ filter, time: 30_000 });

            if (response.customId === 'setup_cancel') {
                await response.update({
                    embeds: [new EmbedBuilder().setColor(C.red).setTitle('❌ تم إلغاء العملية').setDescription('> لم يتم أي تغيير.')],
                    components: []
                });
                return;
            }

            // بدء البناء
            await response.update({
                embeds: [buildProgressEmbed('🚀 بدء العملية...', 0, isReset)],
                components: []
            });

            const { results } = await buildServer(message.guild, confirmMsg, isReset);

            // رسالة النجاح
            await confirmMsg.edit({
                embeds: [buildSuccessEmbed(message.guild, results, isReset)],
                components: []
            }).catch(() => {});

        } catch (err) {
            if (err.message?.includes('time')) {
                await confirmMsg.edit({
                    embeds: [new EmbedBuilder().setColor(C.red).setTitle('⏰ انتهت المهلة').setDescription('> لم يتم التأكيد خلال 30 ثانية.')],
                    components: []
                }).catch(() => {});
            } else {
                console.error('[ServerSetup] خطأ:', err.message);
                await confirmMsg.edit({
                    embeds: [new EmbedBuilder().setColor(C.red).setTitle('❌ حدث خطأ').setDescription(`> ${err.message}`)],
                    components: []
                }).catch(() => {});
            }
        }
    },

    // تصدير للاستخدام الخارجي
    buildServer,
    postRules,
    postColorsGuide,
    postRoomsGuide,
    postBotGuide,
};
