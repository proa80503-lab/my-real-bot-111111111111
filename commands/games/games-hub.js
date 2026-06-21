/**
 * ═══════════════════════════════════════════════════════════
 * 🎮 لوحة الألعاب — Games Hub
 * نظام أزرار كامل لجميع الألعاب
 * ═══════════════════════════════════════════════════════════
 */

'use strict';

const {
    EmbedBuilder, ActionRowBuilder, ButtonBuilder,
    ButtonStyle, MessageFlags
} = require('discord.js');

const db = require('../../utils/database');
const config = require('../../config');

// ═══════════════════════════════════════════════════════════
// بناء اللوحة الرئيسية للألعاب
// ═══════════════════════════════════════════════════════════
function buildGamesPanel() {
    const embed = new EmbedBuilder()
        .setColor('#9B59B6')
        .setTitle('🎮 مركز الألعاب')
        .setDescription([
            '> اختر لعبتك المفضلة من الأزرار بالأسفل!',
            '',
            '🏆 **العب واربح العملات!**',
            '🧠 تريفيا • ❌⭕ اكس او • ✊ حجر ورقة',
            '📝 كلمة مشفرة • 🔢 رياضيات • 😀 أكمل كلمة',
            '🎯 تحديات يومية'
        ].join('\n'))
        .setTimestamp()
        .setFooter({ text: 'اضغط زر للبدء فوراً!' });

    const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('game_trivia')
            .setLabel('تريفيا 🧠')
            .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
            .setCustomId('game_ttt')
            .setLabel('اكس او ❌⭕')
            .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
            .setCustomId('game_rps')
            .setLabel('حجر ورقة مقص ✊')
            .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
            .setCustomId('game_hangman')
            .setLabel('حرف المشنقة 🎯')
            .setStyle(ButtonStyle.Secondary)
    );

    const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('game_scramble')
            .setLabel('كلمة مشفرة 🔤')
            .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId('game_math')
            .setLabel('رياضيات 🔢')
            .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId('game_8ball')
            .setLabel('التنبؤ 🎱')
            .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId('game_daily_challenges')
            .setLabel('تحديات يومية 🏆')
            .setStyle(ButtonStyle.Success)
    );

    const row3 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('game_leaderboard')
            .setLabel('المتصدرون 📊')
            .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId('game_slots')
            .setLabel('سلوتس 🎰')
            .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
            .setCustomId('game_flip')
            .setLabel('قلّب عملة 🪙')
            .setStyle(ButtonStyle.Primary)
    );

    return { embeds: [embed], components: [row1, row2, row3] };
}

