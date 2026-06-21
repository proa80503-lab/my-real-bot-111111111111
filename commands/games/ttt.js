'use strict';

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║  ❌⭕ TIC TAC TOE v3.0 — اكس او احترافي بالأزرار                       ║
 * ║  زر دعوة | تمييز الفائز | ضد البوت | انتهاء تلقائي                    ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

const {
    ActionRowBuilder, ButtonBuilder, ButtonStyle,
    EmbedBuilder, MessageFlags
} = require('discord.js');
const db = require('../../utils/database');
const config = require('../../config');

// ─── مخزن الألعاب النشطة ─────────────────────────────────────────────────────
const tttGames = new Map(); // channelId → GameState

// ─── خوارزمية الفوز ──────────────────────────────────────────────────────────
const WIN_LINES = [
    [0,1,2],[3,4,5],[6,7,8], // أفقي
    [0,3,6],[1,4,7],[2,5,8], // عمودي
    [0,4,8],[2,4,6]           // قطري
];

function checkWinner(board) {
    for (const [a,b,c] of WIN_LINES) {
        if (board[a] && board[a] === board[b] && board[a] === board[c]) {
            return { winner: board[a], line: [a,b,c] };
        }
    }
    return null;
}

// ─── بناء لوحة الأزرار ────────────────────────────────────────────────────────
function buildBoard(game) {
    const rows = [];
    const winResult = checkWinner(game.board);
    const winLine = winResult ? winResult.line : [];

    for (let i = 0; i < 3; i++) {
        const row = new ActionRowBuilder();
        for (let j = 0; j < 3; j++) {
            const idx = i * 3 + j;
            const cell = game.board[idx];
            const isWinCell = winLine.includes(idx);

            let style = ButtonStyle.Secondary;
            let label = '\u200b';
            let emoji;

            if (cell === 'X') {
                label = '❌';
                style = isWinCell ? ButtonStyle.Success : ButtonStyle.Danger;
            } else if (cell === 'O') {
                label = '⭕';
                style = isWinCell ? ButtonStyle.Success : ButtonStyle.Primary;
            }

            row.addComponents(
                new ButtonBuilder()
                    .setCustomId(`ttt_move_${game.id}_${idx}`)
                    .setLabel(label)
                    .setStyle(style)
                    .setDisabled(!!cell || !!winResult || game.ended)
            );
        }
        rows.push(row);
    }
    return rows;
}

// ─── Embed اللعبة ─────────────────────────────────────────────────────────────
function buildGameEmbed(game, status = null) {
    const p1Name = game.player1.username;
    const p2Name = game.vsBot ? '🤖 البوت' : game.player2?.username || '...';
    const current = game.currentTurn === 'X' ? p1Name : p2Name;

    const winResult = checkWinner(game.board);
    const isDraw = !winResult && !game.board.includes(null);

    let color = '#5865F2';
    let title = '❌⭕ اكس او';
    let desc = status || `🎮 **الدور على:** ${current}\n\n❌ ${p1Name}  vs  ⭕ ${p2Name}`;

    if (winResult) {
        const winnerName = winResult.winner === 'X' ? p1Name : p2Name;
        color = '#57F287';
        title = '🏆 انتهت اللعبة!';
        desc = `🎉 **الفائز: ${winnerName}!**\n\n❌ ${p1Name}  vs  ⭕ ${p2Name}`;
    } else if (isDraw) {
        color = '#FEE75C';
        title = '🤝 تعادل!';
        desc = `**انتهت اللعبة بالتعادل!**\n\n❌ ${p1Name}  vs  ⭕ ${p2Name}`;
    }

    return new EmbedBuilder()
        .setColor(color)
        .setTitle(title)
        .setDescription(desc)
        .setFooter({ text: `${config.prefix}اكس_او لبدء لعبة جديدة` })
        .setTimestamp();
}

// ─── خطوة البوت (AI بسيط) ────────────────────────────────────────────────────
function getBotMove(board) {
    // 1. هل يمكن للبوت الفوز؟
    for (const [a,b,c] of WIN_LINES) {
        const line = [board[a], board[b], board[c]];
        if (line.filter(x => x === 'O').length === 2 && line.includes(null)) {
            const idx = [a,b,c][line.indexOf(null)];
            return idx;
        }
    }
    // 2. هل يجب إيقاف اللاعب؟
    for (const [a,b,c] of WIN_LINES) {
        const line = [board[a], board[b], board[c]];
        if (line.filter(x => x === 'X').length === 2 && line.includes(null)) {
            const idx = [a,b,c][line.indexOf(null)];
            return idx;
        }
    }
    // 3. المركز
    if (!board[4]) return 4;
    // 4. الزوايا
    const corners = [0,2,6,8].filter(i => !board[i]);
    if (corners.length) return corners[Math.floor(Math.random() * corners.length)];
    // 5. أي خلية فارغة
    const empty = board.map((v,i) => v ? null : i).filter(i => i !== null);
    return empty[Math.floor(Math.random() * empty.length)];
}

