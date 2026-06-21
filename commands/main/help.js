'use strict';

/**
 * ╔══════════════════════════════════════════════════════════╗
 * ║            📚 دليل الأوامر الشامل — Help System          ║
 * ╚══════════════════════════════════════════════════════════╝
 */

const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, MessageFlags } = require('discord.js');
const config = require('../../config');

module.exports = {
    name: 'help',
    aliases: ['مساعدة', 'هيلب'],
    description: 'دليل أوامر البوت الشامل',
    usage: 'help',

    async execute(message) {
        const isOwner = (message.author?.id || message.user?.id) === config.ownerId;
        const embed = buildMainEmbed(message.client?.user || message.user);
        const row = buildSelectMenu(false, isOwner);
        await message.reply({ embeds: [embed], components: [row] });
    },

    async handleHelpInteraction(interaction) {
        const isOwner = interaction.user.id === config.ownerId;
        const value = interaction.values ? interaction.values[0] : interaction.customId;
        let embed;

        switch (value) {
            case 'help_economy':          embed = getEconomyEmbed(); break;
            case 'help_economy_advanced': embed = getEconomyAdvancedEmbed(); break;
            case 'help_games':            embed = getGamesEmbed(); break;
            case 'help_social':           embed = getSocialEmbed(); break;
            case 'help_moderation':       embed = getModerationEmbed(); break;
            case 'help_fun':              embed = getFunEmbed(); break;
            case 'help_info':             embed = getInfoEmbed(); break;
            case 'help_owner':
                if (!isOwner) {
                    return interaction.reply({ content: '❌ هذا القسم للمالك فقط!', flags: MessageFlags.Ephemeral });
                }
                embed = getOwnerEmbed();
                break;
            case 'help_back':
                embed = buildMainEmbed(interaction.client.user);
                return interaction.update({ embeds: [embed], components: [buildSelectMenu(false, isOwner)] });
            default:
                return;
        }

        const backRow = buildSelectMenu(true, isOwner);
        await interaction.update({ embeds: [embed], components: [backRow] });
    }
};

// ═══════════════════════════════════════════════════════════════════
// بناء الـ Embed الرئيسي
// ═══════════════════════════════════════════════════════════════════

function buildMainEmbed(botUser) {
    return new EmbedBuilder()
        .setColor('#9B59B6')
        .setTitle(`🤖 ${botUser?.username || 'البوت'} — دليل الأوامر الشامل`)
        .setThumbnail(botUser?.displayAvatarURL({ size: 256 }))
        .setDescription([
            '> مرحباً! اختر القسم من القائمة المنسدلة بالأسفل للاطلاع على الأوامر.',
            '',
            '```',
            '💡 معلومات سريعة:',
            `• البريفكس: "${config.prefix}" أو اكتب الأمر مباشرة`,
            '• جميع الأوامر تدعم العربية والإنجليزية',
            '• معظم الأوامر تعمل بالأزرار التفاعلية',
            '```',
        ].join('\n'))
        .addFields(
            { name: '💰 الاقتصاد الأساسي',   value: 'رصيد، يومي، راتب، عمل، سرقة', inline: true },
            { name: '📈 الاقتصاد المتقدم',    value: 'شركة، بورصة، مزاد، عقارات', inline: true },
            { name: '💹 السوق الجديد',         value: 'سوق، تداول، محفظة، رسوم بيانية', inline: true },
            { name: '🎮 الألعاب',              value: 'تريفيا، اكس او، مشنقة', inline: true },
            { name: '🎰 الكازينو المتطور',     value: 'كازينو، سلوتس، كراش، رولت', inline: true },
            { name: '🎯 الألعاب المصغرة',      value: 'mini bomb، mini speed، mini chain', inline: true },
            { name: '👥 الاجتماعي',            value: 'زواج، كلان، أصدقاء', inline: true },
            { name: '🛡️ الإدارة',             value: 'طرد، باند، ميوت، سجن', inline: true },
            { name: '🎉 ترفيه',               value: 'حظك، ميم، سفينة، 8بول', inline: true },
            { name: '🏅 إنجازات جديدة',       value: 'انجازات، بروفايل، تحليلات', inline: true },
            { name: '📊 التحليلات',            value: 'احصائيات يومية، رسوم بيانية', inline: true },
            { name: '🏓 نظام بينج',            value: 'ping — تقرير الأداء المتكامل', inline: true }
        )
        .setTimestamp()
        .setFooter({ text: 'اختر قسماً من القائمة 👇' });
}

