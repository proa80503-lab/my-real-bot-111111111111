'use strict';

/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║   ⭐ REPUTATION SYSTEM v1.0 — نظام السمعة الاحترافي        ║
 * ║   +rep لكل 24 ساعة | يؤثر على البنك والحظ والشارات         ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require('../../utils/database');
const dailyChallenges = require('../../utils/daily-challenges');

const REP_COOLDOWN = 24 * 60 * 60 * 1000; // 24 ساعة

// ─── شارات السمعة ──────────────────────────────────────────────────────────
const REP_BADGES = [
    { min: 0,   badge: '🆕', title: 'وجه جديد' },
    { min: 5,   badge: '⭐', title: 'موثوق' },
    { min: 15,  badge: '🌟', title: 'محترم' },
    { min: 30,  badge: '💫', title: 'مميز' },
    { min: 50,  badge: '✨', title: 'نجم السيرفر' },
    { min: 100, badge: '👑', title: 'أسطورة السيرفر' },
    { min: 200, badge: '🏆', title: 'بطل لا يُنسى' },
];

function getRepBadge(rep) {
    const sorted = [...REP_BADGES].reverse();
    return sorted.find(b => rep >= b.min) || REP_BADGES[0];
}

// ─── منح سمعة ────────────────────────────────────────────────────────────
async function giveRep(message, targetUser) {
    if (!targetUser || targetUser.bot) {
        return message.reply('❌ لا يمكن منح سمعة للبوتات!');
    }

    if (targetUser.id === message.author.id) {
        return message.reply('❌ لا يمكنك منح سمعة لنفسك! 😅');
    }

    const senderData = db.getUserData(message.author.id);
    const now = Date.now();

    // فحص الكولداون
    const lastRep = senderData.lastRep || {};
    const lastRepToTarget = lastRep[targetUser.id] || 0;
    if (now - lastRepToTarget < REP_COOLDOWN) {
        const remaining = REP_COOLDOWN - (now - lastRepToTarget);
        const hours = Math.floor(remaining / 3600000);
        const mins = Math.floor((remaining % 3600000) / 60000);

        const embed = new EmbedBuilder()
            .setColor('#FF8C00')
            .setTitle('⏰ كولداون السمعة')
            .setDescription([
                `> لقد أعطيت سمعة لـ **${targetUser.displayName}** منذ فترة قريبة`,
                `> ⏱️ انتظر **${hours} ساعة ${mins} دقيقة** أخرى`,
            ].join('\n'))
            .setTimestamp();
        return message.reply({ embeds: [embed] });
    }

    // تحديث بيانات المستقبِل
    const targetData = db.getUserData(targetUser.id);
    if (!targetData.reputation) targetData.reputation = 0;
    targetData.reputation++;
    db.updateUserData(targetUser.id, { reputation: targetData.reputation });

    // تحديث الكولداون
    if (!senderData.lastRep) senderData.lastRep = {};
    senderData.lastRep[targetUser.id] = now;
    db.updateUserData(message.author.id, { lastRep: senderData.lastRep });

    // مكافأة المستقبِل
    const bonusCoins = 100;
    db.addMoney(targetUser.id, bonusCoins);
    db.addTransaction(targetUser.id, 'rep_received', bonusCoins, `سمعة من ${message.author.tag}`);

    // إحصائيات السمعة
    const newRep = targetData.reputation;
    const badge = getRepBadge(newRep);
    const prevBadge = getRepBadge(newRep - 1);
    const levelUp = badge.badge !== prevBadge.badge;

    // تحديث التحديات
    await dailyChallenges.updateProgress(message.author.id, 'reputation_given', 1, message);

    const embed = new EmbedBuilder()
        .setColor('#FFD700')
        .setTitle('⭐ سمعة ممنوحة!')
        .setDescription([
            `> ${message.author} منح سمعة لـ ${targetUser}`,
            `> ⭐ **سمعة ${targetUser.displayName} الجديدة:** \`${newRep}\` نقطة`,
            `> ${badge.badge} **الشارة:** ${badge.title}`,
            `> 💰 **مكافأة:** \`${bonusCoins}\` 💰 لـ ${targetUser.displayName}`,
        ].join('\n'))
        .setThumbnail(targetUser.displayAvatarURL())
        .setTimestamp();

    if (levelUp) {
        embed.addFields({
            name: '🎉 ترقية في الشارة!',
            value: `> ${prevBadge.badge} → ${badge.badge} **${badge.title}**`,
        });
    }

    await message.reply({ embeds: [embed] });
}