// ─── تحديث رسالة اللعبة ──────────────────────────────────────────────────────
async function updateGame(game, interaction = null) {
    const embed = buildGameEmbed(game);
    const components = buildBoard(game);

    try {
        if (interaction && !interaction.replied && !interaction.deferred) {
            await interaction.update({ embeds: [embed], components });
        } else if (game.message) {
            await game.message.edit({ embeds: [embed], components });
        }
    } catch { /* رسالة محذوفة */ }
}

// ─── انتهاء اللعبة ────────────────────────────────────────────────────────────
async function endGame(game, interaction = null) {
    game.ended = true;
    tttGames.delete(game.channelId);

    const embed = buildGameEmbed(game);
    const components = buildBoard(game); // أزرار معطلة

    // منح جوائز
    const winResult = checkWinner(game.board);
    if (winResult && !game.vsBot) {
        const winnerId = winResult.winner === 'X' ? game.player1.id : game.player2.id;
        const loserId  = winResult.winner === 'X' ? game.player2.id : game.player1.id;
        const prize = 300;
        db.addMoney(winnerId, prize);
        db.addTransaction(winnerId, 'ttt_win', prize, 'TTT Win');

        // إحصائيات
        const wData = db.getUserData(winnerId);
        db.updateFields(winnerId, {
            'stats.gamesPlayed': (wData.stats?.gamesPlayed || 0) + 1,
            'stats.gamesWon': (wData.stats?.gamesWon || 0) + 1,
        });
        const lData = db.getUserData(loserId);
        db.updateFields(loserId, {
            'stats.gamesPlayed': (lData.stats?.gamesPlayed || 0) + 1,
        });
    }

    try {
        if (interaction && !interaction.replied && !interaction.deferred) {
            await interaction.update({ embeds: [embed], components });
        } else if (game.message) {
            await game.message.edit({ embeds: [embed], components });
        }
    } catch {}
}

