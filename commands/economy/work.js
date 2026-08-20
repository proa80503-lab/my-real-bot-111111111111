'use strict';

const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, MessageFlags } = require('discord.js');
const db = require('../../utils/database');
const config = require('../../config');
const levels = require('../../utils/levels');

// ─── قوائم المهن ──────────────────────────────────────────────────────────────
const JOBS = [
    { name: 'مبرمج',     emoji: '💻', min: 250, max: 550, desc: 'كتبت كوداً احترافياً وسلّمت مشروعاً ضخماً في الموعد!',    xp: 5 },
    { name: 'طبيب',      emoji: '⚕️', min: 350, max: 650, desc: 'أجريت عملية ناجحة وأنقذت حياة مريض بمهارة عالية!',       xp: 5 },
    { name: 'مهندس',     emoji: '🔧', min: 280, max: 580, desc: 'صممت جسراً ضخماً وأشرفت على بنائه بدقة متناهية!',         xp: 4 },
    { name: 'معلم',      emoji: '📚', min: 180, max: 420, desc: 'أعطيت درساً مميزاً وتركت أثراً طيباً في طلابك!',           xp: 3 },
    { name: 'طاهي',      emoji: '👨‍🍳', min: 200, max: 480, desc: 'طبخت وجبة فاخرة نالت إعجاب الزبائن جميعهم!',            xp: 3 },
    { name: 'سائق',      emoji: '🚗', min: 150, max: 380, desc: 'أوصلت ركابك بأمان تام في أقصر وقت ممكن!',                 xp: 2 },
    { name: 'تاجر',      emoji: '🏪', min: 300, max: 620, desc: 'أتممت صفقة تجارية مربحة بمهارة ودهاء فائقَين!',           xp: 5 },
    { name: 'مصمم',      emoji: '🎨', min: 220, max: 500, desc: 'صممت شعاراً احترافياً أدهش العميل وفاق توقعاته!',          xp: 4 },
    { name: 'رياضي',     emoji: '⚽', min: 200, max: 450, desc: 'سجّلت هدفاً ذهبياً حسم المباراة في الدقيقة الأخيرة!',     xp: 3 },
    { name: 'صياد',      emoji: '🎣', min: 150, max: 400, desc: 'اصطدت سمكة ضخمة نادرة وبعتها بسعر مرتفع!',                xp: 2 },
    { name: 'نجار',      emoji: '🪚', min: 200, max: 460, desc: 'صنعت أثاثاً خشبياً فاخراً بيد ماهرة ودقة عالية!',         xp: 3 },
    { name: 'حارس أمن',  emoji: '🛡️', min: 160, max: 360, desc: 'أمّنت الفعالية الكبرى بكفاءة عالية دون أي مشكلة!',       xp: 2 },
    { name: 'كاتب',      emoji: '✍️', min: 190, max: 430, desc: 'كتبت مقالاً رائعاً نُشر على أكبر المنصات وحصد ألف تفاعل!', xp: 4 },
    { name: 'مسوّق',     emoji: '📊', min: 240, max: 520, desc: 'أطلقت حملة تسويقية ناجحة ضاعفت المبيعات خلال أسبوع!',     xp: 4 },
    { name: 'مصوّر',     emoji: '📸', min: 180, max: 400, desc: 'التقطت صوراً رائعة في مؤتمر دولي ضخم!',                    xp: 3 },
    { name: 'محامي',     emoji: '⚖️', min: 350, max: 700, desc: 'دافعت عن موكلك ببراعة وانتزعت حكماً بالبراءة!',            xp: 5 },
];

