'use strict';

/**
 * ═══════════════════════════════════════════════════════════
 * 🏆 لوحة المتصدرين الشاملة — Leaderboard v2
 * • تعمل بالأوامر النصية والتفاعلية
 * • تحديث تلقائي كل 30 دقيقة في قناة الصدارة
 * • تصنيفات: الثروة، المستوى، السمعة
 * ═══════════════════════════════════════════════════════════
 */

const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    MessageFlags
} = require('discord.js');
const db = require('../../utils/database');
const config = require('../../config');

// ─── بناء بيانات المتصدرين ────────────────────────────────
async function buildLeaderboardData(client, guildId) {
    const allUsers = db.getAllUsers() || {};

    // فلترة أعضاء السيرفر فقط (إذا توفر guild)
    let guild = null;
    if (guildId && client) {
        guild = client.guilds.cache.get(guildId);
    }

    const entries = [];
    for (const [id, data] of Object.entries(allUsers)) {
        // تجاهل المستخدمين الذين لا يملكون بيانات
        if (!data) continue;

        // إذا كان هناك guild، نتحقق أن المستخدم عضو فيه
        if (guild) {
            const member = guild.members.cache.get(id);
            if (!member) continue;
        }

        entries.push({
            id,
            wealth: (data.balance || 0) + (data.bank || 0),
            level: data.level || 1,
            xp: data.xp || 0,
            reputation: data.reputation || 0,
            username: null // سيُجلب لاحقاً
        });
    }

    // جلب أسماء المستخدمين للأعلى 10 فقط
    const topWealth = [...entries].sort((a, b) => b.wealth - a.wealth).slice(0, 10);
    const topLevel  = [...entries].sort((a, b) => b.level !== a.level ? b.level - a.level : b.xp - a.xp).slice(0, 10);
    const topRep    = [...entries].sort((a, b) => b.reputation - a.reputation).slice(0, 10);

    // جلب أسماء المستخدمين
    async function fetchNames(list) {
        for (const entry of list) {
            if (!entry.username) {
                try {
                    let member = guild?.members.cache.get(entry.id);
                    if (!member && guild) {
                        member = await guild.members.fetch(entry.id).catch(() => null);
                    }
                    entry.username = member?.displayName
                        || (await client?.users.fetch(entry.id).catch(() => null))?.username
                        || `مستخدم (${entry.id.slice(-4)})`;
                } catch {
                    entry.username = `مستخدم (${entry.id.slice(-4)})`;
                }
            }
        }
    }

    if (client) {
        await fetchNames(topWealth);
        await fetchNames(topLevel);
        await fetchNames(topRep);
    }

    return { topWealth, topLevel, topRep, totalPlayers: entries.length };
}

// ─── بناء Embed الصدارة ───────────────────────────────────
function buildLeaderboardEmbed(data, type = 'all') {
    const { topWealth, topLevel, topRep, totalPlayers } = data;

    const MEDALS = ['🥇', '🥈', '🥉'];
    const getMedal = (i) => MEDALS[i] || `**${i + 1}.**`;

    const embed = new EmbedBuilder()
        .setColor('#FFD700')
        .setTitle('🏆 لوحة المتصدرين')
        .setTimestamp()
        .setFooter({ text: `إجمالي اللاعبين: ${totalPlayers} | يتحدث كل 30 دقيقة` });

    // قائمة الأغنياء
    if (type === 'all' || type === 'wealth') {
        const wealthText = topWealth.length > 0
            ? topWealth.map((u, i) =>
                `${getMedal(i)} **${u.username}** — \`${u.wealth.toLocaleString()} ${config.currency}\``
            ).join('\n')
            : 'لا يوجد لاعبون بعد!';

        embed.addFields({ name: '💰 الأغنى', value: wealthText, inline: false });
    }

    // قائمة المستويات
    if (type === 'all' || type === 'level') {
        const levelText = topLevel.length > 0
            ? topLevel.map((u, i) =>
                `${getMedal(i)} **${u.username}** — المستوى \`${u.level}\` (${u.xp.toLocaleString()} XP)`
            ).join('\n')
            : 'لا يوجد لاعبون بعد!';

        embed.addFields({ name: '📊 أعلى مستوى', value: levelText, inline: false });
    }

    // قائمة السمعة
    if (type === 'all' || type === 'rep') {
        const filteredRep = topRep.filter(u => u.reputation > 0);
        const repText = filteredRep.length > 0
            ? filteredRep.map((u, i) =>
                `${getMedal(i)} **${u.username}** — ⭐ \`${u.reputation.toLocaleString()}\` نقطة`
            ).join('\n')
            : 'لا يوجد سمعة مسجلة بعد!';

        embed.addFields({ name: '⭐ أعلى سمعة', value: repText, inline: false });
    }

    return embed;
}

