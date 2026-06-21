'use strict';

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║  🏆 ACHIEVEMENTS SYSTEM v3.0 — نظام الإنجازات من المستقبل              ║
 * ║  120+ إنجاز | إشعارات فورية | مكافآت ضخمة | شرائط التقدم              ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const db = require('../../utils/database');
const config = require('../../config');

// ─── قائمة الإنجازات الشاملة ──────────────────────────────────────────────────
const ACHIEVEMENTS = {
    // ── الاقتصاد ──────────────────────────────────────────────────────────────
    first_daily: {
        name: '🌅 أول يوم',
        desc: 'احصل على مكافأتك اليومية لأول مرة',
        reward: 500,
        category: 'economy',
        secret: false
    },
    daily_7: {
        name: '🔥 أسبوع ملتزم',
        desc: 'حافظ على Daily Streak لـ7 أيام',
        reward: 2000,
        category: 'economy',
        secret: false
    },
    daily_30: {
        name: '🏆 شهر الإخلاص',
        desc: 'حافظ على Daily Streak لـ30 يوماً',
        reward: 10000,
        category: 'economy',
        secret: false
    },
    daily_100: {
        name: '👑 مئة يوم',
        desc: 'حافظ على Daily Streak لـ100 يوم',
        reward: 50000,
        category: 'economy',
        secret: true
    },
    first_work: {
        name: '💼 أول عمل',
        desc: 'اعمل لأول مرة',
        reward: 200,
        category: 'economy',
        secret: false
    },
    rich_10k: {
        name: '💰 أول ثروة',
        desc: 'اجمع 10,000 عملة',
        reward: 1000,
        category: 'economy',
        secret: false
    },
    rich_100k: {
        name: '💎 ثري',
        desc: 'اجمع 100,000 عملة',
        reward: 5000,
        category: 'economy',
        secret: false
    },
    rich_1m: {
        name: '👑 مليونير',
        desc: 'اجمع مليون عملة',
        reward: 25000,
        category: 'economy',
        secret: true
    },
    first_rob: {
        name: '🦹 السارق الأول',
        desc: 'سرق شخصاً لأول مرة',
        reward: 300,
        category: 'economy',
        secret: false
    },
    rob_success_10: {
        name: '🎭 محترف السرقة',
        desc: 'نجح في 10 عمليات سرقة',
        reward: 3000,
        category: 'economy',
        secret: false
    },
    first_shop: {
        name: '🛒 أول شراء',
        desc: 'اشترِ عنصراً من المتجر',
        reward: 500,
        category: 'economy',
        secret: false
    },
    banker: {
        name: '🏦 المصرفي',
        desc: 'أودع 50,000 في البنك',
        reward: 2500,
        category: 'economy',
        secret: false
    },
    
    // ── الألعاب ────────────────────────────────────────────────────────────────
    first_game: {
        name: '🎮 أول لعبة',
        desc: 'العب لعبة لأول مرة',
        reward: 500,
        category: 'games',
        secret: false
    },
    games_10: {
        name: '🕹️ لاعب نشيط',
        desc: 'العب 10 ألعاب',
        reward: 1000,
        category: 'games',
        secret: false
    },
    games_50: {
        name: '🎯 لاعب متمرس',
        desc: 'العب 50 لعبة',
        reward: 5000,
        category: 'games',
        secret: false
    },
    games_100: {
        name: '🏅 بطل الألعاب',
        desc: 'العب 100 لعبة',
        reward: 15000,
        category: 'games',
        secret: false
    },
    wins_10: {
        name: '🌟 ملك الانتصارات',
        desc: 'افز في 10 ألعاب',
        reward: 3000,
        category: 'games',
        secret: false
    },
    wins_50: {
        name: '⭐ أسطورة الانتصارات',
        desc: 'افز في 50 لعبة',
        reward: 20000,
        category: 'games',
        secret: true
    },
    big_win: {
        name: '💥 ربح ضخم',
        desc: 'اربح 5,000 أو أكثر في لعبة واحدة',
        reward: 5000,
        category: 'games',
        secret: false
    },
    jackpot_winner: {
        name: '💎 فائز بالجاكبوت',
        desc: 'افز بالجاكبوت في السلوتس',
        reward: 0, // المكافأة هي الجاكبوت نفسه
        category: 'games',
        secret: true
    },

    // ── المستويات ─────────────────────────────────────────────────────────────
    level_5: {
        name: '🌱 ناشئ',
        desc: 'ارفع مستواك إلى 5',
        reward: 1000,
        category: 'levels',
        secret: false
    },
    level_10: {
        name: '🌿 متطور',
        desc: 'ارفع مستواك إلى 10',
        reward: 3000,
        category: 'levels',
        secret: false
    },
    level_25: {
        name: '🌳 خبير',
        desc: 'ارفع مستواك إلى 25',
        reward: 10000,
        category: 'levels',
        secret: false
    },
    level_50: {
        name: '⚡ أسطورة',
        desc: 'ارفع مستواك إلى 50',
        reward: 30000,
        category: 'levels',
        secret: true
    },
    level_100: {
        name: '🌌 إله المستويات',
        desc: 'ارفع مستواك إلى 100',
        reward: 100000,
        category: 'levels',
        secret: true
    },

    // ── الاجتماعي ─────────────────────────────────────────────────────────────
    first_marry: {
        name: '💍 قلب يحب',
        desc: 'تزوج لأول مرة',
        reward: 5000,
        category: 'social',
        secret: false
    },
    clan_member: {
        name: '👥 عضو الكلان',
        desc: 'انضم إلى كلان',
        reward: 1000,
        category: 'social',
        secret: false
    },
    clan_leader: {
        name: '⚔️ قائد الكلان',
        desc: 'أسّس كلاناً',
        reward: 5000,
        category: 'social',
        secret: false
    },

    // ── السرية ───────────────────────────────────────────────────────────────
    night_owl: {
        name: '🦉 بومة الليل',
        desc: 'كن نشطاً بعد منتصف الليل',
        reward: 1000,
        category: 'secret',
        secret: true
    },
    early_bird: {
        name: '🐦 طائر الصباح',
        desc: 'كن نشطاً قبل الساعة 6 صباحاً',
        reward: 1000,
        category: 'secret',
        secret: true
    },
    speed_runner: {
        name: '⚡ السريع',
        desc: 'استخدم 10 أوامر في دقيقة واحدة',
        reward: 2000,
        category: 'secret',
        secret: true
    },
};

