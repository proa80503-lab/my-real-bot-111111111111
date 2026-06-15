const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { PremiumEmbedBuilder } = require('../../utils/embed-builder');

const tttGames = new Map();

module.exports = {
    name: 'ttt',
    aliases: ['اكس_او', 'اكساو', 'او_اكس'],
    description: 'لعبة اكس او الشهيرة ضد لاعب آخر',
    usage: 'ttt',

    async execute(message) {
        const player1 = message.author;
        const embed = PremiumEmbedBuilder.game(
            'Tic Tac Toe - اكس او',
            `${player1} يطلب منافساً!\nاكتب **"انضم"** للعب معه.`,
            []
        );

        const msg = await message.channel.send({ embeds: [embed] });

        const filter = m => m.content.toLowerCase() === 'انضم' && m.author.id !== player1.id && !m.author.bot;
        const collector = message.channel.createMessageCollector({ filter, max: 1, time: 60000 });

        collector.on('collect', async m => {
            const player2 = m.author;
            const board = Array(9).fill(null);
            let currentPlayer = Math.random() < 0.5 ? player1 : player2;

            tttGames.set(message.channel.id, { player1, player2, currentPlayer, board, msg });
            await updateTTTBoard(message.channel.id);
        });

        collector.on('end', (collected, reason) => {
            if (collected.size === 0) {
                msg.edit({ content: '❌ لم ينضم أحد.', embeds: [] }).catch(() => { });
            }
        });
    },

    async handleTicTacToeInteraction(interaction) {
        if (!interaction.customId.startsWith('ttt_')) return;

        const channelId = interaction.channel.id;
        const game = tttGames.get(channelId);
        if (!game) return interaction.reply({ content: '❌ اللعبة انتهت.', flags: (require('discord.js').MessageFlags).Ephemeral });

        if (interaction.user.id !== game.currentPlayer.id) {
            return interaction.reply({ content: '❌ ليس دورك!', flags: (require('discord.js').MessageFlags).Ephemeral });
        }

        const index = parseInt(interaction.customId.split('_')[1]);
        game.board[index] = game.currentPlayer.id === game.player1.id ? 'X' : 'O';
        game.currentPlayer = game.currentPlayer.id === game.player1.id ? game.player2 : game.player1;

        await interaction.deferUpdate();
        await updateTTTBoard(channelId);
    }
};

async function updateTTTBoard(channelId) {
    const game = tttGames.get(channelId);
    if (!game) return;

    const { board, currentPlayer, player1, player2, msg } = game;

    const embed = PremiumEmbedBuilder.game(
        'Tic Tac Toe - اكس او',
        `🎮 **الدور على:** ${currentPlayer}\n\n❌ **${player1.tag}**\n⭕ **${player2.tag}**`,
        []
    );

    const rows = [];
    for (let i = 0; i < 3; i++) {
        const row = new ActionRowBuilder();
        for (let j = 0; j < 3; j++) {
            const index = i * 3 + j;
            const label = board[index] === 'X' ? '❌' : board[index] === 'O' ? '⭕' : '\u200b';

            row.addComponents(
                new ButtonBuilder()
                    .setCustomId(`ttt_${index}`)
                    .setLabel(label)
                    .setStyle(board[index] ? ButtonStyle.Secondary : ButtonStyle.Primary)
                    .setDisabled(!!board[index])
            );
        }
        rows.push(row);
    }

    await msg.edit({ embeds: [embed], components: rows });

    const winnerSymbol = checkTTTWinner(board);
    if (winnerSymbol) {
        const winner = winnerSymbol === 'X' ? player1 : player2;
        const winEmbed = PremiumEmbedBuilder.success(
            'انتهت اللعبة! 🎉',
            `👑 الفائز هو: **${winner}**`,
            []
        );
        await msg.edit({ embeds: [winEmbed], components: [] });
        tttGames.delete(channelId);
    } else if (!board.includes(null)) {
        const drawEmbed = PremiumEmbedBuilder.custom({
            title: 'تعادل! 🤝',
            description: 'انتهت اللعبة بالتعادل.',
            color: '#FFA500'
        });
        await msg.edit({ embeds: [drawEmbed], components: [] });
        tttGames.delete(channelId);
    }
}

function checkTTTWinner(board) {
    const wins = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8],
        [0, 3, 6], [1, 4, 7], [2, 5, 8],
        [0, 4, 8], [2, 4, 6]
    ];
    for (const [a, b, c] of wins) {
        if (board[a] && board[a] === board[b] && board[a] === board[c]) return board[a];
    }
    return null;
}
