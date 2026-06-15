const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require('../../utils/database');
const config = require('../../config');
const { PremiumEmbedBuilder, ICONS } = require('../../utils/embed-builder');

// نظام البطولات التلقائية
class TournamentSystem {
    constructor() {
        this.activeTournaments = new Map();
        this.tournamentHistory = [];
    }

    // إنشاء بطولة جديدة
    async createTournament(guild, options = {}) {
        const tournamentId = `tournament_${Date.now()}`;

        const tournament = {
            id: tournamentId,
            guildId: guild.id,
            game: options.game || 'mixed', // 'slots', 'blackjack', 'trivia', 'mixed'
            entryFee: options.entryFee || 1000,
            prizePool: 0,
            maxPlayers: options.maxPlayers || 16,
            participants: [],
            status: 'registration', // 'registration', 'active', 'finished'
            startTime: Date.now() + (options.delayMinutes || 30) * 60 * 1000,
            rounds: [],
            createdAt: Date.now()
        };

        this.activeTournaments.set(tournamentId, tournament);
        return tournament;
    }

    // التسجيل في بطولة
    async registerPlayer(tournamentId, userId, username) {
        const tournament = this.activeTournaments.get(tournamentId);
        if (!tournament) return { success: false, error: 'البطولة غير موجودة!' };

        if (tournament.status !== 'registration') {
            return { success: false, error: 'انتهى وقت التسجيل!' };
        }

        if (tournament.participants.some(p => p.userId === userId)) {
            return { success: false, error: 'أنت مسجّل بالفعل!' };
        }

        if (tournament.participants.length >= tournament.maxPlayers) {
            return { success: false, error: 'البطولة ممتلئة!' };
        }

        const userData = db.getUserData(userId);
        if (userData.balance < tournament.entryFee) {
            return { success: false, error: 'ليس لديك رصيد كافٍ!' };
        }

        // خصم رسوم الدخول
        db.removeMoney(userId, tournament.entryFee);
        tournament.prizePool += tournament.entryFee;

        tournament.participants.push({
            userId,
            username,
            score: 0,
            wins: 0,
            losses: 0,
            eliminated: false
        });

        return { success: true, tournament };
    }

    // بدء البطولة
    async startTournament(tournamentId) {
        const tournament = this.activeTournaments.get(tournamentId);
        if (!tournament) return null;

        tournament.status = 'active';
        tournament.actualStartTime = Date.now();

        // إنشاء جدول المباريات
        tournament.rounds = this.generateBracket(tournament.participants);

        return tournament;
    }

    // توليد جدول المباريات
    generateBracket(participants) {
        const shuffled = [...participants].sort(() => Math.random() - 0.5);
        const rounds = [];
        let currentRound = [];

        for (let i = 0; i < shuffled.length; i += 2) {
            if (i + 1 < shuffled.length) {
                currentRound.push({
                    player1: shuffled[i],
                    player2: shuffled[i + 1],
                    winner: null,
                    completed: false
                });
            } else {
                // لاعب واحد متبقي - يتأهل تلقائياً
                currentRound.push({
                    player1: shuffled[i],
                    player2: null,
                    winner: shuffled[i],
                    completed: true
                });
            }
        }

        rounds.push(currentRound);
        return rounds;
    }

    // عرض البطولات النشطة
    getActiveTournaments(guildId) {
        return Array.from(this.activeTournaments.values())
            .filter(t => t.guildId === guildId);
    }

    // عرض تفاصيل بطولة
    getTournamentEmbed(tournament) {
        const statusEmoji = {
            'registration': '📝',
            'active': '🏆',
            'finished': '✅'
        };

        const embed = PremiumEmbedBuilder.custom({
            color: tournament.status === 'finished' ? '#FFD700' : '#3498DB',
            title: `${statusEmoji[tournament.status]} بطولة ${getGameName(tournament.game)}`,
            description: `معرف: \`${tournament.id}\``,
        });

        // معلومات البطولة
        embed.addFields(
            {
                name: `${ICONS.COIN} جائزة البطولة`,
                value: `**${tournament.prizePool.toLocaleString()}** ${config.currency}`,
                inline: true
            },
            {
                name: '👥 المشاركون',
                value: `${tournament.participants.length}/${tournament.maxPlayers}`,
                inline: true
            },
            {
                name: '💵 رسوم الدخول',
                value: `${tournament.entryFee.toLocaleString()} ${config.currency}`,
                inline: true
            }
        );

        // الحالة
        if (tournament.status === 'registration') {
            const timeLeft = Math.max(0, tournament.startTime - Date.now());
            const minutes = Math.floor(timeLeft / 60000);
            embed.addFields({
                name: '⏰ وقت البداية',
                value: `بعد **${minutes}** دقيقة\nسجّل الآن: \`!tournament join ${tournament.id}\``,
                inline: false
            });
        }

        // عرض المشاركين
        if (tournament.participants.length > 0) {
            const participantsList = tournament.participants
                .slice(0, 10)
                .map((p, i) => `${i + 1}. ${p.username} ${p.eliminated ? '❌' : ''}`)
                .join('\n');

            embed.addFields({
                name: '📋 قائمة المشاركين',
                value: participantsList + (tournament.participants.length > 10 ? `\n...و ${tournament.participants.length - 10} آخرين` : ''),
                inline: false
            });
        }

        // الفائز
        if (tournament.status === 'finished' && tournament.winner) {
            embed.addFields({
                name: '👑 الفائز',
                value: `**${tournament.winner.username}**\nالجائزة: **${tournament.finalPrize.toLocaleString()}** ${config.currency}`,
                inline: false
            });
        }

        return embed;
    }
}

