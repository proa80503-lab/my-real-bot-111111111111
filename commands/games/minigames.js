'use strict';

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║  🎯 MINI-GAMES HUB v2.0 — ألعاب مصغرة من المستقبل                     ║
 * ║  Snake | Memory+ | Word Chain | Number Bomb | Speed Challenge           ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const db = require('../../utils/database');
const config = require('../../config');
const achievementsCmd = require('../main/achievements-cmd');

// ─── لعبة تسلسل الأرقام (Number Bomb) ──────────────────────────────────────
const activeBombs = new Map(); // channelId -> { target, current, players }

async function playNumberBomb(message) {
    if (activeBombs.has(message.channel.id)) {
        return message.reply('⚠️ هناك لعبة **Number Bomb** نشطة في هذه القناة!');
    }

    const target = Math.floor(Math.random() * 50) + 20; // 20-70
    const betAmount = 200;

    const embed = new EmbedBuilder()
        .setColor('#FF6B6B')
        .setTitle('💣 Number Bomb — الألغام الرقمية!')
        .setDescription([
            '> أضف أرقاماً من **1 إلى 5** في كل مرة!',
            '> **من يصل للرقم المحدد — يخسر ويدفع 200 عملة!**',
            '',
            '> ابدأ بكتابة رقم (1-5)...',
            '> الرقم الحالي: **0**',
        ].join('\n'))
        .addFields({ name: '🎯 الهدف', value: `||**${target}**|| (مخفي حتى النهاية!)`, inline: true })
        .setFooter({ text: '⏰ كل لاعب عنده 15 ثانية للرد' });

    await message.reply({ embeds: [embed] });

    let current = 0;
    const players = new Map();
    let lastPlayer = null;
    let isActive = true;

    activeBombs.set(message.channel.id, { target, current: 0, isActive: true });

    const collector = message.channel.createMessageCollector({
        time: 5 * 60 * 1000, // 5 دقائق
        filter: (m) => !m.author.bot && /^[1-5]$/.test(m.content.trim())
    });

    collector.on('collect', async (msg) => {
        if (!isActive) return;

        const num = parseInt(msg.content.trim());
        const userId = msg.author.id;

        // لا يمكن اللاعب أن يلعب مرتين متتاليتين
        if (userId === lastPlayer) {
            const warn = await msg.reply('⚠️ لا يمكنك اللعب مرتين متتاليتين!').catch(() => null);
            if (warn) setTimeout(() => warn.delete().catch(() => {}), 3000);
            return;
        }

        current += num;
        lastPlayer = userId;
        players.set(userId, (players.get(userId) || 0) + 1);

        if (current >= target) {
            // هذا اللاعب خسر!
            isActive = false;
            activeBombs.delete(message.channel.id);
            collector.stop();

            const loserData = db.getUserData(userId);
            const fine = Math.min(betAmount, loserData.balance || 0);
            if (fine > 0) {
                db.updateFields(userId, { balance: (loserData.balance || 0) - fine });
            }

            const loseEmbed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('💥 BOOM! انفجرت القنبلة!')
                .setDescription([
                    `> 💣 ${msg.author} **وصل للرقم ${current} وفجّر القنبلة!**`,
                    `> 🎯 الهدف الخفي كان: **${target}**`,
                    `> 💸 خسر: **${fine.toLocaleString()} ${config.currency}**`,
                ].join('\n'))
                .addFields({
                    name: '📊 إحصائيات اللعبة',
                    value: [...players.entries()]
                        .sort((a, b) => b[1] - a[1])
                        .map(([uid, turns]) => `<@${uid}> — ${turns} دور`)
                        .join('\n') || '*لاعب واحد*'
                })
                .setTimestamp();

            await message.channel.send({ embeds: [loseEmbed] });
        } else {
            // متابعة
            const safeEmbed = new EmbedBuilder()
                .setColor(current > target * 0.8 ? '#FF6B6B' : current > target * 0.5 ? '#FFD700' : '#00FF88')
                .setTitle(`💣 Number Bomb — الرقم: ${current}`)
                .setDescription([
                    `> ${msg.author} أضاف **${num}** → الإجمالي: **${current}**`,
                    `> ${current > target * 0.8 ? '🔴 **خطر! القنبلة على وشك الانفجار!**' : current > target * 0.5 ? '🟡 **توخَّ الحذر!**' : '🟢 آمن'}`,
                    '',
                    '> اكتب رقماً من 1 إلى 5...',
                ].join('\n'));

            await msg.reply({ embeds: [safeEmbed] });
        }
    });

    collector.on('end', () => {
        activeBombs.delete(message.channel.id);
        if (isActive) {
            message.channel.send('⏰ **انتهى وقت لعبة Number Bomb!**').catch(() => {});
        }
    });
}

