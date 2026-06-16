'use strict';

/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║   📅 DAILY CHALLENGES v1.0 — نظام التحديات اليومية الذكي  ║
 * ║   3 تحديات يومية متجددة مع مكافآت XP وعملات               ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

const fs = require('fs');
const path = require('path');
const db = require('./database');

const CHALLENGES_FILE = path.join(__dirname, '../data/daily-challenges.json');

let _data = null;
let _dirty = false;

function _load() {
    if (_data) return _data;
    try {
        if (fs.existsSync(CHALLENGES_FILE)) {
            _data = JSON.parse(fs.readFileSync(CHALLENGES_FILE, 'utf8'));
        }
    } catch { }
    if (!_data) _data = { dailyChallenges: {}, userProgress: {}, lastReset: 0 };
    return _data;
}

function _flush() {
    if (!_dirty) return;
    try {
        const dir = path.dirname(CHALLENGES_FILE);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(CHALLENGES_FILE, JSON.stringify(_data, null, 2));
        _dirty = false;
    } catch { }
}

setInterval(_flush, 60_000).unref?.();
process.on('SIGINT', _flush);
process.on('SIGTERM', _flush);

// ─── بنك التحديات ──────────────────────────────────────────────────────────
const CHALLENGE_BANK = [
    { id: 'send_10', name: 'المتحدث النشيط', desc: 'أرسل 10 رسائل في السيرفر', target: 10, type: 'messages', xp: 50, coins: 200, emoji: '💬' },
    { id: 'send_25', name: 'الكاتب الماهر', desc: 'أرسل 25 رسالة في السيرفر', target: 25, type: 'messages', xp: 100, coins: 400, emoji: '✍️' },
    { id: 'win_game', name: 'الفائز الأول', desc: 'اربح لعبة واحدة', target: 1, type: 'game_wins', xp: 75, coins: 300, emoji: '🏆' },
    { id: 'win_3games', name: 'البطل المتسلسل', desc: 'اربح 3 ألعاب', target: 3, type: 'game_wins', xp: 150, coins: 600, emoji: '⚔️' },
    { id: 'work_once', name: 'العامل المثالي', desc: 'اعمل مرة واحدة', target: 1, type: 'work', xp: 40, coins: 150, emoji: '💼' },
    { id: 'work_3times', name: 'الكادح المجتهد', desc: 'اعمل 3 مرات', target: 3, type: 'work', xp: 100, coins: 400, emoji: '🏗️' },
    { id: 'daily_claim', name: 'الملتزم اليومي', desc: 'اطلب مكافأتك اليومية', target: 1, type: 'daily', xp: 30, coins: 100, emoji: '📅' },
    { id: 'buy_item', name: 'المتسوق الذكي', desc: 'اشترِ أي عنصر من المتجر', target: 1, type: 'purchase', xp: 60, coins: 250, emoji: '🛒' },
    { id: 'give_rep', name: 'الداعم الاجتماعي', desc: 'امنح سمعة لعضو آخر', target: 1, type: 'reputation_given', xp: 50, coins: 200, emoji: '🌟' },
    { id: 'invest_once', name: 'المستثمر الذكي', desc: 'استثمر أموالاً في البنك', target: 1, type: 'investment', xp: 80, coins: 350, emoji: '📈' },
    { id: 'create_poll', name: 'الديمقراطي', desc: 'أنشئ استطلاع رأي', target: 1, type: 'poll', xp: 45, coins: 175, emoji: '🗳️' },
    { id: 'play_trivia', name: 'عقل نابض', desc: 'العب تريفيا مرة واحدة', target: 1, type: 'trivia', xp: 70, coins: 280, emoji: '🧠' },
    { id: 'join_voice', name: 'الصوت الواضح', desc: 'انضم لأي قناة صوتية', target: 1, type: 'voice', xp: 35, coins: 150, emoji: '🎤' },
    { id: 'earn_1000', name: 'الكاسب اليوم', desc: 'اكسب 1000 عملة خلال اليوم', target: 1000, type: 'earned', xp: 120, coins: 500, emoji: '💰' },
    { id: 'chat_bot', name: 'محاور الذكاء', desc: 'تحدث مع البوت الذكي 5 مرات', target: 5, type: 'ai_chat', xp: 65, coins: 260, emoji: '🤖' },
];

// ─── اختيار 3 تحديات يومية عشوائية ─────────────────────────────────────────
function getDailyChallenges(date = null) {
    const today = date || new Date().toDateString();
    const data = _load();

    // إذا تغير اليوم، أعد توليد التحديات
    if (data.lastResetDate !== today) {
        const shuffled = [...CHALLENGE_BANK].sort(() => Math.random() - 0.5);
        data.dailyChallenges = {
            date: today,
            challenges: shuffled.slice(0, 3),
        };
        data.lastResetDate = today;
        data.userProgress = {}; // إعادة التقدم لجميع المستخدمين
        _dirty = true;
    }

    return data.dailyChallenges.challenges || [];
}