module.exports = {
    name: 'work',
    aliases: ['عمل', 'شتغل', 'اشتغل', 'اعمل'],
    description: 'اعمل لكسب المال والخبرة',
    usage: 'عمل',

    async execute(message) {
        try {
            const userId = message.author.id;
            const userData = db.getUserData(userId);
            const now = Date.now();
            const cooldown = config.workCooldown || 3_600_000;

            // ── كولداون ────────────────────────────────────────────────
            if (userData.lastWork && (now - userData.lastWork) < cooldown) {
                const timeLeft = cooldown - (now - userData.lastWork);
                const minutes = Math.floor(timeLeft / 60_000);
                const seconds = Math.floor((timeLeft % 60_000) / 1000);

                const embed = new EmbedBuilder()
                    .setColor('#ED4245')
                    .setTitle('⏰ أنت بحاجة للراحة!')
                    .setDescription(
                        `> يمكنك العمل مرة أخرى بعد:\n> ## ⌛ ${minutes} دقيقة و ${seconds} ثانية`
                    )
                    .setFooter({ text: 'استرِح قليلاً ثم عُد بنشاط!' });

                const row = _buildCooldownRow(minutes, seconds);
                return message.reply({ embeds: [embed], components: [row] });
            }

            // ── اختيار المهنة عشوائياً ─────────────────────────────────
            const job = JOBS[Math.floor(Math.random() * JOBS.length)];
            let earned = Math.floor(Math.random() * (job.max - job.min + 1)) + job.min;
            const boostLines = [];
            let boostMultiplier = 1.0;

            // بوستات المتجر
            const inv = userData.inventory || {};
            if (inv.laptop?.expiresAt > now) {
                boostMultiplier *= 1.5;
                boostLines.push('💻 *بوست اللابتوب (+50%)*');
            } else if (inv.pickaxe?.expiresAt > now) {
                boostMultiplier *= 1.2;
                boostLines.push('⛏️ *بوست المعول (+20%)*');
            }
            if (userData.dailyBoostUntil && now < userData.dailyBoostUntil) {
                boostMultiplier *= 1.25;
                boostLines.push('🎁 *مضاعف اليومي (+25%)*');
            }
            if (boostMultiplier > 1.0) {
                earned = Math.floor(earned * boostMultiplier);
            }

            // ── حفظ البيانات (addMoney يطبق الحد تلقائياً) ───────────────
            const actualEarned = db.addMoney(userId, earned);
            db.updateFields(userId, { lastWork: now });
            db.addTransaction(userId, 'work', actualEarned, `Work — ${job.name}`);
            levels.addXP(userId, job.xp, message);

            // ── تقييم الراتب ─────────────────────────────────────────
            const newBalance = (userData.balance || 0) + actualEarned;

            // ── تقييم الراتب ─────────────────────────────────────────────
            const earningPct = Math.round(((earned - job.min) / (job.max - job.min)) * 100);
            const ratingEmoji = earningPct >= 80 ? '🔥 ممتاز!' : earningPct >= 50 ? '✅ جيد' : '😐 عادي';
            const embedColor = earningPct >= 80 ? '#57F287' : earningPct >= 50 ? '#FEE75C' : '#5865F2';

            const descParts = [`> ${job.desc}`];
            if (boostLines.length) descParts.push('', boostLines.map(l => `> ${l}`).join('\n'));

            const embed = new EmbedBuilder()
                .setColor(embedColor)
                .setTitle(`${job.emoji} عملت كـ${job.name}`)
                .setDescription(descParts.join('\n'))
                .addFields(
                    { name: '💵 الكسب',         value: `**+${earned.toLocaleString()} ${config.currency}**`, inline: true },
                    { name: '⭐ XP مكتسب',       value: `**+${job.xp} XP**`,                                 inline: true },
                    { name: '📊 التقييم',         value: ratingEmoji,                                         inline: true },
                    { name: '💰 رصيدك الآن',      value: `${newBalance.toLocaleString()} ${config.currency}`, inline: false }
                )
                .setFooter({ text: `⏰ العمل التالي بعد ${Math.floor(cooldown / 60_000)} دقيقة` })
                .setTimestamp();

            const row = _buildWorkRow();
            await message.reply({ embeds: [embed], components: [row] });

            // التحليلات والإنجازات
            try {
                const analytics = require('../../utils/analytics');
                analytics?.trackEconomy?.('earn', earned, userId);
            } catch { /* اختياري */ }

            try {
                const achievementsCmd = require('../main/achievements-cmd');
                achievementsCmd?.checkAchievements?.(userId, 'work', {}, message).catch(() => {});
            } catch { /* اختياري */ }

        } catch (err) {
            console.error('[work] خطأ:', err);
            message.reply('❌ حدث خطأ غير متوقع في أمر العمل.').catch(() => {});
        }
    },

    // ─── معالج الأزرار ─────────────────────────────────────────────────
    async handleWorkInteraction(interaction) {
        const id = interaction.customId;

        if (id === 'work_daily') {
            return interaction.reply({ content: '> 🎁 اكتب `يومي` للحصول على مكافأتك اليومية!', flags: MessageFlags.Ephemeral });
        }
        if (id === 'work_balance') {
            const userData = db.getUserData(interaction.user.id);
            return interaction.reply({
                content: [
                    `> 💰 **رصيدك:** ${(userData.balance || 0).toLocaleString()} ${config.currency}`,
                    `> 🏦 **البنك:** ${(userData.bank || 0).toLocaleString()} ${config.currency}`,
                ].join('\n'),
                flags: MessageFlags.Ephemeral,
            });
        }
        if (id === 'work_rob') {
            return interaction.reply({ content: '> 🕵️ اكتب `سرقة @شخص` لمحاولة سرقة شخص!', flags: MessageFlags.Ephemeral });
        }
        if (id === 'work_casino') {
            return interaction.reply({ content: '> 🎰 اكتب `كازينو` لفتح الكازينو!', flags: MessageFlags.Ephemeral });
        }
        // زر "وقت التالي" المحدَّث — يُظهر الوقت المتبقي الفعلي
        if (id === 'work_timer') {
            const userData = db.getUserData(interaction.user.id);
            const cooldown = config.workCooldown || 3_600_000;
            const now = Date.now();
            if (userData.lastWork && (now - userData.lastWork) < cooldown) {
                const timeLeft = cooldown - (now - userData.lastWork);
                const m = Math.floor(timeLeft / 60_000);
                const s = Math.floor((timeLeft % 60_000) / 1000);
                return interaction.reply({
                    content: `> ⏰ يمكنك العمل مجدداً بعد **${m} دقيقة و ${s} ثانية**.`,
                    flags: MessageFlags.Ephemeral,
                });
            }
            return interaction.reply({ content: '> ✅ يمكنك العمل الآن! اكتب `عمل`.', flags: MessageFlags.Ephemeral });
        }
    },
};

// ─── أزرار عند الكولداون ──────────────────────────────────────────────────────
function _buildCooldownRow(minutes, seconds) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('work_timer')
            .setLabel(`⏰ ${minutes}د ${seconds}ث`)
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(true),
        new ButtonBuilder().setCustomId('work_daily').setLabel('🎁 يوميتي').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('work_balance').setLabel('💰 رصيدي').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('work_rob').setLabel('🕵️ اسرق!').setStyle(ButtonStyle.Danger)
    );
}

// ─── أزرار ما بعد العمل ───────────────────────────────────────────────────────
function _buildWorkRow() {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('work_timer').setLabel('⏰ وقت التالي').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('work_daily').setLabel('🎁 يوميتي').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('work_balance').setLabel('💰 رصيدي').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('work_casino').setLabel('🎰 كازينو').setStyle(ButtonStyle.Danger)
    );
}