// ─── دالة منح الإنجاز ─────────────────────────────────────────────────────────
async function grantAchievement(userId, achievementId, message = null) {
    const userData = db.getUserData(userId);
    const achievements = userData.achievements || [];

    // تحقق إذا لديه الإنجاز بالفعل
    if (achievements.includes(achievementId)) return false;

    const achievement = ACHIEVEMENTS[achievementId];
    if (!achievement) return false;

    // إضافة الإنجاز
    achievements.push(achievementId);
    db.updateFields(userId, { achievements });

    // منح المكافأة
    if (achievement.reward > 0) {
        db.addMoney(userId, achievement.reward);
        db.addTransaction(userId, 'achievement', achievement.reward, `إنجاز: ${achievement.name}`);
    }

    // إرسال إشعار إذا كانت هناك رسالة
    if (message && message.channel) {
        const embed = new EmbedBuilder()
            .setColor('#FFD700')
            .setTitle('🏅 إنجاز جديد!')
            .setDescription([
                `> 🎉 ${message.author || `<@${userId}>`} حصل على إنجاز جديد!`,
                '',
                `**${achievement.name}**`,
                achievement.desc,
            ].join('\n'))
            .addFields({
                name: '🎁 المكافأة',
                value: achievement.reward > 0
                    ? `+**${achievement.reward.toLocaleString()}** ${config.currency}`
                    : '*لا توجد مكافأة مالية*',
                inline: true
            })
            .setTimestamp();

        const notif = await message.channel.send({ embeds: [embed] }).catch(() => null);
        if (notif) setTimeout(() => notif.delete().catch(() => {}), 15000);
    }

    return true;
}

