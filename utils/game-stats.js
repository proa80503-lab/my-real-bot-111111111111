'use strict';

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║  🎮 GAME STATS v2.0 — نظام إحصائيات الألعاب المتقدم                   ║
 * ║  يتكامل مع db.js لتتبع XP، إنجازات، ومكافآت الألعاب                  ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

const db = require('../../utils/database');
const config = require('../../config');
const { EmbedBuilder } = require('discord.js');

// ─── XP Rewards per game ──────────────────────────────────────────────────────
const GAME_XP = {
    ttt:       { play: 5, win: 15 },
    rps:       { play: 3, win: 10 },
    trivia:    { play: 8, win: 25 },
    hangman:   { play: 5, win: 18 },
    math:      { play: 6, win: 20 },
    memory:    { play: 7, win: 22 },
    wordguess: { play: 8, win: 25 },
    casino:    { play: 2, win: 5  },
};

// ─── تسجيل نتيجة لعبة ────────────────────────────────────────────────────────
function recordGameResult(userId, gameType, won = false, wagered = 0, wonAmount = 0) {
    const user = db.getUserData(userId);
    const rewards = GAME_XP[gameType] || { play: 3, win: 8 };

    const xpGain = won ? rewards.win : rewards.play;
    const newXp    = (user.xp || 0) + xpGain;
    const newLevel = Math.floor(Math.sqrt(newXp / 100)) + 1;
    const leveledUp = newLevel > (user.level || 1);

    // تحديث الإحصائيات
    const stats = user.stats || {};
    const updates = {
        xp: newXp,
        level: newLevel,
        stats: {
            ...stats,
            gamesPlayed:  (stats.gamesPlayed  || 0) + 1,
            gamesWon:     (stats.gamesWon     || 0) + (won ? 1 : 0),
            totalWagered: (stats.totalWagered || 0) + wagered,
            totalWon:     (stats.totalWon     || 0) + wonAmount,
            biggestWin:   Math.max(stats.biggestWin || 0, wonAmount),
        }
    };

    // مكافأة مستوى جديد
    if (leveledUp) {
        const reward = newLevel % 10 === 0 ? config.bigLevelReward : config.levelUpReward;
        db.addMoney(userId, reward);
        updates.levelUpReward = reward;
    }

    db.updateUserData(userId, updates);

    return { xpGain, newXp, newLevel, leveledUp, levelUpReward: updates.levelUpReward };
}

// ─── بناء Embed نتيجة اللعبة ──────────────────────────────────────────────────
function buildResultEmbed(result, playerName, gameEmoji = '🎮') {
    const { xpGain, newLevel, leveledUp, levelUpReward } = result;

    const embed = new EmbedBuilder()
        .setColor(leveledUp ? '#FFD700' : '#5865F2')
        .setFooter({ text: `${gameEmoji} +${xpGain} XP | المستوى ${newLevel}` });

    if (leveledUp) {
        embed.addFields({
            name: '🎉 مبروك! ارتقيت مستوى!',
            value: `> **${playerName}** وصل للمستوى **${newLevel}**!\n> 💰 مكافأة: **${levelUpReward?.toLocaleString() || 0}** ${config.currency}`,
            inline: false
        });
    }

    return embed;
}

// ─── حساب المستوى من XP ───────────────────────────────────────────────────────
function levelFromXP(xp) {
    return Math.floor(Math.sqrt(xp / 100)) + 1;
}

function xpForLevel(level) {
    return Math.pow(level - 1, 2) * 100;
}

function xpProgress(xp) {
    const level      = levelFromXP(xp);
    const currentXP  = xp - xpForLevel(level);
    const neededXP   = xpForLevel(level + 1) - xpForLevel(level);
    const percentage = Math.floor((currentXP / neededXP) * 100);
    return { level, currentXP, neededXP, percentage };
}

module.exports = { recordGameResult, buildResultEmbed, levelFromXP, xpForLevel, xpProgress, GAME_XP };
