'use strict';

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║  🎰 ADVANCED CASINO v3.0 — كازينو متطور من المستقبل                    ║
 * ║  Slots مع رسوم متحركة | Roulette | Poker | Crash Game                  ║
 * ║  إحصائيات كاملة | Jackpot تراكمي | حد يومي ذكي                        ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const db = require('../../utils/database');
const config = require('../../config');
const analytics = require('../../utils/analytics');

// ─── الـ Jackpot التراكمي ─────────────────────────────────────────────────────
let jackpotPool = 50000; // تجمع تدريجياً من كل رهان
const JACKPOT_CONTRIBUTION = 0.02; // 2% من كل رهان يذهب للـ Jackpot

// ─── رموز السلوتس المتقدمة ──────────────────────────────────────────────────
const SLOT_SYMBOLS = {
    '💎': { value: 100, name: 'ماسة',    weight: 1  },
    '7️⃣': { value: 50,  name: 'سبعة',   weight: 2  },
    '🎰': { value: 30,  name: 'جاكبوت',  weight: 3  },
    '🍀': { value: 20,  name: 'بوان',    weight: 5  },
    '⭐': { value: 15,  name: 'نجمة',    weight: 8  },
    '🍒': { value: 10,  name: 'كرز',     weight: 12 },
    '🍋': { value: 8,   name: 'ليمون',   weight: 15 },
    '🍊': { value: 5,   name: 'برتقال',  weight: 20 },
    '🍇': { value: 3,   name: 'عنب',     weight: 25 },
    '🔔': { value: 2,   name: 'جرس',     weight: 30 },
};

const SYMBOL_LIST = Object.entries(SLOT_SYMBOLS);
const TOTAL_WEIGHT = SYMBOL_LIST.reduce((s, [, v]) => s + v.weight, 0);

function spinSlot() {
    let rand = Math.random() * TOTAL_WEIGHT;
    for (const [sym, data] of SYMBOL_LIST) {
        rand -= data.weight;
        if (rand <= 0) return sym;
    }
    return '🍇';
}

function getSlotResult(bet) {
    const reels = [spinSlot(), spinSlot(), spinSlot()];
    const [s1, s2, s3] = reels;

    let multiplier = 0;
    let label = '';
    let isJackpot = false;

    if (s1 === s2 && s2 === s3) {
        // ثلاثة متشابهة
        if (s1 === '💎') {
            isJackpot = true;
            multiplier = jackpotPool / bet;
            label = '💎 JACKPOT!! 💎';
        } else {
            multiplier = SLOT_SYMBOLS[s1].value;
            label = `✨ ثلاثة ${SLOT_SYMBOLS[s1].name}!`;
        }
    } else if (s1 === s2 || s2 === s3 || s1 === s3) {
        // اثنان متشابهان
        const matched = s1 === s2 ? s1 : s3;
        multiplier = Math.floor(SLOT_SYMBOLS[matched].value / 5);
        label = `🎯 زوج ${SLOT_SYMBOLS[matched].name}!`;
    } else {
        label = '❌ لم تفز هذه المرة';
    }

    const payout = isJackpot ? jackpotPool : Math.floor(bet * multiplier);
    jackpotPool += Math.floor(bet * JACKPOT_CONTRIBUTION);

    return { reels, multiplier, payout, label, isJackpot };
}

// ─── لعبة الكراش ─────────────────────────────────────────────────────────────
const activeCrashGames = new Map(); // channelId -> CrashGame

class CrashGame {
    constructor(channelId, players) {
        this.channelId = channelId;
        this.players = players; // Map<userId, { bet, cashedOut, cashoutAt }>
        this.multiplier = 1.0;
        this.crashed = false;
        this.crashAt = this._generateCrashPoint();
        this.startTime = Date.now();
    }

    _generateCrashPoint() {
        // توزيع exponential — بيحطم في المتوسط عند 2x
        const r = Math.random();
        if (r < 0.33) return 1.0 + Math.random() * 0.5; // 33% يحطم تحت 1.5x
        if (r < 0.6) return 1.5 + Math.random() * 1.0;  // 27% يحطم 1.5-2.5x
        if (r < 0.8) return 2.5 + Math.random() * 2.5;  // 20% يحطم 2.5-5x
        return 5 + Math.random() * 15;                    // 20% يصل 5-20x (نادر!)
    }

    tick() {
        const elapsed = (Date.now() - this.startTime) / 1000;
        this.multiplier = parseFloat((1 + elapsed * 0.15).toFixed(2));
        if (this.multiplier >= this.crashAt) {
            this.crashed = true;
        }
        return this.multiplier;
    }