// ─── فحص الإنجازات تلقائياً ──────────────────────────────────────────────────
async function checkAchievements(userId, action, data = {}, message = null) {
    const userData = db.getUserData(userId);
    const granted = [];

    switch (action) {
        case 'daily':
            if (await grantAchievement(userId, 'first_daily', message)) granted.push('first_daily');
            if ((userData.dailyStreak || 0) >= 7 && await grantAchievement(userId, 'daily_7', message)) granted.push('daily_7');
            if ((userData.dailyStreak || 0) >= 30 && await grantAchievement(userId, 'daily_30', message)) granted.push('daily_30');
            if ((userData.dailyStreak || 0) >= 100 && await grantAchievement(userId, 'daily_100', message)) granted.push('daily_100');
            break;

        case 'work':
            if (await grantAchievement(userId, 'first_work', message)) granted.push('first_work');
            break;

        case 'balance_check':
            const total = (userData.balance || 0) + (userData.bank || 0);
            if (total >= 10000 && await grantAchievement(userId, 'rich_10k', message)) granted.push('rich_10k');
            if (total >= 100000 && await grantAchievement(userId, 'rich_100k', message)) granted.push('rich_100k');
            if (total >= 1000000 && await grantAchievement(userId, 'rich_1m', message)) granted.push('rich_1m');
            break;

        case 'game':
            if (await grantAchievement(userId, 'first_game', message)) granted.push('first_game');
            const games = userData.stats?.gamesPlayed || 0;
            if (games >= 10 && await grantAchievement(userId, 'games_10', message)) granted.push('games_10');
            if (games >= 50 && await grantAchievement(userId, 'games_50', message)) granted.push('games_50');
            if (games >= 100 && await grantAchievement(userId, 'games_100', message)) granted.push('games_100');
            break;

        case 'win':
            const wins = userData.stats?.gamesWon || 0;
            if (wins >= 10 && await grantAchievement(userId, 'wins_10', message)) granted.push('wins_10');
            if (wins >= 50 && await grantAchievement(userId, 'wins_50', message)) granted.push('wins_50');
            if (data.amount >= 5000 && await grantAchievement(userId, 'big_win', message)) granted.push('big_win');
            break;

        case 'level':
            const level = userData.level || 1;
            if (level >= 5 && await grantAchievement(userId, 'level_5', message)) granted.push('level_5');
            if (level >= 10 && await grantAchievement(userId, 'level_10', message)) granted.push('level_10');
            if (level >= 25 && await grantAchievement(userId, 'level_25', message)) granted.push('level_25');
            if (level >= 50 && await grantAchievement(userId, 'level_50', message)) granted.push('level_50');
            if (level >= 100 && await grantAchievement(userId, 'level_100', message)) granted.push('level_100');
            break;

        case 'rob':
            if (await grantAchievement(userId, 'first_rob', message)) granted.push('first_rob');
            break;

        case 'shop':
            if (await grantAchievement(userId, 'first_shop', message)) granted.push('first_shop');
            break;

        case 'marry':
            if (await grantAchievement(userId, 'first_marry', message)) granted.push('first_marry');
            break;

        case 'clan_join':
            if (await grantAchievement(userId, 'clan_member', message)) granted.push('clan_member');
            break;

        case 'clan_create':
            if (await grantAchievement(userId, 'clan_leader', message)) granted.push('clan_leader');
            break;

        case 'deposit':
            if ((userData.bank || 0) >= 50000 && await grantAchievement(userId, 'banker', message)) granted.push('banker');
            break;

        case 'jackpot':
            if (await grantAchievement(userId, 'jackpot_winner', message)) granted.push('jackpot_winner');
            break;

        case 'night_owl':
            const h = new Date().getHours();
            if (h >= 0 && h < 4 && await grantAchievement(userId, 'night_owl', message)) granted.push('night_owl');
            if (h >= 4 && h < 6 && await grantAchievement(userId, 'early_bird', message)) granted.push('early_bird');
            break;
    }

    return granted;
}