// helper
function getGameName(gameType) {
    const names = {
        'slots': 'سلوتس',
        'blackjack': 'بلاك جاك',
        'trivia': 'معلومات عامة',
        'mixed': 'مختلطة'
    };
    return names[gameType] || 'عامة';
}

// Singleton instance
const tournamentSystem = new TournamentSystem();

// أوامر البطولة
async function tournamentCommand(message, args) {
    const subcommand = args[0]?.toLowerCase();

    if (!subcommand || subcommand === 'list') {
        return await listTournaments(message);
    }

    if (subcommand === 'create') {
        // للإدمن فقط
        if (!message.member.permissions.has('Administrator')) {
            return message.reply('❌ هذا الأمر للإداريين فقط!');
        }
        return await createTournamentCommand(message, args.slice(1));
    }

    if (subcommand === 'join') {
        return await joinTournament(message, args[1]);
    }

    if (subcommand === 'info') {
        return await tournamentInfo(message, args[1]);
    }

    return message.reply('استخدام خاطئ! استخدم: `!tournament list/create/join/info`');
}

async function listTournaments(message) {
    const tournaments = tournamentSystem.getActiveTournaments(message.guild.id);

    if (tournaments.length === 0) {
        return message.reply('📭 لا توجد بطولات نشطة حالياً!');
    }

    const embed = PremiumEmbedBuilder.custom({
        color: '#3498DB',
        title: '🏆 البطولات النشطة',
        description: `عدد البطولات: **${tournaments.length}**`
    });

    tournaments.forEach((t, i) => {
        embed.addFields({
            name: `${i + 1}. ${getGameName(t.game)} - ${t.status === 'registration' ? '📝 تسجيل' : '🏆 نشطة'}`,
            value:
                `معرف: \`${t.id}\`\n` +
                `الجائزة: **${t.prizePool.toLocaleString()}** ${config.currency}\n` +
                `المشاركون: ${t.participants.length}/${t.maxPlayers}\n` +
                `رسوم الدخول: ${t.entryFee.toLocaleString()} ${config.currency}`,
            inline: true
        });
    });

    await message.reply({ embeds: [embed] });
}

async function createTournamentCommand(message, args) {
    const game = args[0] || 'mixed';
    const entryFee = parseInt(args[1]) || 1000;
    const maxPlayers = parseInt(args[2]) || 16;
    const delayMinutes = parseInt(args[3]) || 30;

    const tournament = await tournamentSystem.createTournament(message.guild, {
        game,
        entryFee,
        maxPlayers,
        delayMinutes
    });

    const embed = tournamentSystem.getTournamentEmbed(tournament);
    await message.reply({ embeds: [embed] });

    // جدولة بدء البطولة
    setTimeout(async () => {
        if (tournament.participants.length >= 2) {
            await tournamentSystem.startTournament(tournament.id);
            const channel = message.guild.channels.cache.get(message.channel.id);
            if (channel) {
                channel.send(`🏆 **بطولة ${getGameName(tournament.game)} بدأت!**\nالجائزة: **${tournament.prizePool.toLocaleString()}** ${config.currency}`);
            }
        } else {
            // إلغاء - عدد مشاركين قليل
            tournament.participants.forEach(p => {
                db.addMoney(p.userId, tournament.entryFee); // إرجاع الرسوم
            });
            tournamentSystem.activeTournaments.delete(tournament.id);
        }
    }, delayMinutes * 60 * 1000);
}

async function joinTournament(message, tournamentId) {
    const result = await tournamentSystem.registerPlayer(
        tournamentId,
        message.author.id,
        message.author.username
    );

    if (!result.success) {
        return message.reply(`❌ ${result.error}`);
    }

    const embed = tournamentSystem.getTournamentEmbed(result.tournament);
    await message.reply({ content: '✅ تم تسجيلك في البطولة بنجاح!', embeds: [embed] });
}

async function tournamentInfo(message, tournamentId) {
    const tournament = tournamentSystem.activeTournaments.get(tournamentId);
    if (!tournament) {
        return message.reply('❌ البطولة غير موجودة!');
    }

    const embed = tournamentSystem.getTournamentEmbed(tournament);
    await message.reply({ embeds: [embed] });
}

module.exports = {
    // ─── واجهة الأمر المطلوبة من commandHandler ──────────────────
    name: 'tournament',
    aliases: ['بطولة', 'tournaments'],
    description: 'نظام البطولات — إنشاء، تسجيل، ومعلومات',
    usage: 'tournament [list/create/join/info]',

    async execute(message, args) {
        await tournamentCommand(message, args);
    },

    // ─── export الدوال للاستخدام من ملفات أخرى ──────────────────
    tournamentCommand,
    tournamentSystem,
};
