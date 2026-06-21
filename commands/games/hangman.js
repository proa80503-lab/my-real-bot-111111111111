'use strict';

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║  😵 HANGMAN v3.0 — المشنقة بالأزرار الاحترافية                        ║
 * ║  لوحة حروف تفاعلية | حروف ملوّنة | رسم المشنقة بـ ASCII               ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, MessageFlags } = require('discord.js');
const db = require('../../utils/database');
const config = require('../../config');

// ─── كلمات اللعبة ─────────────────────────────────────────────────────────────
const WORD_BANK = {
    easy: ['هاتف', 'كتاب', 'بيت', 'سيارة', 'قمر', 'نجمة', 'بحر', 'جبل', 'نهر', 'شمس'],
    medium: ['دسكورد', 'سيرفر', 'برمجة', 'تطوير', 'مملكة', 'عدالة', 'حاسوب', 'شبكة', 'قاعدة', 'تقنية'],
    hard: ['استراتيجية', 'اقتصاديات', 'تكنولوجيا', 'ديمقراطية', 'فلسفة', 'رياضيات', 'فيزياء', 'كيمياء'],
};

// ─── رسوم المشنقة ASCII ───────────────────────────────────────────────────────
const HANGMAN_STAGES = [
    // 0 أخطاء
    '```\n  +---+\n  |   |\n      |\n      |\n      |\n      |\n=========```',
    // 1 خطأ
    '```\n  +---+\n  |   |\n  O   |\n      |\n      |\n      |\n=========```',
    // 2 أخطاء
    '```\n  +---+\n  |   |\n  O   |\n  |   |\n      |\n      |\n=========```',
    // 3 أخطاء
    '```\n  +---+\n  |   |\n  O   |\n /|   |\n      |\n      |\n=========```',
    // 4 أخطاء
    '```\n  +---+\n  |   |\n  O   |\n /|\\  |\n      |\n      |\n=========```',
    // 5 أخطاء
    '```\n  +---+\n  |   |\n  O   |\n /|\\  |\n /    |\n      |\n=========```',
    // 6 أخطاء — خسرت!
    '```\n  +---+\n  |   |\n  O   |\n /|\\  |\n / \\  |\n      |\n=========```',
];

// ─── ألعاب نشطة ──────────────────────────────────────────────────────────────
const hangmanGames = new Map(); // userId → HangmanGame

// ─── بناء لوحة الحروف ─────────────────────────────────────────────────────────
function buildLetterRows(game) {
    const ARABIC_LETTERS = [
        ['ا', 'ب', 'ت', 'ث', 'ج', 'ح'],
        ['خ', 'د', 'ذ', 'ر', 'ز', 'س'],
        ['ش', 'ص', 'ض', 'ط', 'ظ', 'ع'],
        ['غ', 'ف', 'ق', 'ك', 'ل', 'م'],
        ['ن', 'ه', 'و', 'ي', 'ة', 'ء'],
    ];

    return ARABIC_LETTERS.map((row, rowIdx) =>
        new ActionRowBuilder().addComponents(
            row.map(letter =>
                new ButtonBuilder()
                    .setCustomId(`hangman_letter_${game.userId}_${letter}`)
                    .setLabel(letter)
                    .setStyle(
                        game.wrongLetters.has(letter) ? ButtonStyle.Danger :
                        game.correctLetters.has(letter) ? ButtonStyle.Success :
                        ButtonStyle.Secondary
                    )
                    .setDisabled(game.wrongLetters.has(letter) || game.correctLetters.has(letter) || game.ended)
            )
        )
    );
}

// ─── بناء Embed ──────────────────────────────────────────────────────────────
function buildHangmanEmbed(game) {
    const displayWord = game.word.split('').map(c => game.correctLetters.has(c) ? `**${c}**` : '\\_').join(' ');
    const wrongArr = [...game.wrongLetters];

    let color = '#5865F2';
    let title = '😵 المشنقة';

    if (game.won) { color = '#57F287'; title = '🎉 فزت!'; }
    else if (game.lost) { color = '#ED4245'; title = '💀 خسرت!'; }

    return new EmbedBuilder()
        .setColor(color)
        .setTitle(title)
        .addFields(
            { name: '🔡 الكلمة', value: displayWord || '_ _ _', inline: false },
            { name: HANGMAN_STAGES[game.errors] ? '🖼️ المشنقة' : '\u200b', value: HANGMAN_STAGES[Math.min(game.errors, 6)], inline: false },
            { name: '❌ الأخطاء', value: wrongArr.length > 0 ? wrongArr.join(' ') : '*لا يوجد*', inline: true },
            { name: '💔 المحاولات', value: `**${game.errors}/6**`, inline: true },
            { name: '🎯 المستوى', value: `**${game.difficulty}**`, inline: true },
        )
        .setFooter({ text: game.won ? `🏆 الجائزة: +${game.prize} ${config.currency}` : game.lost ? `الكلمة كانت: ${game.word}` : `${game.difficulty} • اضغط حرفاً` });
}