// ─── أزرار التنقل ─────────────────────────────────────────
function buildLeaderboardButtons(currentType = 'all') {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('lb_all')
            .setLabel('📋 الكل')
            .setStyle(currentType === 'all' ? ButtonStyle.Primary : ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId('lb_wealth')
            .setLabel('💰 الأغنى')
            .setStyle(currentType === 'wealth' ? ButtonStyle.Primary : ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId('lb_level')
            .setLabel('📊 المستوى')
            .setStyle(currentType === 'level' ? ButtonStyle.Primary : ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId('lb_rep')
            .setLabel('⭐ السمعة')
            .setStyle(currentType === 'rep' ? ButtonStyle.Primary : ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId('lb_refresh')
            .setLabel('🔄 تحديث')
            .setStyle(ButtonStyle.Success)
    );
}

// ─── إرسال/تحديث لوحة الصدارة في قناة مخصصة ────────────
async function sendLeaderboardToChannel(channel, client, guildId) {
    try {
        const data = await buildLeaderboardData(client, guildId);
        const embed = buildLeaderboardEmbed(data, 'all');
        const buttons = buildLeaderboardButtons('all');

        // البحث عن الرسالة الأخيرة للبوت في القناة لتحديثها
        const messages = await channel.messages.fetch({ limit: 20 }).catch(() => null);
        if (messages) {
            const lastBotMsg = messages.find(m =>
                m.author.id === channel.client.user.id &&
                m.embeds.length > 0 &&
                m.embeds[0]?.title?.includes('المتصدرين')
            );

            if (lastBotMsg) {
                await lastBotMsg.edit({ embeds: [embed], components: [buttons] }).catch(() => null);
                return lastBotMsg;
            }
        }

        // إرسال رسالة جديدة إذا لم يوجد رسالة سابقة
        return await channel.send({ embeds: [embed], components: [buttons] });
    } catch (err) {
        console.error('[Leaderboard] خطأ في إرسال الصدارة:', err.message);
        return null;
    }
}

// ─── تحديث تلقائي دوري ───────────────────────────────────
let _autoUpdateInterval = null;

function startAutoUpdate(client, intervalMinutes = 30) {
    if (_autoUpdateInterval) clearInterval(_autoUpdateInterval);

    _autoUpdateInterval = setInterval(async () => {
        for (const [, guild] of client.guilds.cache) {
            try {
                const guildData = db.getGuildData(guild.id);

                // البحث عن قناة الصدارة بعدة طرق
                let lbChannel = null;

                if (guildData.leaderboardChannel) {
                    lbChannel = guild.channels.cache.get(guildData.leaderboardChannel);
                }

                if (!lbChannel) {
                    lbChannel = guild.channels.cache.find(ch =>
                        ch.type === 0 && (
                            ch.name.includes('متصدرين') ||
                            ch.name.includes('leaderboard') ||
                            ch.name.includes('صدارة') ||
                            ch.name.includes('top')
                        )
                    );
                }

                if (lbChannel) {
                    await sendLeaderboardToChannel(lbChannel, client, guild.id);
                }
            } catch (err) {
                console.error(`[Leaderboard Auto] خطأ في ${guild.name}:`, err.message);
            }
        }
    }, intervalMinutes * 60 * 1000);

    _autoUpdateInterval.unref?.();
    console.log(`✅ [Leaderboard] التحديث التلقائي كل ${intervalMinutes} دقيقة`);
}

// ─── معالج أزرار الصدارة ──────────────────────────────────
async function handleLeaderboardButton(interaction) {
    try {
        const id = interaction.customId;
        const typeMap = {
            'lb_all': 'all',
            'lb_wealth': 'wealth',
            'lb_level': 'level',
            'lb_rep': 'rep',
            'lb_refresh': 'all'
        };

        const type = typeMap[id] || 'all';
        const data = await buildLeaderboardData(
            interaction.client,
            interaction.guild?.id
        );
        const embed = buildLeaderboardEmbed(data, type);
        const buttons = buildLeaderboardButtons(type);

        await interaction.update({ embeds: [embed], components: [buttons] });
    } catch (err) {
        console.error('[Leaderboard Button]:', err.message);
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ content: '❌ خطأ في تحديث الصدارة.', flags: MessageFlags.Ephemeral }).catch(() => {});
        }
    }
}

// ═══════════════════════════════════════════════════════════
// الأمر الرئيسي
// ═══════════════════════════════════════════════════════════
module.exports = {
    name: 'leaderboard',
    aliases: [
        'ليدربورد', 'المتصدرين', 'الاوائل', 'صدارة', 'متصدرين'
    ],
    description: 'عرض لوحة المتصدرين (ثروة، مستوى، سمعة)',
    usage: 'متصدرين',

    async execute(context, args) {
        const isInteraction = context.isCommand?.() || context.isButton?.();
        const client = context.client;
        const guildId = context.guild?.id;

        // تحميل البيانات
        let loadingMsg = null;
        if (!isInteraction) {
            loadingMsg = await context.reply('⏳ جاري تحميل بيانات المتصدرين...').catch(() => null);
        } else {
            await context.deferReply().catch(() => {});
        }

        try {
            // تحديد النوع من الوسائط
            const typeArg = args?.[0]?.toLowerCase();
            const typeMap = {
                'ثروة': 'wealth', 'غنى': 'wealth', 'مال': 'wealth', 'wealth': 'wealth',
                'مستوى': 'level', 'مستويات': 'level', 'level': 'level', 'xp': 'level',
                'سمعة': 'rep', 'rep': 'rep', 'reputation': 'rep'
            };
            const type = typeMap[typeArg] || 'all';

            const data = await buildLeaderboardData(client, guildId);
            const embed = buildLeaderboardEmbed(data, type);
            const buttons = buildLeaderboardButtons(type);

            if (isInteraction) {
                await context.editReply({ embeds: [embed], components: [buttons] });
            } else {
                if (loadingMsg) await loadingMsg.delete().catch(() => {});
                await context.reply({ embeds: [embed], components: [buttons] });
            }
        } catch (err) {
            console.error('[Leaderboard Execute]:', err.message);
            const errMsg = '❌ حدث خطأ أثناء تحميل الصدارة.';
            if (isInteraction) await context.editReply({ content: errMsg }).catch(() => {});
            else await context.reply(errMsg).catch(() => {});
        }
    },

    // exports
    sendLeaderboardToChannel,
    startAutoUpdate,
    handleLeaderboardButton,
    buildLeaderboardData,
    buildLeaderboardEmbed,
};
