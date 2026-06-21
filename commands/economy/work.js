'use strict';

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║  💼 WORK v3.0 — أمر العمل بأزرار احترافية                              ║
 * ║  أعمال متنوعة | بوست مرئي | أزرار سريعة | إنجازات                     ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, MessageFlags } = require('discord.js');
const db = require('../../utils/database');
const config = require('../../config');
const levels = require('../../utils/levels');
let analytics = null; try { analytics = require('../../utils/analytics'); } catch {}
let achievementsCmd = null; try { achievementsCmd = require('../main/achievements-cmd'); } catch {}

const JOBS = [
    { name: 'مبرمج',      emoji: '💻', min: 250, max: 550, desc: 'كتبت كوداً احترافياً وسلّمت مشروعاً ضخماً في الموعد!', xp: 5 },
    { name: 'طبيب',       emoji: '⚕️', min: 350, max: 650, desc: 'أجريت عملية ناجحة وأنقذت حياة مريض بمهارة!', xp: 5 },
    { name: 'مهندس',      emoji: '🔧', min: 280, max: 580, desc: 'صممت جسراً ضخماً وأشرفت على بنائه بدقة!', xp: 4 },
    { name: 'معلم',       emoji: '📚', min: 180, max: 420, desc: 'أعطيت درساً مميزاً وأثّرت في طلابك بعمق!', xp: 3 },
    { name: 'طاهي',       emoji: '👨‍🍳', min: 200, max: 480, desc: 'طبخت وجبة فاخرة نالت استحسان الزبائن!', xp: 3 },
    { name: 'سائق',       emoji: '🚗', min: 150, max: 380, desc: 'أوصلت عملاءك بأمان في وقت قياسي!', xp: 2 },
    { name: 'تاجر',       emoji: '🏪', min: 300, max: 620, desc: 'أتممت صفقة تجارية مربحة بمهارة فائقة!', xp: 5 },
    { name: 'مصمم',       emoji: '🎨', min: 220, max: 500, desc: 'صممت شعاراً احترافياً أدهش العميل!', xp: 4 },
    { name: 'رياضي',      emoji: '⚽', min: 200, max: 450, desc: 'سجّلت هدفاً رائعاً في الدقيقة الأخيرة!', xp: 3 },
    { name: 'صياد',       emoji: '🎣', min: 150, max: 400, desc: 'اصطدت سمكة ضخمة وبعتها بسعر مرتفع!', xp: 2 },
    { name: 'نجار',       emoji: '🪚', min: 200, max: 460, desc: 'صنعت أثاثاً خشبياً فاخراً بيد بارعة!', xp: 3 },
    { name: 'حارس أمن',   emoji: '🛡️', min: 160, max: 360, desc: 'أمّنت الحدث بكفاءة عالية دون أي مشكلة!', xp: 2 },
    { name: 'كاتب',       emoji: '✍️', min: 190, max: 430, desc: 'كتبت مقالاً رائعاً نُشر على أكبر المواقع!', xp: 4 },
    { name: 'مسوّق',      emoji: '📊', min: 240, max: 520, desc: 'أطلقت حملة تسويقية ناجحة رفعت المبيعات!', xp: 4 },
    { name: 'مصوّر',      emoji: '📸', min: 180, max: 400, desc: 'التقطت صوراً رائعة في مؤتمر ضخم!', xp: 3 },
    { name: 'محامي',      emoji: '⚖️', min: 350, max: 700, desc: 'دافعت عن موكلك وفزت بالقضية!', xp: 5 },
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
            const cooldown = config.workCooldown || 3600000;

            // ── كولداون ─────────────────────────────────────────────
            if (userData.lastWork && (now - userData.lastWork) < cooldown) {
                const timeLeft = cooldown - (now - userData.lastWork);
                const minutes = Math.floor(timeLeft / 60000);
                const seconds = Math.floor((timeLeft % 60000) / 1000);

                const embed = new EmbedBuilder()
                    .setColor('#ED4245')
                    .setTitle('⏰ أنت متعب!')
                    .setDescription(`> يمكنك العمل مرة أخرى بعد:\n> ## ⌛ ${minutes} دقيقة و ${seconds} ثانية`)
                    .setFooter({ text: 'استرِح قليلاً ثم عُد!' });

                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('work_daily').setLabel('🎁 يوميتي').setStyle(ButtonStyle.Primary),
                    new ButtonBuilder().setCustomId('work_balance').setLabel('💰 رصيدي').setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder().setCustomId('work_rob').setLabel('🕵️ اسرق!').setStyle(ButtonStyle.Danger),
                );

                return message.reply({ embeds: [embed], components: [row] });
            }

            // ── اختيار الوظيفة ──────────────────────────────────────
            const job = JOBS[Math.floor(Math.random() * JOBS.length)];
            let earned = Math.floor(Math.random() * (job.max - job.min + 1)) + job.min;
            let boostNote = '';
            let boostMultiplier = 1.0;

            // بوستات من المتجر
            const inv = userData.inventory || {};
            if (inv.laptop?.expiresAt > now) {
                boostMultiplier *= 1.5;
                boostNote += '\n💻 *بوست اللابتوب (+50%)*';
            } else if (inv.pickaxe?.expiresAt > now) {
                boostMultiplier *= 1.2;
                boostNote += '\n⛏️ *بوست المعول (+20%)*';
            }
            if (userData.dailyBoostUntil && now < userData.dailyBoostUntil) {
                boostMultiplier *= 1.25;
                boostNote += '\n🎁 *مضاعف اليومي (+25%)*';
            }

            if (boostMultiplier > 1.0) earned = Math.floor(earned * boostMultiplier);

            // ── حفظ البيانات ─────────────────────────────────────────
            const newBalance = (userData.balance || 0) + earned;
            db.updateFields(userId, { balance: newBalance, lastWork: now });
            db.addTransaction(userId, 'work', earned, `Work as ${job.name}`);
            levels.addXP(userId, job.xp, message);

            // ── نسبة الراتب بالنسبة للمهنة ───────────────────────────
            const earningPct = Math.round(((earned - job.min) / (job.max - job.min)) * 100);
            const ratingEmoji = earningPct >= 80 ? '🔥 ممتاز!' : earningPct >= 50 ? '✅ جيد' : '😐 عادي';

            // ── Embed ─────────────────────────────────────────────────
            const embed = new EmbedBuilder()
                .setColor(earningPct >= 80 ? '#57F287' : earningPct >= 50 ? '#FEE75C' : '#5865F2')
                .setTitle(`${job.emoji} عمل كـ ${job.name}`)
                .setDescription(`> ${job.desc}${boostNote}`)
                .addFields(
                    { name: '💵 الكسب', value: `**+${earned.toLocaleString()} ${config.currency}**`, inline: true },
                    { name: '⭐ XP مكتسب', value: `**+${job.xp} XP**`, inline: true },
                    { name: '📊 التقييم', value: ratingEmoji, inline: true },
                    { name: '💰 رصيدك الآن', value: `${newBalance.toLocaleString()} ${config.currency}`, inline: false },
                )
                .setFooter({ text: `⏰ العمل التالي بعد ${Math.floor((config.workCooldown||3600000)/60000)} دقيقة` })
                .setTimestamp();

            // ── أزرار سريعة ───────────────────────────────────────────
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('work_again_info').setLabel('🔄 وقت التالي').setStyle(ButtonStyle.Secondary).setDisabled(true),
                new ButtonBuilder().setCustomId('work_daily').setLabel('🎁 يوميتي').setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId('work_balance').setLabel('💰 رصيدي').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('work_casino').setLabel('🎰 كازينو').setStyle(ButtonStyle.Danger),
            );

            await message.reply({ embeds: [embed], components: [row] });

            // ── التحليلات والإنجازات ───────────────────────────────────
            analytics?.trackEconomy('earn', earned, userId);
            achievementsCmd?.checkAchievements(userId, 'work', {}, message).catch(() => {});
            achievementsCmd?.checkAchievements(userId, 'balance_check', {}, message).catch(() => {});

        } catch (error) {
            console.error('[work error]:', error);
            message.reply('❌ حدث خطأ في أمر العمل.').catch(() => {});
        }
    },

    // ── معالج الأزرار ─────────────────────────────────────────────────
    async handleWorkInteraction(interaction) {
        const id = interaction.customId;

        if (id === 'work_daily') {
            await interaction.reply({ content: `> 🎁 اكتب \`يومي\` للحصول على مكافأتك اليومية!`, flags: MessageFlags.Ephemeral });
        } else if (id === 'work_balance') {
            const userData = db.getUserData(interaction.user.id);
            await interaction.reply({
                content: `> 💰 **رصيدك:** ${(userData.balance || 0).toLocaleString()} ${config.currency}\n> 🏦 **البنك:** ${(userData.bank || 0).toLocaleString()} ${config.currency}`,
                flags: MessageFlags.Ephemeral
            });
        } else if (id === 'work_rob') {
            await interaction.reply({ content: `> 🕵️ اكتب \`سرقة @شخص\` لمحاولة السرقة!`, flags: MessageFlags.Ephemeral });
        } else if (id === 'work_casino') {
            await interaction.reply({ content: `> 🎰 اكتب \`كازينو\` لفتح الكازينو!`, flags: MessageFlags.Ephemeral });
        }
    }
};
