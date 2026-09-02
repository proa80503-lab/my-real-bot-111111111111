'use strict';

/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║  🔤 WORD GUESS v1.0 — خمّن الكلمة (Wordle العراقي)                       ║
 * ║  6 محاولات | مؤشرات خضراء/صفراء/رمادية | مكافأة 500 💰                  ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require('../../utils/database');
const config = require('../../config');

// ─── قاموس الكلمات ─────────────────────────────────────────────────────────
const WORD_BANK = [
    'نجمة', 'قمرة', 'شمسة', 'بحار', 'جبال',
    'كتاب', 'قلمة', 'ورقة', 'دفتر', 'بيتة',
    'كورة', 'هدفة', 'لاعب', 'فريق', 'دوري',
    'أحمر', 'أزرق', 'أخضر', 'أصفر', 'أبيض',
    'فرحة', 'حزنة', 'خوفة', 'قلقة', 'حبية',
    'بصرة', 'موصل', 'نجفة', 'كوفة', 'كرخة',
    'دجاج', 'سمكة', 'خبزة', 'تمرة', 'حليب',
    'گلبي', 'حبيب', 'صاحب', 'شلون', 'هسة',
    'سيرفر', 'لعبة', 'كودات', 'ببجيس',
    'غرفة', 'سرير', 'نافذة', 'مرآة',
];

const activeGames = new Map();

function buildGrid(attempts, word) {
    if (attempts.length === 0) return '`ما حاولت بعد — اكتب كلمتك!`';
    return attempts.map(attempt => {
        const chars = [...attempt];
        const wordChars = [...word];
        return chars.map((ch, i) => {
            if (ch === wordChars[i]) return '🟩';
            if (wordChars.includes(ch)) return '🟨';
            return '⬛';
        }).join('') + '  `' + attempt + '`';
    }).join('\n');
}

function buildGameEmbed(game, username) {
    const remaining = 6 - game.attempts.length;
    return new EmbedBuilder()
        .setColor(remaining <= 2 ? '#FF4444' : remaining <= 4 ? '#FFA500' : '#00CC44')
        .setTitle('🔤 خمّن الكلمة — Wordle العراقي!')
        .setDescription([
            '`🟩 = حرف صح وموضعه صح`',
            '`🟨 = حرف صح لكن موضعه غلط`',
            '`⬛ = حرف مو موجود`',
        ].join('\n'))
        .addFields(
            { name: '📊 المحاولات', value: buildGrid(game.attempts, game.word), inline: false },
            { name: '⏳ المتبقية', value: `**${remaining}/6**`, inline: true },
            { name: '💰 الجائزة', value: `**500 ${config.currency}**`, inline: true },
            { name: '📏 الطول', value: `**${game.word.length} أحرف** \`${'_'.repeat(game.word.length)}\``, inline: true },
        )
        .setFooter({ text: `${username} • اكتب كلمتك في الدردشة | استسلام للإيقاف` })
        .setTimestamp();
}

module.exports = {
    name: 'wordguess',
    aliases: ['خمن', 'كلمة', 'ورد', 'wordle'],
    description: 'لعبة خمّن الكلمة (Wordle العراقي)',
    usage: 'خمن',

    async execute(message, args) {
        const userId = message.author.id;

        if (activeGames.has(userId)) {
            const game = activeGames.get(userId);
            const input = args.join('').trim().toLowerCase();

            if (input === 'استسلام' || input === 'استسلم' || input === 'stop') {
                activeGames.delete(userId);
                return message.reply(`❌ استسلمت يمعود! الكلمة كانت: **${game.word}**\n> اكتب \`خمّن\` للبدء من جديد!`);
            }

            if ([...input].length !== game.word.length) {
                return message.reply(`❌ الكلمة يجب تكون **${game.word.length} أحرف** — كلمتك \`${input}\` (${[...input].length} أحرف)`);
            }

            game.attempts.push(input);
            const won = input === game.word;

            if (won) {
                activeGames.delete(userId);
                const reward = 500 + Math.max(0, (6 - game.attempts.length) * 100);
                db.addMoney(userId, reward);
                try { require('../../utils/levels').addXP(userId, 20, message); } catch {}

                return message.reply({ embeds: [
                    new EmbedBuilder()
                        .setColor('#00FF88')
                        .setTitle('🎉 برافو عليك! خمّنت الكلمة!')
                        .setDescription(buildGrid(game.attempts, game.word))
                        .addFields(
                            { name: '✅ الكلمة', value: `**${game.word}**`, inline: true },
                            { name: '🔢 بمحاولات', value: `**${game.attempts.length}/6**`, inline: true },
                            { name: '💰 الجائزة', value: `**+${reward} ${config.currency}**`, inline: true },
                        )
                        .setFooter({ text: 'اكتب خمّن لجولة جديدة!' })
                ]});
            }

            if (game.attempts.length >= 6) {
                activeGames.delete(userId);
                return message.reply({ embeds: [
                    new EmbedBuilder()
                        .setColor('#FF4444')
                        .setTitle('💀 خسرت! راحت عليك!')
                        .setDescription(buildGrid(game.attempts, game.word))
                        .addFields(
                            { name: '❌ الكلمة كانت', value: `**${game.word}**`, inline: true },
                            { name: '🔁 جرب مرة ثانية', value: 'اكتب `خمّن`', inline: true },
                        )
                ]});
            }

            return message.reply({ embeds: [buildGameEmbed(game, message.author.displayName || message.author.username)] });
        }

        // بدء لعبة جديدة
        const word = WORD_BANK[Math.floor(Math.random() * WORD_BANK.length)];
        const game = { word, attempts: [], startTime: Date.now() };
        activeGames.set(userId, game);

        setTimeout(() => {
            if (activeGames.has(userId) && activeGames.get(userId).startTime === game.startTime) {
                activeGames.delete(userId);
            }
        }, 5 * 60 * 1000);

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`wg_give_up_${userId}`).setLabel('🏳️ استسلام').setStyle(ButtonStyle.Danger),
        );

        await message.reply({
            content: '> 🔤 **اكتب كلمتك في الدردشة للتخمين!** (اكتب `استسلام` للتوقف)',
            embeds: [buildGameEmbed(game, message.author.displayName || message.author.username)],
            components: [row],
        });
    },
};