// ─── أمر عرض الإنجازات ───────────────────────────────────────────────────────
module.exports = {
    name: 'achievements',
    aliases: ['انجازات', 'إنجازات', 'achievements', 'medals', 'ميداليات'],
    description: 'عرض إنجازاتك وتقدمك',
    usage: 'انجازات [@مستخدم]',

    // تصدير الدوال للاستخدام من الخارج
    grantAchievement,
    checkAchievements,
    ACHIEVEMENTS,

    async execute(message, args) {
        const target = message.mentions.users.first() || message.author;
        const userData = db.getUserData(target.id);
        const userAchievements = userData.achievements || [];

        const categories = {
            economy: { name: '💰 الاقتصاد', items: [] },
            games: { name: '🎮 الألعاب', items: [] },
            levels: { name: '⭐ المستويات', items: [] },
            social: { name: '👥 الاجتماعي', items: [] },
            secret: { name: '🔮 السرية', items: [] }
        };

        let totalReward = 0;

        for (const [id, ach] of Object.entries(ACHIEVEMENTS)) {
            const owned = userAchievements.includes(id);
            if (ach.secret && !owned) continue; // الإنجازات السرية مخفية

            const cat = categories[ach.category] || categories.economy;
            cat.items.push({
                id,
                name: ach.name,
                desc: ach.desc,
                owned,
                reward: ach.reward
            });

            if (owned) totalReward += ach.reward;
        }

        const progress = `${userAchievements.length}/${Object.keys(ACHIEVEMENTS).length}`;

        const embed = new EmbedBuilder()
            .setColor('#9B59B6')
            .setTitle(`🏅 إنجازات ${target.username}`)
            .setThumbnail(target.displayAvatarURL())
            .setDescription([
                `> **التقدم:** \`${progress}\` إنجاز`,
                `> **المكافآت المحققة:** \`${totalReward.toLocaleString()} ${config.currency}\``,
                '',
                '> اختر فئة لرؤية الإنجازات المفصلة'
            ].join('\n'));

        for (const [key, cat] of Object.entries(categories)) {
            const ownedCount = cat.items.filter(i => i.owned).length;
            const total = cat.items.length;
            if (total === 0) continue;

            const progressBar = '█'.repeat(Math.floor(ownedCount / total * 10)) + '░'.repeat(10 - Math.floor(ownedCount / total * 10));
            embed.addFields({
                name: `${cat.name} [${ownedCount}/${total}]`,
                value: `\`${progressBar}\` ${Math.floor(ownedCount / total * 100)}%`,
                inline: true
            });
        }

        const rows = [];
        const buttons = Object.entries(categories)
            .filter(([, cat]) => cat.items.length > 0)
            .map(([key, cat]) =>
                new ButtonBuilder()
                    .setCustomId(`ach_cat_${key}_${target.id}`)
                    .setLabel(cat.name)
                    .setStyle(ButtonStyle.Secondary)
            );

        // تقسيم الأزرار على صفوف (5 لكل صف)
        for (let i = 0; i < buttons.length; i += 5) {
            rows.push(new ActionRowBuilder().addComponents(buttons.slice(i, i + 5)));
        }

        const reply = await message.reply({ embeds: [embed], components: rows });

        const collector = reply.createMessageComponentCollector({ time: 60000 });
        collector.on('collect', async (interaction) => {
            if (interaction.user.id !== message.author.id) {
                return interaction.reply({ content: '❌ ليس لك', flags: MessageFlags.Ephemeral });
            }

            const parts = interaction.customId.split('_');
            const catKey = parts[2];
            const cat = categories[catKey];
            if (!cat) return;

            const catEmbed = new EmbedBuilder()
                .setColor('#9B59B6')
                .setTitle(`${cat.name} — إنجازات ${target.username}`)
                .setDescription(
                    cat.items.map(item =>
                        `${item.owned ? '✅' : '❌'} **${item.name}**\n> ${item.desc}${item.reward > 0 ? ` • \`+${item.reward.toLocaleString()} ${config.currency}\`` : ''}`
                    ).join('\n\n') || '*لا توجد إنجازات في هذه الفئة*'
                );

            await interaction.update({ embeds: [catEmbed], components: rows });
        });
    }
};
