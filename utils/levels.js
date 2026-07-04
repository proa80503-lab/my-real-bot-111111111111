'use strict';

const db = require('./database');
const config = require('../config');
const { EmbedBuilder } = require('discord.js');

// ─── حساب XP المطلوب للمستوى التالي (منحنى تدريجي) ─────────────────────────
function getXPForLevel(level) {
    return Math.floor(100 * Math.pow(1.5, level - 1));
}

// ─── حساب المستوى من XP الكلي ────────────────────────────────────────────────
function getLevelFromXP(totalXP) {
    let level = 1;
    let accumulated = 0;
    while (true) {
        const needed = getXPForLevel(level);
        if (accumulated + needed > totalXP) break;
        accumulated += needed;
        level++;
    }
    return level;
}

// ─── إضافة XP للمستخدم ──────────────────────────────────────────────────────
// إصلاح: يستخدم updateFields بدل updateUserData لتجنب الكتابة الزائدة
function addXP(userId, amount, message = null) {
    const userData = db.getUserData(userId);
    const oldLevel = userData.level || 1;
    const newXP = (userData.xp || 0) + amount;
    const newLevel = getLevelFromXP(newXP);

    // حقول التحديث الأساسية
    const updates = { xp: newXP };
    let reward = 0;

    if (newLevel > oldLevel) {
        updates.level = newLevel;

        // مكافأة ترقية متدرجة
        reward = config.levelUpReward || 500;
        if (newLevel % 5 === 0) reward += 1000;
        if (newLevel % 10 === 0) reward += config.bigLevelReward || 2000;

        // إضافة المكافأة للرصيد
        const currentBalance = userData.balance || 0;
        updates.balance = currentBalance + reward;

        // إشعار المستوى في القناة
        if (message?.channel) {
            const lvlEmbed = new EmbedBuilder()
                .setColor('#FFD700')
                .setTitle('🎉 ترقية مستوى!')
                .setDescription(
                    [
                        `> تهانينا ${message.author}! وصلت إلى **المستوى ${newLevel}**!`,
                        `> 🎁 مكافأة الترقية: **${reward.toLocaleString()} ${config.currency}**`,
                    ].join('\n')
                )
                .addFields(
                    { name: '⭐ XP الكلي', value: `${newXP.toLocaleString()}`, inline: true },
                    { name: '🏆 المستوى الجديد', value: `${newLevel}`, inline: true }
                )
                .setThumbnail(message.author.displayAvatarURL())
                .setTimestamp();

            message.channel.send({ embeds: [lvlEmbed] }).catch(() => {});
        }
    }

    // حفظ حقول محددة فقط — لا يُعيد كتابة الكائن كله
    db.updateFields(userId, updates);

    return {
        leveledUp: newLevel > oldLevel,
        newLevel,
        oldLevel,
        reward,
        newXP,
    };
}

// ─── الحصول على تقدم المستوى ──────────────────────────────────────────────────
function getLevelProgress(userId) {
    const userData = db.getUserData(userId);
    const currentLevel = userData.level || 1;
    const currentXP = userData.xp || 0;

    // XP المتراكم حتى المستوى الحالي
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

// ─── شريط التقدم النصي ───────────────────────────────────────────────────────
function createProgressBar(percentage, length = 10) {
    const filled = Math.max(0, Math.round((percentage / 100) * length));
    const empty = Math.max(0, length - filled);
    return '█'.repeat(filled) + '░'.repeat(empty);
}

// ─── رتبة المستخدم عالمياً ────────────────────────────────────────────────────
async function getUserRank(userId) {
    const allUsers = db.loadDatabase().users;
    const sorted = Object.entries(allUsers)
        .map(([id, data]) => ({ id, xp: data.xp || 0 }))
        .sort((a, b) => b.xp - a.xp);

    const rank = sorted.findIndex((u) => u.id === userId) + 1;
    return rank > 0 ? rank : null;
}

module.exports = {
    getXPForLevel,
    getLevelFromXP,
    addXP,
    getLevelProgress,
    createProgressBar,
    getUserRank,
};