// ═══════════════════════════════════════════════════════════════════
// بناء القائمة المنسدلة
// ═══════════════════════════════════════════════════════════════════

function buildSelectMenu(withBack = false, isOwner = false) {
    const options = [];
    if (withBack) options.push({ label: '🏠 الرئيسية', value: 'help_back', emoji: '🏠' });

    options.push(
        { label: 'الاقتصاد الأساسي',  value: 'help_economy',          description: 'رصيد، يومي، عمل، سرقة...', emoji: '💰' },
        { label: 'الاقتصاد المتقدم',   value: 'help_economy_advanced', description: 'شركة، بورصة، عقارات، قروض...', emoji: '📈' },
        { label: 'الألعاب',            value: 'help_games',            description: 'تريفيا، اكس او، مقص ورقة...', emoji: '🎮' },
        { label: 'الاجتماعي',          value: 'help_social',           description: 'زواج، أصدقاء، كلانات...', emoji: '👥' },
        { label: 'الإدارة والمودريشن', value: 'help_moderation',       description: 'طرد، باند، ميوت، سجن...', emoji: '🛡️' },
        { label: 'ترفيه وفن',          value: 'help_fun',              description: 'حظك، ميم، سفينة، 8بول...', emoji: '🎉' },
        { label: 'معلومات عامة',        value: 'help_info',             description: 'عن البوت والإصدار', emoji: 'ℹ️' }
    );

    // قسم المالك — يظهر فقط للمالك
    if (isOwner) {
        options.push({ label: '👑 أوامر المالك الحصرية', value: 'help_owner', description: 'أوامر خاصة بمالك البوت', emoji: '👑' });
    }

    return new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
            .setCustomId('help_select_category')
            .setPlaceholder('اختر القسم الذي تريد تصفحه...')
            .addOptions(options)
    );
}

// ═══════════════════════════════════════════════════════════════════
// Embed كل قسم
// ═══════════════════════════════════════════════════════════════════

function getEconomyEmbed() {
    return new EmbedBuilder()
        .setColor('#FFD700')
        .setTitle('💰 الاقتصاد الأساسي')
        .setDescription('> جميع أوامر المال والبنك والتبادل')
        .addFields(
            { name: '📊 العرض', value: '`رصيد` `رصيد @user` — عرض رصيدك أو رصيد شخص آخر\n`لوحة` — لوحة الاقتصاد التفصيلية\n`متصدرين` — قائمة الأثرياء' },
            { name: '🏦 البنك', value: '`ايداع <مبلغ|نصف|ربع|كامل>` — إيداع في البنك\n`سحب <مبلغ|نصف|ربع|كامل>` — سحب من البنك' },
            { name: '💼 الكسب', value: '`يومي` — مكافأة يومية + مكافأة التتابع\n`راتب` — راتب أسبوعي\n`عمل` — عمل عشوائي مقابل مكافأة' },
            { name: '💸 التبادل', value: '`تحويل @user <مبلغ>` — تحويل أموال\n`سرقة @user` — محاولة سرقة (احتمال 40% نجاح)' },
            { name: '🏪 التسوق', value: '`متجر` — عرض المتجر مع أزرار الشراء\n`مجمع` — جمع عائدات الأصول' }
        )
        .setTimestamp();
}

