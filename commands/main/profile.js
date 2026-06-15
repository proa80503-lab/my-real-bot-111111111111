/**
 * 👤 Profile Command — بأزرار تنقل احترافية
 */

'use strict';

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const db = require('../../utils/database');
const levels = require('../../utils/levels');
const config = require('../../config');

function progressBar(pct, size = 12) {
    const filled = Math.round(Math.min(pct / 100, 1) * size);
    return '█'.repeat(filled) + '░'.repeat(size - filled);
}

async function buildProfileEmbed(target, guild) {
    const userData = db.getUserData(target.id);
    const lvlInfo = levels.getLevelProgress(target.id);
    const rank = await levels.getUserRank(target.id).catch(() => '?');
    const stats = userData.stats || {};
    const balance = userData.balance || 0;
    const bank = userData.bank || 0;
    const totalWealth = balance + bank;
    const winRate = stats.gamesPlayed > 0
        ? ((stats.gamesWon / stats.gamesPlayed) * 100).toFixed(1)
        : '0.0';

    const vipTag = userData.vipBadge ? ' 👑 VIP' : '';
    const robImmune = userData.robImmunity ? ' ⚔️ محمي' : '';
    const streak = userData.dailyStreak || 0;
    const streakEmoji = streak >= 30 ? '🔥🔥🔥' : streak >= 7 ? '🔥🔥' : streak >= 3 ? '🔥' : '';

    const embed = new EmbedBuilder()
        .setColor(userData.profileColor || '#9B59B6')
        .setAuthor({ name: `${target.tag}${vipTag}${robImmune}`, iconURL: target.displayAvatarURL() })
        .setThumbnail(target.displayAvatarURL({ size: 256 }))
        .setDescription([
            `💰 **الثروة:** \`${totalWealth.toLocaleString()} ${config.currency}\``,
            `🏦 محفظة: \`${balance.toLocaleString()}\` | بنك: \`${bank.toLocaleString()}\``,
        ].join('\n'))
        .addFields(
            {
                name: `⭐ المستوى ${lvlInfo.level}`,
                value: `${progressBar(lvlInfo.percentage)} **${lvlInfo.percentage}%**\n${lvlInfo.progressXP}/${lvlInfo.requiredXP} XP | الترتيب: **#${rank}**`,
                inline: false
            },
            { name: '🔥 Daily Streak', value: `${streak} يوم ${streakEmoji}`, inline: true },
            { name: '🎮 ألعاب', value: `${stats.gamesPlayed || 0} مباراة | فوز ${winRate}%`, inline: true },
            { name: '🏆 أكبر فوز', value: `${(stats.biggestWin || 0).toLocaleString()} ${config.currency}`, inline: true }
        )
        .setFooter({ text: `ID: ${target.id}` })
        .setTimestamp();

    // عناصر المتجر النشطة
    const now = Date.now();
    const invLines = [];
    const inv = userData.inventory || {};
    for (const [id, data] of Object.entries(inv)) {
        if (data?.expiresAt && now < data.expiresAt) {
            const h = Math.ceil((data.expiresAt - now) / 3600000);
            invLines.push(`• ${id} — ⏳${h}س`);
        }
    }
    if (userData.robImmunity) invLines.push('• مناعة السرقة ♾️');
    if (userData.vipBadge) invLines.push('• شارة VIP ♾️');
    if (invLines.length > 0) {
        embed.addFields({ name: '🎒 المشتريات النشطة', value: invLines.slice(0, 5).join('\n'), inline: false });
    }

    return embed;
}

module.exports = {
    name: 'profile',
    aliases: ['بروفايل', 'ملفي', 'prof'],
    description: 'الملف الشخصي الكامل',
    usage: 'profile [@user]',

    async execute(context, args) {
        const isInteraction = context.isCommand?.() || context.isButton?.();
        const author = isInteraction ? context.user : context.author;
        if (!author) return;

        const target = (context.mentions?.users?.first()) ||
            (isInteraction ? (context.options?.getUser?.('user') || null) : null) ||
            author;

        const embed = await buildProfileEmbed(target, context.guild);

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`prof_refresh_${target.id}`)
                .setLabel('🔄 تحديث')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('eco_refresh')
                .setLabel('💰 محفظتي')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('shop_page_tools')
                .setLabel('🛒 المتجر')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('game_trivia')
                .setLabel('🎮 العاب')
                .setStyle(ButtonStyle.Success)
        );

        if (isInteraction) return context.reply({ embeds: [embed], components: [row] });
        return context.reply({ embeds: [embed], components: [row] });
    }
};