// ─── الحصول على تقدم مستخدم ──────────────────────────────────────────────
function getUserProgress(userId) {
    const data = _load();
    const today = new Date().toDateString();

    if (!data.userProgress[userId] || data.userProgress[userId].date !== today) {
        const challenges = getDailyChallenges();
        data.userProgress[userId] = {
            date: today,
            progress: {},
            completed: [],
        };
        for (const ch of challenges) {
            data.userProgress[userId].progress[ch.id] = 0;
        }
        _dirty = true;
    }

    return data.userProgress[userId];
}

// ─── تحديث التقدم ────────────────────────────────────────────────────────
async function updateProgress(userId, type, amount = 1, message = null) {
    const today = new Date().toDateString();
    const challenges = getDailyChallenges(today);
    const progress = getUserProgress(userId);

    let earnedRewards = [];

    for (const ch of challenges) {
        if (ch.type !== type) continue;
        if (progress.completed.includes(ch.id)) continue;

        progress.progress[ch.id] = (progress.progress[ch.id] || 0) + amount;

        if (progress.progress[ch.id] >= ch.target) {
            // تحديث مكتمل!
            progress.completed.push(ch.id);
            earnedRewards.push(ch);

            // منح المكافآت
            db.addMoney(userId, ch.coins);
            db.addTransaction(userId, 'challenge_reward', ch.coins, `تحدي: ${ch.name}`);

            // XP
            const { EmbedBuilder } = require('discord.js');
            const levels = require('./levels');
            if (message?.channel) {
                await levels.addXP(userId, ch.xp, message).catch(() => {});
            }

            // إشعار المستخدم
            if (message?.channel) {
                const embed = new EmbedBuilder()
                    .setColor('#FFD700')
                    .setTitle(`${ch.emoji} تحدي مكتمل!`)
                    .setDescription([
                        `> **${ch.name}** — ${ch.desc}`,
                        '',
                        `🎁 **المكافأة:** \`${ch.coins.toLocaleString()}\` 💰 + \`${ch.xp}\` XP`,
                    ].join('\n'))
                    .setTimestamp();

                message.channel.send({ content: `<@${userId}>`, embeds: [embed] }).catch(() => {});
            }
        }
    }

    _dirty = true;
    return earnedRewards;
}

// ─── عرض التحديات ────────────────────────────────────────────────────────
function buildChallengesEmbed(userId) {
    const { EmbedBuilder } = require('discord.js');
    const challenges = getDailyChallenges();
    const progress = getUserProgress(userId);
    const allCompleted = progress.completed.length === challenges.length;

    const embed = new EmbedBuilder()
        .setColor(allCompleted ? '#FFD700' : '#9B59B6')
        .setTitle('📅 التحديات اليومية')
        .setDescription([
            allCompleted
                ? '> 🏆 **أكملت جميع تحديات اليوم! أحسنت!**'
                : `> 🎯 **أكمل التحديات للحصول على مكافآت يومية!**`,
            `> 🔄 **تتجدد في:** <t:${Math.floor(getNextResetTime() / 1000)}:R>`,
        ].join('\n'))
        .setTimestamp();

    for (const ch of challenges) {
        const current = progress.progress[ch.id] || 0;
        const done = progress.completed.includes(ch.id);
        const pct = Math.min(100, Math.floor((current / ch.target) * 100));
        const bar = '█'.repeat(Math.floor(pct / 10)) + '░'.repeat(10 - Math.floor(pct / 10));

        embed.addFields({
            name: `${done ? '✅' : ch.emoji} ${ch.name}`,
            value: [
                `> ${ch.desc}`,
                done
                    ? '> **✅ مكتمل!**'
                    : `> \`[${bar}]\` ${current}/${ch.target} (${pct}%)`,
                `> 🎁 \`${ch.coins}\` 💰 + \`${ch.xp}\` XP`,
            ].join('\n'),
            inline: false,
        });
    }

    // إجمالي المكافآت
    const totalCoins = challenges.reduce((s, c) => s + c.coins, 0);
    const totalXP = challenges.reduce((s, c) => s + c.xp, 0);
    embed.addFields({
        name: '🏆 إجمالي مكافآت اليوم',
        value: `> 💰 **${totalCoins.toLocaleString()}** عملة + **${totalXP}** XP`,
        inline: false,
    });

    return embed;
}

// ─── وقت الإعادة الجديدة ────────────────────────────────────────────────
function getNextResetTime() {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    return tomorrow.getTime();
}

// ─── إحصائيات ─────────────────────────────────────────────────────────────
function getStats(userId) {
    const data = _load();
    const progress = getUserProgress(userId);
    return {
        completed: progress.completed.length,
        total: getDailyChallenges().length,
        todayCoins: progress.completed.reduce((s, id) => {
            const ch = CHALLENGE_BANK.find(c => c.id === id);
            return s + (ch?.coins || 0);
        }, 0),
    };
}

module.exports = {
    getDailyChallenges,
    getUserProgress,
    updateProgress,
    buildChallengesEmbed,
    getNextResetTime,
    getStats,
    CHALLENGE_BANK,
};