// ═══════════════════════════════════════════════════════════
// معالج الأزرار
// ═══════════════════════════════════════════════════════════
async function handleGameButton(interaction) {
    const id = interaction.customId;
    const userId = interaction.user.id;
    const client = interaction.client;

    // ── تريفيا ────────────────────────────────────────────────
    if (id === 'game_trivia') {
        return interaction.reply({
            content: '> 🧠 اكتب `تريفيا` في الشات لبدء لعبة الأسئلة!',
            flags: MessageFlags.Ephemeral
        });
    }

    // ── اكس او ───────────────────────────────────────────────
    if (id === 'game_ttt') {
        const embed = new EmbedBuilder()
            .setColor('#E74C3C')
            .setTitle('❌⭕ اكس او')
            .setDescription([
                '**اكتب في الشات:** `اكس_او @خصمك`',
                'مثال: `اكس_او @صديقي`',
                '',
                '🎯 العب ضد صديقك واربح!',
            ].join('\n'))
            .setTimestamp();
        return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    }

    // ── حجر ورقة مقص ──────────────────────────────────────────────
    if (id === 'game_rps') {
        return interaction.reply({
            content: '> ✊ اكتب `رحجة @شخص` لبدء لعبة حجر ورقة مقص!',
            flags: MessageFlags.Ephemeral
        });
    }

    // ── حرف المشنقة ──────────────────────────────────────────────
    if (id === 'game_hangman') {
        return interaction.reply({
            content: '> 🎯 اكتب `مشنقة` في الشات لبدء لعبة المشنقة!',
            flags: MessageFlags.Ephemeral
        });
    }

    // ── كلمة مشفرة ───────────────────────────────────────────────
    if (id === 'game_scramble') {
        return interaction.reply({
            content: '> 🔤 اكتب `كلمة` في الشات لبدء لعبة الكلمة المشفرة!',
            flags: MessageFlags.Ephemeral
        });
    }

    // ── رياضيات ────────────────────────────────────────────────
    if (id === 'game_math') {
        return interaction.reply({
            content: '> 🔢 اكتب `رياضيات` في الشات لبدء لعبة الرياضيات!',
            flags: MessageFlags.Ephemeral
        });
    }

    // ── التنبؤ ────────────────────────────────────────────────
    if (id === 'game_8ball') {
        const questions = [
            'سيحدث لك شيء رائع اليوم!',
            'المستقبل يبدو واعداً جداً ✨',
            'لا أرى ذلك يحدث... 🤔',
            'نعم بالتأكيد! 🎉',
            'ربما... حاول مرة أخرى لاحقاً',
            'الكون يقول: نعم! 🌟',
            'الطالع لا يبشر بخير 😅',
            'أوراقي تقول نعم! 🃏',
        ];
        const answer = questions[Math.floor(Math.random() * questions.length)];
        const embed = new EmbedBuilder()
            .setColor('#9B59B6')
            .setTitle('🎱 صداقي التنبؤي')
            .setDescription(`**${interaction.user.username}** طرح سؤالاً على الكون...\n\n> ${answer}`)
            .setTimestamp();
        return interaction.reply({ embeds: [embed] });
    }

    // ── تحديات يومية ─────────────────────────────────────────────
    if (id === 'game_daily_challenges') {
        return interaction.reply({
            content: '> 🏆 اكتب `تحديات` في الشات لعرض التحديات اليومية!',
            flags: MessageFlags.Ephemeral
        });
    }

    // ── سلوتس ─────────────────────────────────────────────────
    if (id === 'game_slots') {
        const userData = db.getUserData(userId);
        const balance = userData.balance || 0;
        const bet = 50;

        if (balance < bet) {
            return interaction.reply({ content: `❌ تحتاج على الأقل **${bet}** ${config.currency} للعب السلوتس!`, flags: MessageFlags.Ephemeral });
        }

        const symbols = ['🍒', '🍋', '🍊', '🍇', '⭐', '💎', '🎰'];
        const reel1 = symbols[Math.floor(Math.random() * symbols.length)];
        const reel2 = symbols[Math.floor(Math.random() * symbols.length)];
        const reel3 = symbols[Math.floor(Math.random() * symbols.length)];

        let multiplier = 0;
        let resultText = '';

        if (reel1 === reel2 && reel2 === reel3) {
            if (reel1 === '💎') { multiplier = 50; resultText = '💎 **JACKPOT!! ×50**'; }
            else if (reel1 === '⭐') { multiplier = 20; resultText = '⭐ **ثلاث نجوم ×20!**'; }
            else { multiplier = 5; resultText = '🎉 **ثلاثة متطابقة ×5!**'; }
        } else if (reel1 === reel2 || reel2 === reel3 || reel1 === reel3) {
            multiplier = 2;
            resultText = '✅ **اثنان متطابقان ×2**';
        } else {
            multiplier = 0;
            resultText = '❌ **لا تطابق — خسارة**';
        }

        const won = bet * multiplier;
        const net = won - bet;

        db.updateFields(userId, { balance: balance + net });

        const color = net > 0 ? '#2ECC71' : net === 0 ? '#F1C40F' : '#E74C3C';
        const embed = new EmbedBuilder()
            .setColor(color)
            .setTitle('🎰 السلوتس')
            .setDescription([
                `┌───────────────────┐`,
                `│  ${reel1}   ${reel2}   ${reel3}  │`,
                `└───────────────────┘`,
                '',
                resultText,
                net > 0 ? `💰 ربحت: **+${won.toLocaleString()} ${config.currency}**` : `💸 خسرت: **${bet} ${config.currency}**`,
            ].join('\n'))
            .setFooter({ text: `الرهان: ${bet} ${config.currency} | اضغط مرة أخرى للعب من جديد` })
            .setTimestamp();

        // زر اللعب مرة أخرى
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('game_slots')
                .setLabel(`العب مجدداً (${bet} ${config.currency}) 🎰`)
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId('games_back')
                .setLabel('رجوع للألعاب 🎮')
                .setStyle(ButtonStyle.Secondary)
        );

        return interaction.reply({ embeds: [embed], components: [row] });
    }

    // ── قلّب عملة ────────────────────────────────────────────
    if (id === 'game_flip') {
        const userData = db.getUserData(userId);
        const balance = userData.balance || 0;
        const bet = 100;

        if (balance < bet) {
            return interaction.reply({ content: `❌ تحتاج **${bet}** ${config.currency} للعب!`, flags: MessageFlags.Ephemeral });
        }

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('flip_heads')
                .setLabel('وجه 👑')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('flip_tails')
                .setLabel('ظهر 🌙')
                .setStyle(ButtonStyle.Secondary)
        );

        const embed = new EmbedBuilder()
            .setColor('#F1C40F')
            .setTitle('🪙 قلّب العملة')
            .setDescription([
                `الرهان: **${bet} ${config.currency}**`,
                '',
                'اختر: **وجه** أو **ظهر**?',
                'العب واكسب ضعف راهنك! 💰',
            ].join('\n'))
            .setTimestamp();

        return interaction.reply({ embeds: [embed], components: [row] });
    }

    // ── نتيجة قلّب العملة ────────────────────────────────────
    if (id === 'flip_heads' || id === 'flip_tails') {
        const userData = db.getUserData(userId);
        const balance = userData.balance || 0;
        const bet = 100;
        const choice = id === 'flip_heads' ? 'heads' : 'tails';
        const result = Math.random() < 0.5 ? 'heads' : 'tails';
        const choiceAr = choice === 'heads' ? 'وجه 👑' : 'ظهر 🌙';
        const resultAr = result === 'heads' ? 'وجه 👑' : 'ظهر 🌙';
        const won = choice === result;

        if (balance < bet) {
            return interaction.update({ content: `❌ رصيدك لا يكفي!`, embeds: [], components: [] });
        }

        if (won) db.addMoney(userId, bet);
        else db.removeMoney(userId, bet);

        const embed = new EmbedBuilder()
            .setColor(won ? '#2ECC71' : '#E74C3C')
            .setTitle('🪙 نتيجة القلّب')
            .setDescription([
                `🎲 النتيجة: **${resultAr}**`,
                `👤 اخترت: **${choiceAr}**`,
                '',
                won
                    ? `🎉 **فزت! +${bet} ${config.currency}**`
                    : `😢 **خسرت! -${bet} ${config.currency}**`,
            ].join('\n'))
            .setTimestamp();

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('game_flip')
                .setLabel('العب مجدداً 🪙')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('games_back')
                .setLabel('رجوع 🎮')
                .setStyle(ButtonStyle.Secondary)
        );

        return interaction.update({ embeds: [embed], components: [row] });
    }

    // ── رجوع للقائمة الرئيسية ─────────────────────────────────
    if (id === 'games_back') {
        const panel = buildGamesPanel();
        return interaction.update({ ...panel });
    }

    // ── المتصدرون ─────────────────────────────────────────────
    if (id === 'game_leaderboard') {
        const allUsers = db.getAllUsers();
        const sorted = Object.entries(allUsers)
            .map(([id, d]) => ({ id, total: (d.balance || 0) + (d.bank || 0) }))
            .sort((a, b) => b.total - a.total)
            .slice(0, 10);

        const lines = await Promise.all(sorted.map(async (u, i) => {
            const user = await interaction.client.users.fetch(u.id).catch(() => ({ username: 'مجهول' }));
            const medal = ['🥇', '🥈', '🥉'][i] || `${i + 1}.`;
            return `${medal} **${user.username}** — ${u.total.toLocaleString()} ${config.currency}`;
        }));

        const embed = new EmbedBuilder()
            .setColor('#FFD700')
            .setTitle('🏆 أثرياء السيرفر')
            .setDescription(lines.join('\n'))
            .setTimestamp();

        return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    }
}

// ═══════════════════════════════════════════════════════════
// الأمر الرئيسي
// ═══════════════════════════════════════════════════════════
module.exports = {
    name: 'games',
    aliases: ['ألعاب', 'العاب', 'العب', 'لعبة'],
    description: 'مركز الألعاب الكامل — بالأزرار',
    usage: 'العاب / games',

    async execute(context) {
        const panel = buildGamesPanel();
        if (context.isCommand?.()) return context.reply({ ...panel });
        return context.reply({ ...panel });
    },

    handleGameButton,
    buildGamesPanel,
};
