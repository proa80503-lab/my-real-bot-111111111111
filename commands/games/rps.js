'use strict';

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║  🪨📄✂️ ROCK PAPER SCISSORS v3.0 — احترافي بالأزرار                   ║
 * ║  رسوم متحركة | مع لاعب | ضد البوت | إحصائيات                          ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, MessageFlags } = require('discord.js');
const db = require('../../utils/database');
const config = require('../../config');

const CHOICES = {
    rock:     { label: '🪨 حجر',   emoji: '🪨', beats: 'scissors' },
    paper:    { label: '📄 ورقة',  emoji: '📄', beats: 'rock' },
    scissors: { label: '✂️ مقص',   emoji: '✂️', beats: 'paper' },
};
const CHOICE_KEYS = Object.keys(CHOICES);

// ─── ألعاب PvP نشطة ──────────────────────────────────────────────────────────
const rpsGames = new Map(); // channelId → { player1, player2, choice1, choice2 }

function buildChoiceRow(gameId, disabled = false) {
    return new ActionRowBuilder().addComponents(
        ...CHOICE_KEYS.map(key =>
            new ButtonBuilder()
                .setCustomId(`rps_choice_${gameId}_${key}`)
                .setLabel(CHOICES[key].label)
                .setStyle(ButtonStyle.Primary)
                .setDisabled(disabled)
        )
    );
}

function determineWinner(c1, c2) {
    if (c1 === c2) return 'draw';
    return CHOICES[c1].beats === c2 ? 'player1' : 'player2';
}

function buildResultEmbed(p1, p2, c1, c2, result, prize = 0) {
    const icons = { rock: '🪨', paper: '📄', scissors: '✂️' };
    let color, title, desc;

    if (result === 'draw') {
        color = '#FEE75C';
        title = '🤝 تعادل!';
        desc = `كلاكما اختار **${icons[c1]}**`;
    } else if (result === 'player1') {
        color = '#57F287';
        title = `🏆 ${p1.username} فاز!`;
        desc = `**${icons[c1]} ${CHOICES[c1].label}** يتغلب على **${icons[c2]} ${CHOICES[c2].label}**`;
    } else {
        color = '#ED4245';
        title = `🏆 ${p2.username || 'البوت'} فاز!`;
        desc = `**${icons[c2]} ${CHOICES[c2].label}** يتغلب على **${icons[c1]} ${CHOICES[c1].label}**`;
    }

    const embed = new EmbedBuilder()
        .setColor(color)
        .setTitle(title)
        .setDescription(desc)
        .addFields(
            { name: `${p1.username}`, value: `${icons[c1]} ${CHOICES[c1].label}`, inline: true },
            { name: 'vs', value: '⚔️', inline: true },
            { name: `${p2?.username || '🤖 البوت'}`, value: `${icons[c2]} ${CHOICES[c2].label}`, inline: true },
        );

    if (prize > 0 && result !== 'draw') {
        embed.addFields({ name: '💰 الجائزة', value: `+**${prize.toLocaleString()} ${config.currency}**`, inline: false });
    }

    return embed;
}

