const db = require('./database');
const config = require('../config');

// قائمة الإنجازات
const ACHIEVEMENTS = {
    // إنجازات الألعاب
    first_win: {
        id: 'first_win',
        name: 'الفوز الأول',
        description: 'فز في أول لعبة',
        emoji: '🎮',
        reward: 500,
        check: (userData) => userData.stats.gamesWon >= 1
    },
    game_master: {
        id: 'game_master',
        name: 'خبير الألعاب',
        description: 'العب 100 لعبة',
        emoji: '🏆',
        reward: 2000,
        check: (userData) => userData.stats.gamesPlayed >= 100
    },
    lucky_streak: {
        id: 'lucky_streak',
        name: 'الحظ السعيد',
        description: 'فز في 10 ألعاب متتالية',
        emoji: '🍀',
        reward: 3000,
        check: (userData) => userData.stats.winStreak >= 10
    },

    // إنجازات المال
    millionaire: {
        id: 'millionaire',
        name: 'المليونير',
        description: 'امتلك 1,000,000 💰',
        emoji: '💎',
        reward: 10000,
        check: (userData) => (userData.balance + userData.bank) >= 1000000
    },
    big_win: {
        id: 'big_win',
        name: 'الربح الكبير',
        description: 'اربح 50,000 💰 في لعبة واحدة',
        emoji: '💰',
        reward: 5000,
        check: (userData) => userData.stats.biggestWin >= 50000
    },
    high_roller: {
        id: 'high_roller',
        name: 'مقامر محترف',
        description: 'راهن بمجموع 500,000 💰',
        emoji: '🎰',
        reward: 8000,
        check: (userData) => userData.stats.totalWagered >= 500000
    },

    // إنجازات Daily
    daily_warrior: {
        id: 'daily_warrior',
        name: 'المحارب اليومي',
        description: '30 يوم متتالي من المكافآت',
        emoji: '⚔️',
        reward: 15000,
        check: (userData) => userData.dailyStreak >= 30
    },
    week_streak: {
        id: 'week_streak',
        name: 'أسبوع كامل',
        description: '7 أيام متتالية',
        emoji: '📅',
        reward: 3000,
        check: (userData) => userData.dailyStreak >= 7
    },

    // إنجازات المستويات
    level_10: {
        id: 'level_10',
        name: 'مستوى 10',
        description: 'وصل للمستوى 10',
        emoji: '🔟',
        reward: 2000,
        check: (userData) => userData.level >= 10
    },
    level_25: {
        id: 'level_25',
        name: 'مستوى 25',
        description: 'وصل للمستوى 25',
        emoji: '⭐',
        reward: 5000,
        check: (userData) => userData.level >= 25
    },
    level_50: {
        id: 'level_50',
        name: 'مستوى 50',
        description: 'وصل للمستوى 50',
        emoji: '👑',
        reward: 20000,
        check: (userData) => userData.level >= 50
    },

    // إنجازات المتجر
    first_purchase: {
        id: 'first_purchase',
        name: 'أول عملية شراء',
        description: 'اشتر أي غرض من المتجر',
        emoji: '🛒',
        reward: 1000,
        check: (userData) => userData.inventory && userData.inventory.length >= 1
    },
    collector: {
        id: 'collector',
        name: 'جامع الأغراض',
        description: 'اشتر 5 أغراض مختلفة',
        emoji: '📦',
        reward: 5000,
        check: (userData) => userData.inventory && userData.inventory.length >= 5
    }
};

// فحص الإنجازات
function checkAchievements(userId, message = null) {
    const userData = db.getUserData(userId);
    const unlockedAchievements = userData.achievements || [];
    const newUnlocks = [];

    for (const [id, achievement] of Object.entries(ACHIEVEMENTS)) {
        // تخطي الإنجازات المفتوحة بالفعل
        if (unlockedAchievements.includes(id)) continue;

        // فحص الشرط
        if (achievement.check(userData)) {
            unlockedAchievements.push(id);
            newUnlocks.push(achievement);

            // إضافة المكافأة
            userData.balance += achievement.reward;

            // إشعار فتح الإنجاز
            if (message) {
                const { EmbedBuilder } = require('discord.js');
                const achievementEmbed = new EmbedBuilder()
                    .setColor('#FFD700')
                    .setTitle('🏆 إنجاز جديد!')
                    .setDescription(`${achievement.emoji} **${achievement.name}**\n${achievement.description}`)
                    .addFields(
                        { name: 'المكافأة', value: `${achievement.reward} ${config.currency}` }
                    )
                    .setThumbnail(message.author.displayAvatarURL())
                    .setTimestamp();

                message.channel.send({ embeds: [achievementEmbed] }).catch(console.error);
            }
        }
    }

    userData.achievements = unlockedAchievements;
    db.updateUserData(userId, userData);

    return newUnlocks;
}

// الحصول على جميع الإنجازات
function getAllAchievements() {
    return ACHIEVEMENTS;
}

// الحصول على إنجازات المستخدم
function getUserAchievements(userId) {
    const userData = db.getUserData(userId);
    const userAchievements = userData.achievements || [];

    const unlocked = [];
    const locked = [];

    for (const [id, achievement] of Object.entries(ACHIEVEMENTS)) {
        if (userAchievements.includes(id)) {
            unlocked.push(achievement);
        } else {
            locked.push(achievement);
        }
    }

    return { unlocked, locked, total: Object.keys(ACHIEVEMENTS).length };
}

// الحصول على نسبة الإكمال
function getCompletionPercentage(userId) {
    const userData = db.getUserData(userId);
    const userAchievements = userData.achievements || [];
    const total = Object.keys(ACHIEVEMENTS).length;

    return Math.floor((userAchievements.length / total) * 100);
}

module.exports = {
    ACHIEVEMENTS,
    checkAchievements,
    getAllAchievements,
    getUserAchievements,
    getCompletionPercentage
};
