'use strict';

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║  🧠 MEMORY MATCH v3.0 — لعبة الذاكرة التطابق بالأزرار                 ║
 * ║  بطاقات مقلوبة | تطابق الزوج | نقاط | مستويات                         ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, MessageFlags } = require('discord.js');
const db = require('../../utils/database');
const config = require('../../config');

// ─── رموز الأزواج ─────────────────────────────────────────────────────────────
const EMOJI_PAIRS = ['🍎', '🍌', '🍇', '🍊', '🍋', '🍓', '🎮', '⭐'];

// ─── مخزن الألعاب ────────────────────────────────────────────────────────────
const memoryGames = new Map();

function createBoard() {
    const pairs = [...EMOJI_PAIRS, ...EMOJI_PAIRS];
    // خلط الأزواج
    for (let i = pairs.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pairs[i], pairs[j]] = [pairs[j], pairs[i]];
    }
    return pairs;
}

function buildMemoryRows(game) {
    const rows = [];
    // 4x4 grid = 4 rows × 4 buttons
    for (let r = 0; r < 4; r++) {
        const row = new ActionRowBuilder();
        for (let c = 0; c < 4; c++) {
            const idx = r * 4 + c;
            const cell = game.board[idx];
            const isFlipped = game.flipped.has(idx) || game.matched.has(idx);
            const isMatched = game.matched.has(idx);
            const isSelected = game.selected.includes(idx);

            row.addComponents(
                new ButtonBuilder()
                    .setCustomId(`memory_flip_${game.userId}_${idx}`)
                    .setLabel(isFlipped ? cell : '❓')
                    .setStyle(
                        isMatched ? ButtonStyle.Success :
                        isSelected ? ButtonStyle.Primary :
                        ButtonStyle.Secondary
                    )
                    .setDisabled(isFlipped || game.ended || game.waiting)
            );
        }
        rows.push(row);
    }
    return rows;
}

function buildMemoryEmbed(game) {
    const matched = game.matched.size / 2;
    const total = 8;
    const bar = '█'.repeat(matched) + '░'.repeat(total - matched);

    let color = '#5865F2';
    if (game.ended) color = '#57F287';

    const embed = new EmbedBuilder()
        .setColor(color)
        .setTitle('🧠 لعبة الذاكرة — طابق الأزواج!')
        .setDescription(game.ended
            ? `> 🎉 **أحسنت! أكملت اللوحة!**\n\n> 🏆 جائزة: **+${game.prize} ${config.currency}**\n> 📊 المحاولات: **${game.attempts}**`
            : `> انقر على البطاقات لكشفها وطابق الأزواج!\n> **لديك 3 دقائق**`)
        .addFields(
            { name: '📊 التقدم', value: `\`${bar}\` ${matched}/${total} زوج`, inline: false },
            { name: '🔄 المحاولات', value: `**${game.attempts}**`, inline: true },
            { name: '🏆 الجائزة', value: `**${game.prize} ${config.currency}**`, inline: true },
        )
        .setFooter({ text: game.ended ? '✅ اللعبة انتهت!' : '❓ انقر على البطاقة لكشفها' });

    return embed;
}

module.exports = {
    name: 'memory',
    aliases: ['ذاكرة', 'اختبار_الذاكرة', 'تذكر'],
    description: 'لعبة تطابق بطاقات الذاكرة بالأزرار',
    usage: 'ذاكرة',

    async execute(message) {
        const userId = message.author.id;

        if (memoryGames.has(userId)) {
            return message.reply('⚠️ لديك لعبة ذاكرة نشطة! اكملها أولاً أو انتظر انتهاءها.');
        }

        const game = {
            userId,
            board: createBoard(),
            flipped: new Set(),
            matched: new Set(),
            selected: [],
            attempts: 0,
            prize: 500,
            ended: false,
            waiting: false,
            message: null,
        };

        memoryGames.set(userId, game);

        const embed = buildMemoryEmbed(game);
        const components = buildMemoryRows(game);

        const msg = await message.reply({ embeds: [embed], components });
        game.message = msg;

        // انتهاء بعد 3 دقائق
        setTimeout(() => {
            if (memoryGames.get(userId) === game && !game.ended) {
                game.ended = true;
                memoryGames.delete(userId);
                msg.edit({
                    content: `⏰ ${message.author} — انتهى الوقت! طابقت **${game.matched.size/2}/8** أزواج.`,
                    components: []
                }).catch(() => {});
            }
        }, 3 * 60 * 1000);
    },

    async handleMemoryInteraction(interaction) {
        if (!interaction.customId.startsWith('memory_flip_')) return;

        const parts = interaction.customId.split('_');
        const userId = parts[2];
        const idx = parseInt(parts[3]);

        if (interaction.user.id !== userId) {
            return interaction.reply({ content: '❌ هذه اللعبة ليست لك!', flags: MessageFlags.Ephemeral });
        }

        const game = memoryGames.get(userId);
        if (!game || game.ended || game.waiting) return interaction.deferUpdate().catch(() => {});

        // إذا البطاقة مكشوفة أو مطابقة
        if (game.flipped.has(idx) || game.matched.has(idx)) return interaction.deferUpdate().catch(() => {});

        // إضافة البطاقة
        game.flipped.add(idx);
        game.selected.push(idx);

        if (game.selected.length === 1) {
            // أول اختيار — فقط كشف
            const embed = buildMemoryEmbed(game);
            const components = buildMemoryRows(game);
            await interaction.update({ embeds: [embed], components });

        } else if (game.selected.length === 2) {
            // ثاني اختيار — تحقق من التطابق
            game.attempts++;
            game.waiting = true;

            const [first, second] = game.selected;
            const match = game.board[first] === game.board[second];

            // عرض الاختيارَين
            const embed = buildMemoryEmbed(game);
            const components = buildMemoryRows(game);
            await interaction.update({ embeds: [embed], components });

            // تأخير قبل الإخفاء أو التأكيد
            await new Promise(r => setTimeout(r, match ? 500 : 1000));

            if (match) {
                game.matched.add(first);
                game.matched.add(second);
            }

            // إعادة إخفاء البطاقات غير المطابقة
            if (!match) {
                game.flipped.delete(first);
                game.flipped.delete(second);
            }

            game.selected = [];
            game.waiting = false;

            // فحص الانتهاء
            if (game.matched.size === 16) {
                game.ended = true;
                memoryGames.delete(userId);

                // مكافأة بناءً على عدد المحاولات
                const bonusPrize = Math.max(100, game.prize - (game.attempts - 8) * 20);
                game.prize = bonusPrize;

                db.addMoney(userId, bonusPrize);
                db.addTransaction(userId, 'memory_win', bonusPrize, `Memory Win (${game.attempts} attempts)`);
            }

            const finalEmbed = buildMemoryEmbed(game);
            const finalComponents = game.ended ? [] : buildMemoryRows(game);
            await game.message?.edit({ embeds: [finalEmbed], components: finalComponents }).catch(() => {});
        }
    }
};