// ─── عرض سمعة مستخدم ────────────────────────────────────────────────────
async function showReputation(message, targetUser) {
    const target = targetUser || message.author;
    const userData = db.getUserData(target.id);
    const rep = userData.reputation || 0;
    const badge = getRepBadge(rep);

    // تحديد الشارة التالية
    const nextBadge = REP_BADGES.find(b => b.min > rep);

    const embed = new EmbedBuilder()
        .setColor('#FFD700')
        .setTitle(`${badge.badge} سمعة ${target.displayName}`)
        .addFields(
            { name: '⭐ السمعة', value: `\`${rep}\` نقطة`, inline: true },
            { name: `${badge.badge} الشارة`, value: badge.title, inline: true },
        );

    if (nextBadge) {
        const needed = nextBadge.min - rep;
        embed.addFields({
            name: `📈 الشارة التالية`,
            value: `${nextBadge.badge} ${nextBadge.title} — بعد **${needed}** نقطة`,
            inline: false,
        });
    }

    embed
        .addFields({
            name: '📊 تأثير السمعة',
            value: [
                `💰 فائدة قرض أفضل: ${rep >= 50 ? '✅ نعم (-2%)' : '❌ بعد 50 سمعة'}`,
                `🎰 حظ أفضل في الألعاب: ${rep >= 30 ? '✅ نعم (+5%)' : '❌ بعد 30 سمعة'}`,
                `👑 شارة خاصة في البروفايل: ${rep >= 15 ? '✅ نعم' : '❌ بعد 15 سمعة'}`,
            ].join('\n'),
            inline: false,
        })
        .setThumbnail(target.displayAvatarURL())
        .setTimestamp();

    return message.reply({ embeds: [embed] });
}

// ─── لوحة صدارة السمعة ──────────────────────────────────────────────────
async function repLeaderboard(message) {
    const allUsers = db.getAllUsers() || {};
    const ranked = Object.entries(allUsers)
        .filter(([, u]) => u.reputation > 0)
        .sort(([, a], [, b]) => (b.reputation || 0) - (a.reputation || 0))
        .slice(0, 10);

    if (ranked.length === 0) {
        return message.reply('📊 لا يوجد تقييمات سمعة بعد! ابدأ بـ `rep @شخص`');
    }

    const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];

    const embed = new EmbedBuilder()
        .setColor('#FFD700')
        .setTitle('⭐ لوحة صدارة السمعة')
        .setDescription('> أكثر الأعضاء ثقة ومحبة في السيرفر!')
        .setTimestamp();

    const lines = ranked.map(([id, u], i) => {
        const rep = u.reputation || 0;
        const badge = getRepBadge(rep);
        return `${medals[i]} <@${id}> — \`${rep}\` نقطة ${badge.badge}`;
    }).join('\n');

    embed.addFields({ name: '🏆 أفضل 10 أعضاء', value: lines });

    return message.reply({ embeds: [embed] });
}

module.exports = {
    name: 'reputation',
    aliases: ['rep', 'سمعة', '+rep', 'سمعه'],
    description: 'نظام السمعة',
    category: 'اجتماعي',

    async execute(message, args) {
        const content = message.content.toLowerCase().trim();

        // صدارة السمعة
        if (content === 'صدارة سمعة' || content === 'rep leaderboard') {
            return repLeaderboard(message);
        }

        // عرض سمعة المنشن
        const mentioned = message.mentions.users.first();

        // اكتب سمعة بدون منشن = سمعة نفسك
        if (!mentioned) {
            return showReputation(message, null);
        }

        // إذا كتب rep أو سمعة مع منشن
        if (content.startsWith('rep ') || content.startsWith('سمعة ') || content.startsWith('+rep')) {
            // منح سمعة أو عرضها
            if (content.startsWith('+rep') || content.startsWith('rep ') && !content.includes('سمعة')) {
                return giveRep(message, mentioned);
            }
        }

        return showReputation(message, mentioned);
    },

    // أوامر فرعية
    giveRep,
    showReputation,
    repLeaderboard,
    getRepBadge,
};