module.exports = {
    name: 'rps',
    aliases: ['حجر_ورقة_مقص', 'ركس', 'rps', 'حجر'],
    description: 'لعبة حجر ورقة مقص بالأزرار',
    usage: 'rps [@مستخدم | بوت]',

    async execute(message, args) {
        const target = message.mentions.users.first();
        const vsBot = !target || target.bot || args[0]?.toLowerCase() === 'بوت';

        if (vsBot) {
            // ── ضد البوت ───────────────────────────────────────────
            const embed = new EmbedBuilder()
                .setColor('#5865F2')
                .setTitle('🪨📄✂️ حجر ورقة مقص')
                .setDescription(`> ${message.author} — اختر حركتك ضد **🤖 البوت**!\n\n> ⏰ لديك 30 ثانية للاختيار`)
                .setFooter({ text: 'اضغط على أحد الخيارات أدناه' });

            const gameId = `vs_${message.author.id}_${Date.now()}`;
            const row = buildChoiceRow(gameId);
            await message.reply({ embeds: [embed], components: [row] });
        } else {
            // ── ضد لاعب آخر ────────────────────────────────────────
            if (target.id === message.author.id) return message.reply('❌ لا يمكنك تحدي نفسك!');

            const gameId = `pvp_${message.author.id}_${target.id}_${Date.now()}`;
            rpsGames.set(gameId, {
                player1: message.author,
                player2: target,
                choice1: null,
                choice2: null,
                msg: null
            });

            const embed = new EmbedBuilder()
                .setColor('#5865F2')
                .setTitle('🪨📄✂️ تحدي حجر ورقة مقص!')
                .setDescription([
                    `> 🎮 ${message.author} يتحدى ${target}!`,
                    `> كلاكما سيختار سراً — والنتيجة تُكشف بعد الاختيارَين!`,
                    '',
                    `> ⏳ **انتظار اختيار ${message.author.username}...**`,
                    `> ⏳ **انتظار اختيار ${target.username}...**`,
                ].join('\n'))
                .setFooter({ text: '⏰ 60 ثانية للاختيار' });

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`rps_choice_${gameId}_rock`).setLabel('🪨 حجر').setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId(`rps_choice_${gameId}_paper`).setLabel('📄 ورقة').setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId(`rps_choice_${gameId}_scissors`).setLabel('✂️ مقص').setStyle(ButtonStyle.Primary),
            );

            const msg = await message.reply({ content: `${target}`, embeds: [embed], components: [row] });
            rpsGames.get(gameId).msg = msg;

            // انتهاء بعد دقيقة
            setTimeout(() => {
                if (rpsGames.has(gameId)) {
                    rpsGames.delete(gameId);
                    msg.edit({ content: '❌ انتهت اللعبة بسبب عدم الاختيار.', embeds: [], components: [] }).catch(() => {});
                }
            }, 60000);
        }
    },

    async handleRPSInteraction(interaction) {
        if (!interaction.customId.startsWith('rps_choice_')) return;

        const parts = interaction.customId.split('_');
        // rps_choice_GAMEID_CHOICE
        // gameId قد يحتوي على underscores فنأخذ ما بعد "rps_choice_" وقبل آخر كلمة
        const allParts = interaction.customId.replace('rps_choice_', '').split('_');
        const choice = allParts[allParts.length - 1]; // آخر عنصر هو الاختيار
        const gameId = allParts.slice(0, -1).join('_');

        if (!CHOICES[choice]) return;

        // ── وضع vs البوت ─────────────────────────────────────────────────────
        if (gameId.startsWith('vs_')) {
            const ownerId = gameId.split('_')[1];
            if (interaction.user.id !== ownerId) {
                return interaction.reply({ content: '❌ هذه اللعبة ليست لك!', flags: MessageFlags.Ephemeral });
            }

            const botChoice = CHOICE_KEYS[Math.floor(Math.random() * CHOICE_KEYS.length)];
            const result = determineWinner(choice, botChoice);
            const prize = result === 'player1' ? 150 : 0;

            if (prize > 0) {
                db.addMoney(interaction.user.id, prize);
                db.addTransaction(interaction.user.id, 'rps_win', prize, 'RPS Win vs Bot');
            }

            const embed = buildResultEmbed(interaction.user, null, choice, botChoice, result, prize);
            await interaction.update({ embeds: [embed], components: [] });
            return;
        }

        // ── وضع PvP ──────────────────────────────────────────────────────────
        const game = rpsGames.get(gameId);
        if (!game) {
            return interaction.reply({ content: '❌ اللعبة انتهت أو غير موجودة.', flags: MessageFlags.Ephemeral });
        }

        const isP1 = interaction.user.id === game.player1.id;
        const isP2 = interaction.user.id === game.player2.id;

        if (!isP1 && !isP2) {
            return interaction.reply({ content: '❌ أنت لست جزءاً من هذه اللعبة!', flags: MessageFlags.Ephemeral });
        }

        // فحص إذا اختار بالفعل
        if (isP1 && game.choice1) {
            return interaction.reply({ content: '✅ لقد اخترت بالفعل! انتظر اختيار الطرف الآخر.', flags: MessageFlags.Ephemeral });
        }
        if (isP2 && game.choice2) {
            return interaction.reply({ content: '✅ لقد اخترت بالفعل! انتظر اختيار الطرف الآخر.', flags: MessageFlags.Ephemeral });
        }

        // تسجيل الاختيار
        if (isP1) game.choice1 = choice;
        if (isP2) game.choice2 = choice;

        // إشعار سري بالاختيار
        await interaction.reply({
            content: `✅ اخترت **${CHOICES[choice].label}**! انتظر الطرف الآخر...`,
            flags: MessageFlags.Ephemeral
        });

        // تحديث الـ Embed لإظهار من اختار
        const statusLines = [
            `${game.choice1 ? '✅' : '⏳'} **${game.player1.username}** — ${game.choice1 ? 'اختار!' : 'ينتظر...'}`,
            `${game.choice2 ? '✅' : '⏳'} **${game.player2.username}** — ${game.choice2 ? 'اختار!' : 'ينتظر...'}`,
        ];

        const waitEmbed = new EmbedBuilder()
            .setColor('#FEE75C')
            .setTitle('🪨📄✂️ تحدي حجر ورقة مقص')
            .setDescription(statusLines.join('\n'));

        await game.msg?.edit({ embeds: [waitEmbed] }).catch(() => {});

        // إذا اختار الاثنان — نكشف النتيجة
        if (game.choice1 && game.choice2) {
            rpsGames.delete(gameId);
            const result = determineWinner(game.choice1, game.choice2);
            const prize = 250;

            if (result === 'player1') {
                db.addMoney(game.player1.id, prize);
                db.addTransaction(game.player1.id, 'rps_win', prize, 'RPS PvP Win');
            } else if (result === 'player2') {
                db.addMoney(game.player2.id, prize);
                db.addTransaction(game.player2.id, 'rps_win', prize, 'RPS PvP Win');
            }

            const finalEmbed = buildResultEmbed(game.player1, game.player2, game.choice1, game.choice2, result, prize);
            await game.msg?.edit({ content: '', embeds: [finalEmbed], components: [] }).catch(() => {});
        }
    }
};