// ─── تحدي السرعة (Speed Challenge) ───────────────────────────────────────────
const speedChallenges = new Map();

const SPEED_CHALLENGES = {
    math: () => {
        const a = Math.floor(Math.random() * 20) + 5;
        const b = Math.floor(Math.random() * 20) + 5;
        const ops = ['+', '-', '*'];
        const op = ops[Math.floor(Math.random() * ops.length)];
        const ans = op === '+' ? a + b : op === '-' ? a - b : a * b;
        return { question: `${a} ${op} ${b} = ?`, answer: String(ans) };
    },
    capital: () => {
        const countries = [
            { q: 'عاصمة اليابان؟', a: 'طوكيو' },
            { q: 'عاصمة فرنسا؟', a: 'باريس' },
            { q: 'عاصمة البرازيل؟', a: 'برازيليا' },
            { q: 'عاصمة استراليا؟', a: 'كانبرا' },
            { q: 'عاصمة كندا؟', a: 'أوتاوا' },
            { q: 'عاصمة مصر؟', a: 'القاهرة' },
            { q: 'عاصمة تركيا؟', a: 'أنقرة' },
        ];
        const c = countries[Math.floor(Math.random() * countries.length)];
        return { question: c.q, answer: c.a };
    },
    arabic: () => {
        const words = [
            { q: 'كلمة فيها 7 حروف تبدأ بـ ب؟ (مثال: بطيخة)', a: 'بطيخة' },
            { q: 'ما هو عكس كلمة "كبير"؟', a: 'صغير' },
            { q: 'ما هو جمع كلمة "كتاب"؟', a: 'كتب' },
        ];
        const w = words[Math.floor(Math.random() * words.length)];
        return { question: w.q, answer: w.a };
    }
};