// ─── الأمر الرئيسي ────────────────────────────────────────────────────────────
module.exports = {
    name: 'ttt',
    aliases: ['اكس_او', 'اكساو', 'او_اكس', 'tictactoe', 'xo'],
    description: 'لعبة اكس او الشهيرة بالأزرار',
    usage: 'اكس_او [@مستخدم | بوت]',

    async execute(message, args) {
        // منع تعدد الألعاب في نفس القناة
        if (tttGames.has(message.channel.id)) {
            return message.reply({ content: '⚠️ هناك لعبة **اكس او** نشطة في هذه القناة! أنهها أولاً.' });
        }

        const vsBot = args[0]?.toLowerCase() === 'بوت' || args[0]?.toLowerCase() === 'bot';
        const challenger = message.mentions.users.first();

        if (!vsBot && !challenger) {
            // عرض خيار البدء
            const embed = new EmbedBuilder()
                .setColor('#5865F2')
                .setTitle('❌⭕ اكس او')
                .setDescription([
                    '> اختر طريقة اللعب:',
                    '',
                    '**🤖 ضد البوت** — العب وحدك ضد الذكاء الاصطناعي',
                    '**👥 ضد لاعب** — تحدّ لاعباً آخر في القناة',
                ].join('\n'))
                .setFooter({ text: 'ستنتهي هذه الرسالة خلال 30 ثانية' });

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`ttt_start_bot_${message.author.id}`).setLabel('🤖 ضد البوت').setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId(`ttt_start_pvp_${message.author.id}`).setLabel('👥 ضد لاعب').setStyle(ButtonStyle.Secondary),
            );

            return message.reply({ embeds: [embed], components: [row] });
        }

        if (vsBot) {
            await startBotGame(message, message.author);
        } else {
            await sendInvitation(message, message.author, challenger);
        }
    },

    // ─── معالج التفاعلات ────────────────────────────────────────────────
    async handleTicTacToeInteraction(interaction) {
        const id = interaction.customId;

        // ── خيار البدء
        if (id.startsWith('ttt_start_')) {
            const parts = id.split('_');
            const mode = parts[2]; // bot أو pvp
            const ownerId = parts[3];

            if (interaction.user.id !== ownerId) {
                return interaction.reply({ content: '❌ هذه الأزرار لصاحب الأمر فقط!', flags: MessageFlags.Ephemeral });
            }

            await interaction.deferUpdate();

            if (mode === 'bot') {
                await startBotGame(interaction.message, interaction.user);
            } else {
                // وضع PvP — إرسال دعوة
                const embed = new EmbedBuilder()
                    .setColor('#5865F2')
                    .setTitle('❌⭕ دعوة لعبة اكس او')
                    .setDescription(`> 🎮 ${interaction.user} يتحدى أي شخص!\n> اضغط **قبول** للعب معه!\n\n⏰ تنتهي الدعوة بعد دقيقة واحدة`)
                    .setFooter({ text: `المتحدي: ${interaction.user.username}` });

                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId(`ttt_accept_${interaction.user.id}`)
                        .setLabel('✅ قبول التحدي!')
                        .setStyle(ButtonStyle.Success),
                    new ButtonBuilder()
                        .setCustomId(`ttt_decline_${interaction.user.id}`)
                        .setLabel('❌ إلغاء')
                        .setStyle(ButtonStyle.Danger),
                );

                await interaction.message.edit({ embeds: [embed], components: [row] });

                // انتهاء الدعوة بعد دقيقة
                setTimeout(async () => {
                    if (!tttGames.has(interaction.channelId)) {
                        embed.setDescription(`> ❌ انتهت الدعوة — لم ينضم أحد.`).setColor('#ED4245');
                        interaction.message.edit({ embeds: [embed], components: [] }).catch(() => {});
                    }
                }, 60000);
            }
            return;
        }

        // ── قبول الدعوة
        if (id.startsWith('ttt_accept_')) {
            const challengerId = id.split('_')[2];
            if (interaction.user.id === challengerId) {
                return interaction.reply({ content: '❌ لا يمكنك قبول تحديك الخاص!', flags: MessageFlags.Ephemeral });
            }
            if (tttGames.has(interaction.channelId)) {
                return interaction.reply({ content: '⚠️ اللعبة بدأت بالفعل!', flags: MessageFlags.Ephemeral });
            }

            const guild = interaction.guild;
            const challenger = await guild.members.fetch(challengerId).catch(() => null);
            if (!challenger) return interaction.reply({ content: '❌ لم يتم إيجاد المتحدي!', flags: MessageFlags.Ephemeral });

            await interaction.deferUpdate();
            await startPvPGame(interaction, challenger.user, interaction.user);
            return;
        }

        // ── رفض الدعوة
        if (id.startsWith('ttt_decline_')) {
            const challengerId = id.split('_')[2];
            if (interaction.user.id !== challengerId) {
                return interaction.reply({ content: '❌ فقط صاحب الدعوة يستطيع إلغاءها!', flags: MessageFlags.Ephemeral });
            }
            await interaction.update({
                embeds: [new EmbedBuilder().setColor('#ED4245').setTitle('❌ تم إلغاء الدعوة').setDescription('> ألغى صاحب الدعوة اللعبة.')],
                components: []
            });
            return;
        }

        // ── حركة اللعبة
        if (id.startsWith('ttt_move_')) {
            const parts = id.split('_');
            const gameId = parts[2];
            const cellIdx = parseInt(parts[3]);

            const game = tttGames.get(interaction.channelId);
            if (!game || game.id !== gameId) {
                return interaction.reply({ content: '❌ هذه اللعبة انتهت أو غير موجودة.', flags: MessageFlags.Ephemeral });
            }

            // تحقق من الدور
            const expectedPlayer = game.currentTurn === 'X' ? game.player1 : game.player2;
            if (!expectedPlayer || interaction.user.id !== expectedPlayer.id) {
                return interaction.reply({ content: `❌ ليس دورك! دور **${expectedPlayer?.username || 'اللاعب الآخر'}**`, flags: MessageFlags.Ephemeral });
            }

            // تحقق من الخلية
            if (game.board[cellIdx]) {
                return interaction.reply({ content: '❌ هذه الخلية محجوزة!', flags: MessageFlags.Ephemeral });
            }

            // تنفيذ الحركة
            game.board[cellIdx] = game.currentTurn;

            // فحص الفوز/التعادل
            const winResult = checkWinner(game.board);
            const isDraw = !winResult && !game.board.includes(null);

            if (winResult || isDraw) {
                await endGame(game, interaction);
            } else {
                // تبديل الدور
                game.currentTurn = game.currentTurn === 'X' ? 'O' : 'X';
                await updateGame(game, interaction);

                // دور البوت
                if (game.vsBot && game.currentTurn === 'O' && !game.ended) {
                    await playBotTurn(game);
                }
            }
        }
    }
};