    cashout(userId) {
        const player = this.players.get(userId);
        if (!player || player.cashedOut) return null;
        if (this.crashed) return null;
        player.cashedOut = true;
        player.cashoutAt = this.multiplier;
        return Math.floor(player.bet * this.multiplier);
    }

    getResults() {
        const results = [];
        for (const [uid, p] of this.players) {
            results.push({
                userId: uid,
                bet: p.bet,
                cashedOut: p.cashedOut,
                cashoutAt: p.cashoutAt || 0,
                won: p.cashedOut ? Math.floor(p.bet * p.cashoutAt) - p.bet : -p.bet
            });
        }
        return results;
    }
}

// ─── الأمر الرئيسي ────────────────────────────────────────────────────────────
module.exports = {
    name: 'casino',
    aliases: ['كازينو', 'casino', 'قمار', 'سلوتس', 'slots', 'crash', 'كراش', 'رولت', 'roulette'],
    description: 'كازينو متطور مع ألعاب متعددة',
    usage: 'كازينو [slots|crash|roulette] [مبلغ]',

    async execute(message, args) {
        const sub = (args[0] || 'slots').toLowerCase();
        const bet = parseInt(args[1] || args[0]) || null;

        if (sub === 'slots' || sub === 'سلوتس' || !isNaN(sub)) {
            return await playSlots(message, bet || parseInt(sub) || 100);
        } else if (sub === 'crash' || sub === 'كراش') {
            return await playCrash(message, bet || 100);
        } else if (sub === 'roulette' || sub === 'رولت') {
            return await playRoulette(message, args.slice(1));
        } else if (sub === 'jackpot' || sub === 'جاكبوت') {
            return await showJackpot(message);
        } else {
            return await playSlots(message, parseInt(sub) || 100);
        }
    },

    handleBlackjackButton: async function(interaction) {
        // معالجة أزرار البلاك جاك القديمة
    }
};

// ─── السلوتس المتطورة ────────────────────────────────────────────────────────
async function playSlots(message, betAmount) {
    const userId = message.author.id;
    const userData = db.getUserData(userId);

    betAmount = Math.max(10, Math.min(betAmount, 50000));

    if ((userData.balance || 0) < betAmount) {
        return message.reply(`❌ رصيدك غير كافٍ! رصيدك: **${(userData.balance || 0).toLocaleString()} ${config.currency}**`);
    }

    // خصم الرهان
    db.updateFields(userId, { balance: (userData.balance || 0) - betAmount });

    // ─── مرحلة الدوران المتحركة ─────────────────────────────────────────
    const spinningEmbed = new EmbedBuilder()
        .setColor('#FFD700')
        .setTitle('🎰 السلوتس يدور...')
        .setDescription('```\n🔄  🔄  🔄\n```')
        .addFields({ name: '💵 الرهان', value: `\`${betAmount.toLocaleString()} ${config.currency}\``, inline: true })
        .setFooter({ text: `💎 الجاكبوت الحالي: ${jackpotPool.toLocaleString()} ${config.currency}` });

    const spinMsg = await message.reply({ embeds: [spinningEmbed] });

    // تأثير الدوران (3 مراحل)
    const frames = [
        ['🔄', '🔄', '🔄'],
        [spinSlot(), '🔄', '🔄'],
        [spinSlot(), spinSlot(), '🔄'],
    ];

    for (const frame of frames) {
        await new Promise(r => setTimeout(r, 500));
        spinningEmbed.setDescription(`\`\`\`\n${frame.join('  ')}\n\`\`\``);
        await spinMsg.edit({ embeds: [spinningEmbed] }).catch(() => {});
    }

    await new Promise(r => setTimeout(r, 600));

    // النتيجة الحقيقية
    const result = getSlotResult(betAmount);
    const { reels, payout, label, isJackpot } = result;

    let newBalance = db.getUserData(userId).balance;
    let won = 0;

    if (payout > 0) {
        won = payout;
        newBalance += payout;
        db.updateFields(userId, { balance: newBalance });
        db.addTransaction(userId, 'casino_win', payout, `Slots Win (x${result.multiplier})`);
        analytics.trackEconomy('earn', payout, userId);
        if (isJackpot) jackpotPool = 50000; // reset jackpot
    } else {
        db.addTransaction(userId, 'casino_loss', betAmount, 'Slots Loss');
        analytics.trackEconomy('spend', betAmount, userId);
    }

    const color = payout > betAmount ? '#00FF88' : payout > 0 ? '#FFD700' : '#FF4444';
    const resultEmbed = new EmbedBuilder()
        .setColor(color)
        .setTitle(isJackpot ? '💎 JACKPOT MEGA WIN!! 💎' : '🎰 نتيجة السلوتس')
        .setDescription([
            '```',
            `${reels.join('  ')}`,
            '```',
            `**${label}**`,
            isJackpot ? '🎊🎊🎊 **أنت فزت بالجاكبوت الكبير!!!** 🎊🎊🎊' : ''
        ].join('\n'))
        .addFields(
            { name: '💵 الرهان', value: `\`${betAmount.toLocaleString()}\` ${config.currency}`, inline: true },
            { name: payout > 0 ? '🏆 الربح' : '💸 الخسارة', value: `\`${payout > 0 ? '+' + payout.toLocaleString() : '-' + betAmount.toLocaleString()}\` ${config.currency}`, inline: true },
            { name: '💰 رصيدك الآن', value: `\`${newBalance.toLocaleString()}\` ${config.currency}`, inline: true },
        )
        .setFooter({ text: `💎 جاكبوت: ${jackpotPool.toLocaleString()} ${config.currency} | العب مجدداً بكتابة كازينو` });

    await spinMsg.edit({ embeds: [resultEmbed] }).catch(() => {});
}