async function playSpeedChallenge(message) {
    const channelId = message.channel.id;

    if (speedChallenges.has(channelId)) {
        return message.reply('⚠️ هناك تحدي سرعة نشط بالفعل!');
    }

    const types = Object.keys(SPEED_CHALLENGES);
    const type = types[Math.floor(Math.random() * types.length)];
    const challenge = SPEED_CHALLENGES[type]();
    const prize = Math.floor(Math.random() * 400) + 200; // 200-600

    speedChallenges.set(channelId, { answer: challenge.answer.toLowerCase(), prize });

    const embed = new EmbedBuilder()
        .setColor('#9B59B6')
        .setTitle('⚡ تحدي السرعة!')
        .setDescription([
            `> **${challenge.question}**`,
            '',
            `> 🎁 الجائزة: **${prize.toLocaleString()} ${config.currency}**`,
            '> ⏰ **لديك 20 ثانية!**',
        ].join('\n'))
        .setFooter({ text: 'أول من يجيب يفوز!' });

    await message.reply({ embeds: [embed] });

    const collector = message.channel.createMessageCollector({
        time: 20000,
        filter: (m) => !m.author.bot
    });

    let won = false;

    collector.on('collect', async (msg) => {
        const userAnswer = msg.content.toLowerCase().trim();
        const correctAnswer = challenge.answer.toLowerCase();

        if (userAnswer === correctAnswer || userAnswer.includes(correctAnswer)) {
            won = true;
            collector.stop();

            const userId = msg.author.id;
            db.addMoney(userId, prize);
            db.addTransaction(userId, 'speed_challenge', prize, `تحدي السرعة: ${challenge.question}`);

            await achievementsCmd.checkAchievements(userId, 'win', { amount: prize }, msg);

            const winEmbed = new EmbedBuilder()
                .setColor('#00FF88')
                .setTitle('✅ إجابة صحيحة!')
                .setDescription([
                    `> 🏆 ${msg.author} **فاز بتحدي السرعة!**`,
                    `> ✅ الإجابة الصحيحة: **${challenge.answer}**`,
                    `> 💰 الجائزة: **+${prize.toLocaleString()} ${config.currency}**`,
                ].join('\n'));

            await msg.reply({ embeds: [winEmbed] });
        }
    });

    collector.on('end', () => {
        speedChallenges.delete(channelId);
        if (!won) {
            message.channel.send([
                `⏰ **انتهى الوقت!**`,
                `> الإجابة الصحيحة كانت: **${challenge.answer}**`
            ].join('\n')).catch(() => {});
        }
    });
}

// ─── لعبة تسلسل الكلمات (Word Chain) ─────────────────────────────────────────
const wordChains = new Map(); // channelId -> { lastWord, usedWords, players }

async function playWordChain(message) {
    const channelId = message.channel.id;

    if (wordChains.has(channelId)) {
        return message.reply('⚠️ هناك لعبة **تسلسل الكلمات** نشطة! العب فيها أو انتظر انتهاءها.');
    }

    const startWord = ['شمس', 'قمر', 'نجم', 'بحر', 'جبل'][Math.floor(Math.random() * 5)];
    wordChains.set(channelId, {
        lastWord: startWord,
        usedWords: new Set([startWord]),
        players: new Map(),
        lastPlayer: null,
        prize: 0
    });

    const embed = new EmbedBuilder()
        .setColor('#3498DB')
        .setTitle('🔗 تسلسل الكلمات')
        .setDescription([
            '> قاعدة اللعبة: كل كلمة تبدأ بآخر حرف من الكلمة السابقة!',
            '',
            `> 🎯 الكلمة الأولى: **"${startWord}"**`,
            `> آخر حرف: **"${startWord[startWord.length - 1]}"**`,
            '',
            '> اكتب كلمة تبدأ بهذا الحرف. كل كلمة صحيحة = **+50 عملة!**',
            '> من يكتب كلمة مكررة أو خاطئة يخسر **-100 عملة!**',
        ].join('\n'));

    await message.reply({ embeds: [embed] });

    const chain = wordChains.get(channelId);

    const collector = message.channel.createMessageCollector({
        time: 3 * 60 * 1000,
        filter: (m) => !m.author.bot && /^[\u0600-\u06FF]+$/.test(m.content.trim())
    });

    collector.on('collect', async (msg) => {
        const word = msg.content.trim().toLowerCase();
        const userId = msg.author.id;
        const c = wordChains.get(channelId);
        if (!c) return;

        const lastChar = c.lastWord[c.lastWord.length - 1];

        if (userId === c.lastPlayer) {
            await msg.react('⛔').catch(() => {});
            return;
        }

        if (word[0] !== lastChar) {
            // حرف خاطئ
            await msg.react('❌').catch(() => {});
            db.updateFields(userId, { balance: Math.max(0, (db.getUserData(userId).balance || 0) - 100) });
            await msg.reply(`❌ الكلمة يجب أن تبدأ بـ **"${lastChar}"**! (-100 ${config.currency})`);
        } else if (c.usedWords.has(word)) {
            // كلمة مكررة
            await msg.react('🔄').catch(() => {});
            db.updateFields(userId, { balance: Math.max(0, (db.getUserData(userId).balance || 0) - 100) });
            await msg.reply(`🔄 الكلمة **"${word}"** استُخدمت من قبل! (-100 ${config.currency})`);
        } else {
            // صحيح!
            c.lastWord = word;
            c.usedWords.add(word);
            c.lastPlayer = userId;
            c.players.set(userId, (c.players.get(userId) || 0) + 50);
            db.addMoney(userId, 50);
            await msg.react('✅').catch(() => {});
        }
    });

    collector.on('end', () => {
        wordChains.delete(channelId);
        const c = chain;
        const topPlayer = [...c.players.entries()].sort((a, b) => b[1] - a[1])[0];

        const endEmbed = new EmbedBuilder()
            .setColor('#95A5A6')
            .setTitle('🔗 انتهت لعبة تسلسل الكلمات!')
            .setDescription([
                topPlayer
                    ? `> 🏆 **أفضل لاعب:** <@${topPlayer[0]}> بـ **${topPlayer[1]} عملة**`
                    : '> لم يفز أحد!',
                `> 📝 **الكلمات المستخدمة:** ${c.usedWords.size} كلمة`,
            ].join('\n'));

        message.channel.send({ embeds: [endEmbed] }).catch(() => {});
    });
}