// ─── بدء لعبة ضد البوت ───────────────────────────────────────────────────────
async function startBotGame(msgOrInteraction, player) {
    const channelId = msgOrInteraction.channelId || msgOrInteraction.channel?.id;
    const gameId = `${channelId}_${Date.now()}`;

    const game = {
        id: gameId,
        channelId,
        player1: player,   // X
        player2: null,     // O = البوت
        vsBot: true,
        board: Array(9).fill(null),
        currentTurn: 'X',
        ended: false,
        message: null
    };

    tttGames.set(channelId, game);

    const embed = buildGameEmbed(game);
    const components = buildBoard(game);

    let msg;
    if (msgOrInteraction.editedTimestamp !== undefined || msgOrInteraction.edit) {
        // رسالة عادية
        msg = await msgOrInteraction.edit({ embeds: [embed], components }).catch(
            () => msgOrInteraction.channel?.send({ embeds: [embed], components })
        );
    } else {
        msg = await msgOrInteraction.channel?.send({ embeds: [embed], components });
    }

    game.message = msg;

    // انتهاء اللعبة بعد 5 دقائق
    setTimeout(() => {
        if (tttGames.get(channelId)?.id === gameId) {
            game.ended = true;
            tttGames.delete(channelId);
            msg?.edit({ content: '⏰ انتهت اللعبة بسبب عدم النشاط.', embeds: [], components: [] }).catch(() => {});
        }
    }, 5 * 60 * 1000);
}

// ─── بدء لعبة PvP ────────────────────────────────────────────────────────────
async function startPvPGame(interaction, player1, player2) {
    const channelId = interaction.channelId;
    const gameId = `${channelId}_${Date.now()}`;

    // عشوائية من يبدأ
    const first = Math.random() < 0.5;
    const xPlayer = first ? player1 : player2;
    const oPlayer = first ? player2 : player1;

    const game = {
        id: gameId,
        channelId,
        player1: xPlayer,  // X
        player2: oPlayer,  // O
        vsBot: false,
        board: Array(9).fill(null),
        currentTurn: 'X',
        ended: false,
        message: null
    };

    tttGames.set(channelId, game);

    const embed = buildGameEmbed(game, `✅ ${player2.username} قبل التحدي!\n\n🎮 **الدور على:** ${xPlayer.username} (❌)`);
    const components = buildBoard(game);

    const msg = await interaction.message.edit({ embeds: [embed], components });
    game.message = msg;

    // انتهاء اللعبة بعد 10 دقائق
    setTimeout(() => {
        if (tttGames.get(channelId)?.id === gameId) {
            game.ended = true;
            tttGames.delete(channelId);
            msg?.edit({ content: '⏰ انتهت اللعبة بسبب عدم النشاط.', embeds: [], components: [] }).catch(() => {});
        }
    }, 10 * 60 * 1000);
}

// ─── إرسال دعوة PvP ──────────────────────────────────────────────────────────
async function sendInvitation(message, challenger, target) {
    if (target.bot) return message.reply('❌ لا يمكنك تحدي بوت!');
    if (target.id === challenger.id) return message.reply('❌ لا يمكنك تحدي نفسك!');

    const embed = new EmbedBuilder()
        .setColor('#5865F2')
        .setTitle('❌⭕ دعوة لعبة اكس او')
        .setDescription(`> 🎮 ${challenger} يتحدى ${target}!\n> اضغط **قبول** للموافقة\n\n⏰ تنتهي الدعوة بعد دقيقة`)
        .setFooter({ text: `المتحدي: ${challenger.username}` });

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`ttt_accept_${challenger.id}`)
            .setLabel('✅ قبول التحدي!')
            .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
            .setCustomId(`ttt_decline_${challenger.id}`)
            .setLabel('❌ رفض')
            .setStyle(ButtonStyle.Danger),
    );

    const msg = await message.reply({ content: `${target}`, embeds: [embed], components: [row] });

    setTimeout(async () => {
        if (!tttGames.has(message.channel.id)) {
            embed.setDescription(`> ❌ ${target.username} لم يرد على الدعوة.`).setColor('#ED4245');
            msg.edit({ embeds: [embed], components: [] }).catch(() => {});
        }
    }, 60000);
}

// ─── حركة البوت بتأخير ───────────────────────────────────────────────────────
async function playBotTurn(game) {
    if (game.ended) return;
    await new Promise(r => setTimeout(r, 800)); // تأخير واقعي
    if (game.ended) return;

    const idx = getBotMove(game.board);
    if (idx === undefined || idx === null) return;

    game.board[idx] = 'O';

    const winResult = checkWinner(game.board);
    const isDraw = !winResult && !game.board.includes(null);

    if (winResult || isDraw) {
        await endGame(game);
    } else {
        game.currentTurn = 'X';
        await updateGame(game);
    }
}