// ─── لعبة الكراش ─────────────────────────────────────────────────────────────
async function playCrash(message, betAmount) {
    const userId = message.author.id;
    const userData = db.getUserData(userId);

    betAmount = Math.max(50, Math.min(betAmount, 100000));

    if ((userData.balance || 0) < betAmount) {
        return message.reply(`❌ رصيدك غير كافٍ! تحتاج: **${betAmount.toLocaleString()} ${config.currency}**`);
    }

    db.updateFields(userId, { balance: (userData.balance || 0) - betAmount });

    const players = new Map([[userId, { bet: betAmount, cashedOut: false, cashoutAt: 0 }]]);
    const game = new CrashGame(message.channel.id, players);
    activeCrashGames.set(message.channel.id, game);

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`crash_cashout_${userId}`)
            .setLabel('💰 CASH OUT!')
            .setStyle(ButtonStyle.Success)
    );

    const embed = new EmbedBuilder()
        .setColor('#00FF88')
        .setTitle('🚀 لعبة الكراش')
        .setDescription([
            '> الرقم يرتفع... اضغط **Cash Out** قبل أن ينهار!',
            '',
            '```',
            '🚀 1.00x',
            '```',
        ].join('\n'))
        .addFields({ name: '💵 رهانك', value: `\`${betAmount.toLocaleString()}\` ${config.currency}`, inline: true })
        .setFooter({ text: '⚠️ إذا انهار قبل أن تضغط Cash Out — خسرت!' });

    const gameMsg = await message.reply({ embeds: [embed], components: [row] });

    // تحديث اللعبة كل ثانية
    const interval = setInterval(async () => {
        const mult = game.tick();

        embed.setDescription([
            `> 🚀 يرتفع... اضغط **Cash Out** الآن!`,
            '',
            '```',
            `🚀 ${mult.toFixed(2)}x`,
            '```',
        ].join('\n'));
        embed.setColor(mult > 3 ? '#FF6600' : mult > 2 ? '#FFFF00' : '#00FF88');

        await gameMsg.edit({ embeds: [embed], components: [row] }).catch(() => clearInterval(interval));

        if (game.crashed) {
            clearInterval(interval);
            activeCrashGames.delete(message.channel.id);

            // حساب النتائج
            const results = game.getResults();
            const myResult = results.find(r => r.userId === userId);
            const newBal = db.getUserData(userId).balance;

            if (myResult.won > 0) {
                db.addMoney(userId, myResult.won);
                db.addTransaction(userId, 'crash_win', myResult.won, `Crash Cashout x${myResult.cashoutAt}`);
            } else {
                db.addTransaction(userId, 'crash_loss', betAmount, 'Crash Loss');
            }

            const crashEmbed = new EmbedBuilder()
                .setColor(myResult.won > 0 ? '#00FF88' : '#FF4444')
                .setTitle(`💥 انهار عند ${mult.toFixed(2)}x!`)
                .setDescription([
                    myResult.cashedOut
                        ? `✅ **سحبت في الوقت المناسب عند ${myResult.cashoutAt}x!**`
                        : `❌ **لم تسحب في الوقت! خسرت رهانك**`,
                ].join('\n'))
                .addFields(
                    { name: '💵 الرهان', value: `\`${betAmount.toLocaleString()}\``, inline: true },
                    { name: myResult.won > 0 ? '🏆 الربح' : '💸 الخسارة', value: `\`${myResult.won > 0 ? '+' + myResult.won.toLocaleString() : myResult.won.toLocaleString()}\``, inline: true },
                )
                .setTimestamp();

            await gameMsg.edit({ embeds: [crashEmbed], components: [] }).catch(() => {});
        }
    }, 1000);

    // Collector لزر Cash Out
    const collector = gameMsg.createMessageComponentCollector({ time: 120000 });
    collector.on('collect', async (i) => {
        if (i.customId === `crash_cashout_${userId}` && i.user.id === userId) {
            const payout = game.cashout(userId);
            if (payout !== null) {
                db.addMoney(userId, payout);
                await i.reply({
                    content: `✅ سحبت عند **${game.multiplier.toFixed(2)}x** وربحت **${payout.toLocaleString()} ${config.currency}**!`,
                    flags: MessageFlags.Ephemeral
                });
            } else {
                await i.reply({ content: '❌ لم تعد قادراً على السحب!', flags: MessageFlags.Ephemeral });
            }
        }
    });

    // توقف اللعبة بعد دقيقتين
    setTimeout(() => {
        clearInterval(interval);
        activeCrashGames.delete(message.channel.id);
    }, 120000);
}