// ─── الأمر الرئيسي ────────────────────────────────────────────────────────────
module.exports = {
    name: 'minigames',
    aliases: ['ألعاب-مصغرة', 'mini', 'bomb', 'قنبلة', 'سرعة', 'speed', 'chain', 'تسلسل'],
    description: 'ألعاب مصغرة متطورة',
    usage: 'mini [bomb|speed|chain]',

    async execute(message, args) {
        const sub = (args[0] || '').toLowerCase();

        if (sub === 'bomb' || sub === 'قنبلة') {
            return await playNumberBomb(message);
        } else if (sub === 'speed' || sub === 'سرعة') {
            return await playSpeedChallenge(message);
        } else if (sub === 'chain' || sub === || sub === 'تسلسل') {
            return await playWordChain(message);
        } else {
            // عرض القائمة
            const embed = new EmbedBuilder()
                .setColor('#E74C3C')
                .setTitle('🎮 الألعاب المصغرة')
                .setDescription('> اختر لعبة وابدأ المتعة!')
                .addFields(
                    { name: '💣 Number Bomb', value: '`mini bomb` — لعبة الأرقام المتفجرة! اجمع أرقاماً ولا تصل للهدف!', inline: false },
                    { name: '⚡ Speed Challenge', value: '`mini speed` — تحدي السرعة! أجب على السؤال أول من يجيب يفوز!', inline: false },
                    { name: '🔗 Word Chain', value: '`mini chain` — تسلسل الكلمات! كل كلمة تبدأ بآخر حرف!', inline: false },
                )
                .setFooter({ text: `💰 جميع الألعاب تمنح مكافآت عملة! البريفكس: ${config.prefix}` });

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('mg_bomb').setLabel('💣 Bomb').setStyle(ButtonStyle.Danger),
                new ButtonBuilder().setCustomId('mg_speed').setLabel('⚡ Speed').setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId('mg_chain').setLabel('🔗 Chain').setStyle(ButtonStyle.Secondary),
            );

            const reply = await message.reply({ embeds: [embed], components: [row] });
            const collector = reply.createMessageComponentCollector({ time: 30000 });
            collector.on('collect', async (i) => {
                if (i.user.id !== message.author.id) return i.reply({ content: '❌', flags: MessageFlags.Ephemeral });
                await i.deferUpdate();
                if (i.customId === 'mg_bomb') await playNumberBomb(message);
                else if (i.customId === 'mg_speed') await playSpeedChallenge(message);
                else if (i.customId === 'mg_chain') await playWordChain(message);
            });
        }
    }
};