function getEconomyAdvancedEmbed() {
    return new EmbedBuilder()
        .setColor('#27AE60')
        .setTitle('📈 الاقتصاد المتقدم')
        .setDescription('> أنظمة الاستثمار والأعمال المتقدمة')
        .addFields(
            { name: '🏢 الشركات', value: '`شركة` — فتح لوحة إدارة الشركة (تأسيس، توظيف، جمع أرباح)' },
            { name: '📉 البورصة', value: '`بورصة` — عرض الأسهم\n`استثمار <سهم> <مبلغ>` — شراء أسهم\n`سحب_استثمار <سهم>` — بيع أسهم' },
            { name: '🏡 العقارات', value: '`عقارات` — عرض وإدارة عقاراتك' },
            { name: '💳 القروض', value: '`قرض` — طلب قرض أو عرض القرض الحالي' },
            { name: '🏛️ المزادات', value: '`مزاد` — عرض وإدارة المزادات' },
            { name: '🛡️ التأمين', value: '`تامين` — حماية رصيدك من السرقة' }
        )
        .setTimestamp();
}

function getGamesEmbed() {
    return new EmbedBuilder()
        .setColor('#E74C3C')
        .setTitle('🎮 الألعاب')
        .setDescription('> ألعاب متنوعة للترفيه وكسب المال')
        .addFields(
            { name: '🧠 ذكاء وثقافة', value: '`تريفيا` — أسئلة ثقافية بمستويات صعوبة\n`فحش الكلمة` — خمن الكلمة المشفرة\n`رياضيات` — حل عمليات حسابية\n`ذاكرة` — لعبة الذاكرة' },
            { name: '❌⭕ إستراتيجية', value: '`اكس_او` — تيك تاك تو مع لاعب آخر\n`حجر_ورقة_مقص` — رحجة ورقة مقص' },
            { name: '📝 كلمات', value: '`مشنقة` — خمن الكلمة حرفاً بحرف\n`scramble` — رتّب الحروف لتكوين الكلمة' },
            { name: '🏆 بطولات', value: '`بطولة` — نظام بطولات للمنافسة بين اللاعبين' },
            { name: '💰 جوائز الألعاب', value: 'جميع الألعاب تمنح مكافآت مالية عند الفوز!' }
        )
        .setTimestamp();
}

function getSocialEmbed() {
    return new EmbedBuilder()
        .setColor('#3498DB')
        .setTitle('👥 الاجتماعي')
        .setDescription('> أنظمة التفاعل الاجتماعي')
        .addFields(
            { name: '💍 الزواج', value: '`زوج @user` — إرسال طلب زواج\n`طلاق @user` — طلب طلاق (يحتاج موافقة)\n`خلع @user` — طلاق من طرف واحد\n`متزوجين` — قائمة الأزواج في السيرفر' },
            { name: '👥 الكلانات', value: '`كلان` — لوحة إدارة الكلان (إنشاء، دعوة، فصل)\nنظام مبني على الأزرار الكاملة' },
            { name: '👫 الأصدقاء', value: '`اصدقاء` — عرض وإدارة قائمة الأصدقاء' },
            { name: '🎂 المناسبات', value: '`عيد_ميلادي` — تسجيل تاريخ ميلادك (مكافأة 5,000 💰 في عيد ميلادك!)' }
        )
        .setTimestamp();
}

function getModerationEmbed() {
    return new EmbedBuilder()
        .setColor('#95A5A6')
        .setTitle('🛡️ الإدارة والمودريشن')
        .setDescription('> أوامر إدارية — تتطلب صلاحيات')
        .addFields(
            { name: '⚙️ الإعداد', value: '`تفعيل` — إنشاء القنوات والرتب تلقائياً (أدمن فقط)' },
            { name: '🔨 العقوبات', value: '`طرد @user` — طرد عضو\n`باند @user` — حظر عضو\n`ميوت @user <مدة>` — كتم عضو\n`سجن @user <مدة>` — سجن عضو\n`تنبيه @user <سبب>` — إنذار عضو' },
            { name: '🔓 رفع العقوبات', value: '`فك_ميوت @user` — رفع الكتم\n`فك_سجن @user` — رفع السجن' },
            { name: '🔧 قناة', value: '`كلير <عدد>` — حذف رسائل\n`قفل` — قفل القناة\n`فتح` — فتح القناة\n`نقل @user` — نقل عضو لفويس آخر' },
            { name: '📋 لوحة الأدمن', value: '`بانل` — لوحة التحكم الإدارية الكاملة بالأزرار' }
        )
        .setTimestamp();
}

