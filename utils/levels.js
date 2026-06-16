'use strict';

const { EmbedBuilder } = require('discord.js');
const db = require('./database');
const config = require('../config');

// حساب XP المطلوب للمستوى التالي
function getXPForLevel(level) {
    return Math.floor(100 * Math.pow(1.5, level - 1));
}

// حساب المستوى من XP الكلي
function getLevelFromXP(xp) {
    let level = 1;
    let accumulated = 0;
    while (true) {
        const needed = getXPForLevel(level);
        if (accumulated + needed > xp) break;
        accumulated += needed;
        level++;
    }
    return level;
}

// إضافة XP للمستخدم
function addXP(userId, amount, message = null) {
    const userData = db.getUserData(userId);
    const oldLevel = userData.level || 1;

    userData.xp = (userData.xp || 0) + amount;
    const newLevel = getLevelFromXP(userData.xp);
    let reward = 0;

    if (newLevel > oldLevel) {
        userData.level = newLevel;

        // مكافأة Level Up متدرجة
        reward = config.levelUpReward;
        if (newLevel % 5 === 0) reward += 1000;
        if (newLevel % 10 === 0) reward += config.bigLevelReward;

        userData.balance = (userData.balance || 0) + reward;

        // إشعار Level Up في القناة
        if (message?.channel) {
            const levelUpEmbed = new EmbedBuilder()
                .setColor('#FFD700')
                .setTitle('🎉 ترقية مستوى!')
                .setDescription(`تهانينا ${message.author}! وصلت إلى **المستوى ${newLevel}**!`)
                .addFields(
                    { name: 'المكافأة', value: `${reward} ${config.currency}`, inline: true },
                    { name: 'XP الكلي', value: `${userData.xp}`, inline: true }
                )
                .setThumbnail(message.author.displayAvatarURL())
                .setTimestamp();

            message.channel.send({ embeds: [levelUpEmbed] }).catch(() => { });
        }
    }

    db.updateUserData(userId, userData);
    return { leveledUp: newLevel > oldLevel, newLevel, oldLevel, reward };
}

// الحصول على تقدم المستوى
function getLevelProgress(userId) {
    const userData = db.getUserData(userId);
    const currentLevel = userData.level || 1;
    const currentXP = userData.xp || 0;

    let xpForCurrentLevel = 0;
    for (let i = 1; i < currentLevel; i++) {
        xpForCurrentLevel += getXPForLevel(i);
    }

    const requiredXP = getXPForLevel(currentLevel);
    const progressXP = currentXP - xpForCurrentLevel;
    const percentage = Math.min(100, Math.floor((progressXP / requiredXP) * 100));

    return {
        level: currentLevel,
        currentLevel,
        currentXP,
        progressXP,
        requiredXP,
        percentage,
        nextLevel: currentLevel + 1,
    };
}

// إنشاء progress bar نصي
function createProgressBar(percentage, length = 10) {
    const filled = Math.round((percentage / 100) * length);
    return '█'.repeat(Math.max(0, filled)) + '░'.repeat(Math.max(0, length - filled));
}

// الحصول على رتبة المستخدم (async لأن بعض الأوامر تستخدم .then()/.catch())
async function getUserRank(userId) {
    const allUsers = db.loadDatabase().users;
    const sorted = Object.entries(allUsers)
        .map(([id, data]) => ({ id, xp: data.xp || 0 }))
        .sort((a, b) => b.xp - a.xp);

    const rank = sorted.findIndex(u => u.id === userId) + 1;
    return rank || 'غير مصنف';
}

module.exports = {
    getXPForLevel,
    getLevelFromXP,
    addXP,
    getLevelProgress,
    createProgressBar,
    getUserRank,
};