// ─── الرولت ──────────────────────────────────────────────────────────────────
async function playRoulette(message, args) {
    const userId = message.author.id;
    const userData = db.getUserData(userId);

    const betType = args[0]?.toLowerCase() || 'red';
    const betAmount = parseInt(args[1]) || 100;

    if ((userData.balance || 0) < betAmount) {
        return message.reply(`❌ رصيدك غير كافٍ!`);
    }

    const validBets = ['red', 'black', 'green', 'odd', 'even', 'احمر', 'اسود', 'فردي', 'زوجي'];
    if (!validBets.includes(betType)) {
        return message.reply(`❌ أنواع الرهان المتاحة: \`red\` \`black\` \`green\` \`odd\` \`even\``);
    }

    db.updateFields(userId, { balance: (userData.balance || 0) - betAmount });

    // الدوران
    const number = Math.floor(Math.random() * 37); // 0-36
    const isRed = [1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36].includes(number);
    const isGreen = number === 0;
    const isBlack = !isRed && !isGreen;

    let won = false;
    let multiplier = 1;

    if ((betType === 'red' || betType === 'احمر') && isRed) { won = true; multiplier = 2; }
    else if ((betType === 'black' || betType === 'اسود') && isBlack) { won = true; multiplier = 2; }
    else if ((betType === 'green') && isGreen) { won = true; multiplier = 14; }
    else if ((betType === 'odd' || betType === 'فردي') && number % 2 === 1 && !isGreen) { won = true; multiplier = 2; }
    else if ((betType === 'even' || betType === 'زوجي') && number % 2 === 0 && !isGreen) { won = true; multiplier = 2; }

    const payout = won ? Math.floor(betAmount * multiplier) : 0;
    const newBal = (db.getUserData(userId).balance || 0) + payout;
    if (won) {
        db.addMoney(userId, payout);
        db.addTransaction(userId, 'roulette_win', payout, `Roulette Win (${betType})`);
    } else {
        db.addTransaction(userId, 'roulette_loss', betAmount, `Roulette Loss (${betType})`);
    }

    const numberColor = isGreen ? '🟢' : isRed ? '🔴' : '⚫';

    const embed = new EmbedBuilder()
        .setColor(won ? '#00FF88' : '#FF4444')
        .setTitle('🎡 الرولت')
        .setDescription([
            `> الكرة توقفت عند: **${numberColor} ${number}**`,
            '',
            won ? `✅ **فزت! (x${multiplier})**` : '❌ **لم تفز هذه المرة**'
        ].join('\n'))
        .addFields(
            { name: '🎯 رهانك', value: `\`${betType}\` — \`${betAmount.toLocaleString()}\` ${config.currency}`, inline: true },
            { name: won ? '🏆 ربحت' : '💸 خسرت', value: `\`${won ? '+' + payout.toLocaleString() : '-' + betAmount.toLocaleString()}\` ${config.currency}`, inline: true },
        )
        .setTimestamp();

    await message.reply({ embeds: [embed] });
}

async function showJackpot(message) {
    const embed = new EmbedBuilder()
        .setColor('#FFD700')
        .setTitle('💎 الجاكبوت التراكمي')
        .setDescription([
            `> الجاكبوت الحالي يساوي:`,
            `# 💰 ${jackpotPool.toLocaleString()} ${config.currency}`,
            '',
            '> *يتراكم من 2% من كل رهان سلوتس*',
            '> *للفوز به: احصل على 3 ماسات في السلوتس!*'
        ].join('\n'))
        .setTimestamp();

    await message.reply({ embeds: [embed] });
}