function getFunEmbed() {
    return new EmbedBuilder()
        .setColor('#F39C12')
        .setTitle('🎉 ترفيه وفن')
        .setDescription('> أوامر الترفيه والمتعة')
        .addFields(
            { name: '🔮 تنجيم', value: '`حظي` — توقعات يومية\n`8بول <سؤال>` — سحر الكرة الثامنة' },
            { name: '❤️ تفاعل', value: '`سفينة @user1 @user2` — نسبة التوافق\n`ماذا_تفضل` — سؤال Would You Rather' },
            { name: '😂 ميم', value: '`ميم` — ميم عشوائي من Reddit' },
            { name: '🎲 نرد', value: '`نرد <أوجه>` — رمي النرد' },
            { name: '💬 أخرى', value: '`حقيقة` — حقيقة علمية مثيرة\n`say <نص>` — البوت يكتب باسمك' }
        )
        .setTimestamp();
}

function getInfoEmbed() {
    return new EmbedBuilder()
        .setColor('#2ECC71')
        .setTitle('ℹ️ معلومات عامة')
        .setDescription('> معلومات عن البوت والنظام')
        .addFields(
            { name: '📦 الإصدار', value: 'v3.0.0 — الجيل القادم 🚀', inline: true },
            { name: '🌐 اللغة', value: 'عربي بالكامل', inline: true },
            { name: '⚡ البريفكس', value: `\`${config.prefix}\` أو بدون بريفكس`, inline: true },
            { name: '🆕 الأنظمة الجديدة', value: [
                '> 📊 **Analytics Engine** — تحليلات آنية',
                '> 🧠 **Persona Engine** — شخصية ديناميكية ومزاج',
                '> 🛡️ **Advanced Security** — نقاط الثقة وكشف البوتات',
                '> ⚡ **Smart Cache** — أداء فائق السرعة',
                '> 🎰 **Casino v3** — سلوتس + كراش + رولت',
                '> 💹 **Market v3** — سوق مالي بأسعار ديناميكية',
                '> 🏅 **Achievements** — نظام الإنجازات الكامل',
                '> 🎯 **Mini-Games** — ألعاب مصغرة جديدة',
            ].join('\n') },
            { name: '💡 نصائح', value: '• اكتب الأمر مباشرة بدون بريفكس (مثلاً: `يومي`)\n• معظم الأوامر تعمل بالأزرار التفاعلية\n• يمكنك منشنة البوت للتحدث معه\n• `انجازات` لعرض إنجازاتك' }
        )
        .setTimestamp();
}

function getOwnerEmbed() {
    return new EmbedBuilder()
        .setColor('#FFD700')
        .setTitle('👑 أوامر المالك الحصرية')
        .setDescription('> هذه الأوامر لك وحدك يا صاحب البوت 👑')
        .addFields(
            {
                name: '📊 لوحة التحكم',
                value: '`داشبورد` أو `هيلب` أو `help` — فتح لوحة التحكم عبر الخاص (DM)'
            },
            {
                name: '🎮 التحكم',
                value: [
                    '`!status <نوع> <نص>` — تغيير حالة البوت',
                    '`!servers` — قائمة السيرفرات مع روابط دعوة',
                    '`!broadcast <رسالة>` — إرسال رسالة لجميع السيرفرات',
                ].join('\n')
            },
            {
                name: '🔧 الإعدادات',
                value: [
                    '`!say <نص>` — إرسال رسالة باسم البوت',
                    'لوحة التحكم عبر DM تحتوي على:',
                    '• تبديل وضع الصيانة',
                    '• إحصائيات تفصيلية',
                    '• جميع الأوامر المحملة',
                ].join('\n')
            },
            {
                name: '⚙️ أنواع الحالة',
                value: '`play` • `watch` • `listen` • `compete`\nمثال: `!status يلعب مع المستخدمين`'
            }
        )
        .setFooter({ text: '👑 هذا القسم مخفي عن باقي المستخدمين' })
        .setTimestamp();
}