module.exports = {
    name: 'hangman',
    aliases: ['شنق', 'الرجل_المشنوق', 'كلمات', 'مشنقة'],
    description: 'لعبة الرجل المشنوق بلوحة حروف تفاعلية',
    usage: 'مشنقة [سهل|متوسط|صعب]',

    async execute(message, args) {
        const userId = message.author.id;

        if (hangmanGames.has(userId)) {
            return message.reply('⚠️ لديك لعبة مشنقة نشطة بالفعل! أنهها أولاً.\n> اكتب `إلغاء` لإلغاء اللعبة الحالية.');
        }

        // اختيار الصعوبة
        const diffMap = { 'سهل': 'easy', 'متوسط': 'medium', 'صعب': 'hard' };
        const diffInput = args[0]?.toLowerCase();
        const difficulty = diffMap[diffInput] || (diffInput === 'easy' ? 'easy' : diffInput === 'medium' ? 'medium' : diffInput === 'hard' ? 'hard' : null);

        if (!difficulty) {
            // عرض قائمة الاختيار
            const embed = new EmbedBuilder()
                .setColor('#5865F2')
                .setTitle('😵 المشنقة — اختر مستوى الصعوبة')
                .setDescription('> اختر مستوى الصعوبة للبدء!\n\n> **سهل** — كلمات قصيرة ومعروفة\n> **متوسط** — كلمات تقنية\n> **صعب** — كلمات طويلة وصعبة');

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`hangman_diff_${userId}_easy`).setLabel('🟢 سهل').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId(`hangman_diff_${userId}_medium`).setLabel('🟡 متوسط').setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId(`hangman_diff_${userId}_hard`).setLabel('🔴 صعب').setStyle(ButtonStyle.Danger),
            );

            return message.reply({ embeds: [embed], components: [row] });
        }

        await startHangman(message, userId, difficulty);
    },

    async handleHangmanInteraction(interaction) {
        const id = interaction.customId;

        // ── اختيار الصعوبة
        if (id.startsWith('hangman_diff_')) {
            const parts = id.split('_');
            const userId = parts[2];
            const difficulty = parts[3];

            if (interaction.user.id !== userId) {
                return interaction.reply({ content: '❌ هذه اللعبة ليست لك!', flags: MessageFlags.Ephemeral });
            }
            if (hangmanGames.has(userId)) {
                return interaction.reply({ content: '⚠️ لديك لعبة نشطة بالفعل!', flags: MessageFlags.Ephemeral });
            }

            await interaction.deferUpdate();
            await startHangmanOnMessage(interaction.message, interaction.user, userId, difficulty);
            return;
        }

        // ── اختيار حرف
        if (id.startsWith('hangman_letter_')) {
            const parts = id.split('_');
            const userId = parts[2];
            const letter = parts.slice(3).join('_'); // الحرف قد يكون ء

            if (interaction.user.id !== userId) {
                return interaction.reply({ content: '❌ هذه اللعبة ليست لك!', flags: MessageFlags.Ephemeral });
            }

            const game = hangmanGames.get(userId);
            if (!game || game.ended) {
                return interaction.reply({ content: '❌ اللعبة انتهت!', flags: MessageFlags.Ephemeral });
            }

            // معالجة الحرف
            if (game.word.includes(letter)) {
                game.correctLetters.add(letter);
            } else {
                game.wrongLetters.add(letter);
                game.errors++;
            }

            // فحص الفوز
            const allRevealed = game.word.split('').every(c => game.correctLetters.has(c));
            if (allRevealed) {
                game.won = true;
                game.ended = true;
                hangmanGames.delete(userId);
                db.addMoney(userId, game.prize);
                db.addTransaction(userId, 'hangman_win', game.prize, `Hangman Win (${game.difficulty})`);
            } else if (game.errors >= 6) {
                game.lost = true;
                game.ended = true;
                hangmanGames.delete(userId);
            }

            const embed = buildHangmanEmbed(game);
            const components = game.ended ? [] : buildLetterRows(game);

            await interaction.update({ embeds: [embed], components });
        }
    }
};

// ─── بدء اللعبة من رسالة عادية ───────────────────────────────────────────────
async function startHangman(message, userId, difficulty) {
    const words = WORD_BANK[difficulty];
    const word = words[Math.floor(Math.random() * words.length)];
    const prizes = { easy: 200, medium: 400, hard: 700 };

    const game = {
        userId,
        word,
        difficulty,
        correctLetters: new Set(),
        wrongLetters: new Set(),
        errors: 0,
        prize: prizes[difficulty] || 200,
        won: false,
        lost: false,
        ended: false,
        message: null,
    };

    hangmanGames.set(userId, game);

    const embed = buildHangmanEmbed(game);
    const components = buildLetterRows(game);
    const msg = await message.reply({ embeds: [embed], components });
    game.message = msg;

    // انتهاء بعد 5 دقائق
    setTimeout(() => {
        if (hangmanGames.get(userId) === game) {
            game.ended = true;
            hangmanGames.delete(userId);
            msg.edit({ content: `⏰ انتهت اللعبة! الكلمة كانت **${word}**`, components: [] }).catch(() => {});
        }
    }, 5 * 60 * 1000);
}

async function startHangmanOnMessage(originalMsg, user, userId, difficulty) {
    const words = WORD_BANK[difficulty];
    const word = words[Math.floor(Math.random() * words.length)];
    const prizes = { easy: 200, medium: 400, hard: 700 };

    const game = {
        userId,
        word,
        difficulty,
        correctLetters: new Set(),
        wrongLetters: new Set(),
        errors: 0,
        prize: prizes[difficulty] || 200,
        won: false,
        lost: false,
        ended: false,
        message: originalMsg,
    };

    hangmanGames.set(userId, game);

    const embed = buildHangmanEmbed(game);
    const components = buildLetterRows(game);
    await originalMsg.edit({ embeds: [embed], components });

    // انتهاء بعد 5 دقائق
    setTimeout(() => {
        if (hangmanGames.get(userId) === game) {
            game.ended = true;
            hangmanGames.delete(userId);
            originalMsg.edit({ content: `⏰ انتهت اللعبة! الكلمة كانت **${word}**`, embeds: [], components: [] }).catch(() => {});
        }
    }, 5 * 60 * 1000);
}
