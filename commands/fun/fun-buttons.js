'use strict';

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║  🔮 FORTUNE v3.0 | 🤔 WYR v3.0 | 🎲 ROLL v3.0 | 💘 SHIP v3.0         ║
 * ║  جميع أوامر الترفيه بالأزرار الاحترافية                                ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, MessageFlags } = require('discord.js');
const config = require('../../config');

// ════════════════════════════════════════════════════════════════════════════
//  🔮 FORTUNE — حظك اليوم
// ════════════════════════════════════════════════════════════════════════════

const FORTUNES = [
    { text: '⭐ يوم رائع ينتظرك! الطاقة الإيجابية تحيط بك.', type: 'great', color: '#FFD700' },
    { text: '💎 فرصة ذهبية ستأتي اليوم — كن منتبهاً!', type: 'great', color: '#FFD700' },
    { text: '🌟 الحظ في صفك — خذ مبادرة جديدة!', type: 'good', color: '#57F287' },
    { text: '🎯 ستحقق أهدافك إذا ثابرت اليوم.', type: 'good', color: '#57F287' },
    { text: '🌈 توقع مفاجأة سارة قريباً جداً!', type: 'good', color: '#57F287' },
    { text: '⚡ طاقة إيجابية عالية — استغل يومك!', type: 'good', color: '#57F287' },
    { text: '🎲 الحظ معك في الألعاب — جرب!', type: 'neutral', color: '#FEE75C' },
    { text: '💰 فرصة ربح مادي قريبة منك.', type: 'neutral', color: '#FEE75C' },
    { text: '🎊 يوم مميز للقاءات والعلاقات.', type: 'neutral', color: '#FEE75C' },
    { text: '📚 يوم جيد للتعلم والتطوير.', type: 'neutral', color: '#FEE75C' },
    { text: '😐 يوم عادي — تصرف بحكمة.', type: 'meh', color: '#95A5A6' },
    { text: '⚠️ تجنب قرارات كبيرة اليوم.', type: 'bad', color: '#ED4245' },
];

const LUCKY_COLORS = ['🔴 أحمر', '🔵 أزرق', '🟢 أخضر', '🟡 أصفر', '🟣 بنفسجي', '⚫ أسود', '⚪ أبيض', '🟠 برتقالي'];
const LUCKY_ELEMENTS = ['🔥 نار', '💧 ماء', '🌍 أرض', '💨 هواء', '⚡ برق', '🌙 قمر', '☀️ شمس'];

function buildFortuneEmbed(user) {
    const seed = user.id + new Date().toDateString();
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
        hash = ((hash << 5) - hash) + seed.charCodeAt(i);
        hash |= 0;
    }

    const fortune = FORTUNES[Math.abs(hash) % FORTUNES.length];
    const luckyNum = (Math.abs(hash * 7) % 99) + 1;
    const luckyColor = LUCKY_COLORS[Math.abs(hash * 3) % LUCKY_COLORS.length];
    const luckyElement = LUCKY_ELEMENTS[Math.abs(hash * 11) % LUCKY_ELEMENTS.length];

    return new EmbedBuilder()
        .setColor(fortune.color)
        .setTitle(`🔮 حظ ${user.username} اليوم`)
        .setThumbnail(user.displayAvatarURL())
        .addFields(
            { name: '✨ توقعات اليوم', value: `> ${fortune.text}`, inline: false },
            { name: '🎲 رقمك المحظوظ', value: `**${luckyNum}**`, inline: true },
            { name: '🎨 لونك المحظوظ', value: luckyColor, inline: true },
            { name: '🌀 عنصرك اليوم', value: luckyElement, inline: true },
        )
        .setFooter({ text: '🔄 يتجدد حظك كل يوم' })
        .setTimestamp();
}

module.exports.fortune = {
    name: 'fortune',
    aliases: ['حظك', 'حظي', 'توقعات'],
    description: 'توقع حظك لهذا اليوم',
    usage: 'حظي',

    async execute(message) {
        const embed = buildFortuneEmbed(message.author);
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`fortune_refresh_${message.author.id}`)
                .setLabel('🔄 حظ شخص آخر')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId(`fortune_share_${message.author.id}`)
                .setLabel('📤 مشاركة')
                .setStyle(ButtonStyle.Primary),
        );
        await message.reply({ embeds: [embed], components: [row] });
    },

    async handleFortuneInteraction(interaction) {
        if (interaction.customId.startsWith('fortune_refresh_')) {
            await interaction.update({ embeds: [buildFortuneEmbed(interaction.user)] });
        } else if (interaction.customId.startsWith('fortune_share_')) {
            await interaction.reply({
                content: `🔮 **حظ ${interaction.user.username} اليوم:**\n> ${buildFortuneEmbed(interaction.user).data.fields[0].value}`,
            });
        }
    }
};

// ════════════════════════════════════════════════════════════════════════════
//  🤔 WYR — هل تفضل؟
// ════════════════════════════════════════════════════════════════════════════

const WYR_QUESTIONS = [
    { a: '💰 تكون غنياً بدون شهرة', b: '🌟 تكون مشهوراً بدون مال' },
    { a: '⏰ السفر للماضي', b: '🚀 السفر للمستقبل' },
    { a: '☕ القهوة طول العمر', b: '🍵 الشاي طول العمر' },
    { a: '🌞 الصيف دائماً', b: '❄️ الشتاء دائماً' },
    { a: '🦸 قوة خارقة (طيران)', b: '🧠 ذكاء خارق (عبقري)' },
    { a: '🌊 تعيش بالبحر', b: '🏔️ تعيش بالجبال' },
    { a: '🎮 تلعب ألعاب وتكسب مال', b: '📚 تقرأ كتب وتصبح حكيماً' },
    { a: '😴 تنام 10 ساعات كل يوم', b: '⚡ تنام 4 ساعات فقط وتنشط' },
    { a: '🐱 تعيش مع 10 قطط', b: '🐕 تعيش مع 10 كلاب' },
    { a: '🔇 لا تسمع شيئاً', b: '🙈 لا ترى شيئاً' },
    { a: '🌍 تسافر العالم وحيداً', b: '🏠 تبقى بالبيت مع أحبائك' },
    { a: '🍕 تأكل بيتزا كل يوم', b: '🍔 تأكل برغر كل يوم' },
];

const wyrVotes = new Map(); // msgId → { a: Set, b: Set }

module.exports.wyr = {
    name: 'wyr',
    aliases: ['هل_تفضل', 'تفضل', 'ماذا_تفضل'],
    description: 'لعبة هل تفضل بالتصويت',
    usage: 'تفضل',

    async execute(message) {
        const q = WYR_QUESTIONS[Math.floor(Math.random() * WYR_QUESTIONS.length)];
        const embed = new EmbedBuilder()
            .setColor('#9B59B6')
            .setTitle('🤔 هل تفضل...؟')
            .setDescription(`> صوّت لأحد الخيارين!\n\n**1️⃣ ${q.a}**\n\nأم\n\n**2️⃣ ${q.b}**`)
            .addFields(
                { name: '1️⃣ الخيار الأول', value: '`0` أصوات (0%)', inline: true },
                { name: '2️⃣ الخيار الثاني', value: '`0` أصوات (0%)', inline: true },
            )
            .setFooter({ text: '⏰ التصويت ينتهي بعد 2 دقيقة' });

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('wyr_vote_a').setLabel(`1️⃣ ${q.a.slice(0, 30)}`).setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('wyr_vote_b').setLabel(`2️⃣ ${q.b.slice(0, 30)}`).setStyle(ButtonStyle.Secondary),
        );

        const msg = await message.reply({ embeds: [embed], components: [row] });
        wyrVotes.set(msg.id, { a: new Set(), b: new Set(), q });

        // إغلاق التصويت بعد دقيقتين
        setTimeout(async () => {
            const votes = wyrVotes.get(msg.id);
            if (!votes) return;
            wyrVotes.delete(msg.id);

            const totalA = votes.a.size;
            const totalB = votes.b.size;
            const total = totalA + totalB || 1;
            const pctA = Math.round(totalA / total * 100);
            const pctB = 100 - pctA;

            const winner = totalA > totalB ? `1️⃣ **${q.a}**` : totalA < totalB ? `2️⃣ **${q.b}**` : '🤝 **تعادل!**';

            const finalEmbed = new EmbedBuilder()
                .setColor('#9B59B6')
                .setTitle('🤔 هل تفضل...؟ — النتائج!')
                .setDescription(`> ${winner}`)
                .addFields(
                    { name: `1️⃣ ${q.a}`, value: `${'█'.repeat(Math.round(pctA/10))}${'░'.repeat(10-Math.round(pctA/10))} **${pctA}%** (${totalA} صوت)`, inline: false },
                    { name: `2️⃣ ${q.b}`, value: `${'█'.repeat(Math.round(pctB/10))}${'░'.repeat(10-Math.round(pctB/10))} **${pctB}%** (${totalB} صوت)`, inline: false },
                )
                .setTimestamp();

            await msg.edit({ embeds: [finalEmbed], components: [] }).catch(() => {});
        }, 2 * 60 * 1000);
    },

    async handleWYRInteraction(interaction) {
        const msgId = interaction.message.id;
        const votes = wyrVotes.get(msgId);
        if (!votes) return interaction.reply({ content: '❌ انتهى التصويت!', flags: MessageFlags.Ephemeral });

        const userId = interaction.user.id;
        const isA = interaction.customId === 'wyr_vote_a';

        // إلغاء التصويت السابق
        votes.a.delete(userId);
        votes.b.delete(userId);

        if (isA) votes.a.add(userId);
        else votes.b.add(userId);

        const totalA = votes.a.size;
        const totalB = votes.b.size;
        const total = totalA + totalB || 1;
        const pctA = Math.round(totalA / total * 100);
        const pctB = 100 - pctA;

        const embed = EmbedBuilder.from(interaction.message.embeds[0])
            .setFields(
                { name: '1️⃣ الخيار الأول', value: `\`${totalA}\` أصوات (${pctA}%)`, inline: true },
                { name: '2️⃣ الخيار الثاني', value: `\`${totalB}\` أصوات (${pctB}%)`, inline: true },
            );

        await interaction.update({ embeds: [embed] });
    }
};

// ════════════════════════════════════════════════════════════════════════════
//  💘 SHIP — نسبة التوافق
// ════════════════════════════════════════════════════════════════════════════

module.exports.ship = {
    name: 'ship',
    aliases: ['توافق', 'سفينة', 'حب'],
    description: 'نسبة التوافق بين شخصين',
    usage: 'سفينة @user1 [@user2]',

    async execute(message, args) {
        const user1 = message.mentions.users.first() || message.author;
        const user2 = message.mentions.users.size > 1
            ? [...message.mentions.users.values()][1]
            : (user1.id !== message.author.id ? message.author : user1);

        if (user1.id === user2.id) {
            const embed = new EmbedBuilder()
                .setColor('#FF69B4')
                .setTitle('💘 نسبة التوافق')
                .setDescription('> 😂 حاولت تشوف توافقك مع نفسك؟ **100%** طبعاً! 🤪');
            return message.reply({ embeds: [embed] });
        }

        const combined = [user1.id, user2.id].sort().join('');
        let hash = 0;
        for (let i = 0; i < combined.length; i++) {
            hash = ((hash << 5) - hash) + combined.charCodeAt(i);
            hash |= 0;
        }
        const pct = Math.abs(hash % 101);

        const bar = '❤️'.repeat(Math.floor(pct / 10)) + '🤍'.repeat(10 - Math.floor(pct / 10));
        const desc = pct >= 90 ? '💕 توأم الروح! توافق مثالي!' :
                     pct >= 75 ? '💖 توافق رائع! علاقة قوية جداً!' :
                     pct >= 50 ? '💚 توافق جيد! مستمرون يمشي' :
                     pct >= 25 ? '💛 توافق ضعيف، لكن هناك أمل!' :
                                 '💔 لا توافق... ربما في حياة أخرى!';

        const shipName = user1.username.slice(0, Math.ceil(user1.username.length/2)) +
                         user2.username.slice(Math.floor(user2.username.length/2));

        const embed = new EmbedBuilder()
            .setColor('#FF69B4')
            .setTitle('💘 نسبة التوافق')
            .setDescription(`**${user1.username}** 💕 **${user2.username}**\n\n> 🚢 اسم السفينة: **${shipName}**`)
            .addFields(
                { name: '❤️ نسبة التوافق', value: `**${pct}%**`, inline: true },
                { name: '📊 التقييم', value: bar, inline: false },
                { name: '💬 الوصف', value: desc, inline: false },
            )
            .setFooter({ text: 'النتيجة ثابتة لنفس الزوج دائماً!' });

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`ship_again_${message.author.id}`)
                .setLabel('🔄 اختبر أشخاص آخرين')
                .setStyle(ButtonStyle.Secondary),
        );

        await message.reply({ embeds: [embed], components: [row] });
    },

    async handleShipInteraction(interaction) {
        if (interaction.customId.startsWith('ship_again_')) {
            if (interaction.user.id !== interaction.customId.split('_')[2]) {
                return interaction.reply({ content: '❌ ليس لك!', flags: MessageFlags.Ephemeral });
            }
            await interaction.reply({ content: '> اكتب `سفينة @شخص1 @شخص2` لاختبار توافق آخر!', flags: MessageFlags.Ephemeral });
        }
    }
};

// ════════════════════════════════════════════════════════════════════════════
//  🎲 ROLL — رمي النرد
// ════════════════════════════════════════════════════════════════════════════

module.exports.roll = {
    name: 'roll',
    aliases: ['نرد', 'رمي', 'dice'],
    description: 'رمي النرد',
    usage: 'نرد [وجوه]',

    async execute(message, args) {
        const faces = Math.min(Math.max(parseInt(args[0]) || 6, 2), 1000);
        const result = Math.floor(Math.random() * faces) + 1;

        const percent = result / faces;
        const quality = percent >= 0.9 ? '🔥 نتيجة ممتازة!' : percent >= 0.7 ? '✅ نتيجة جيدة' : percent <= 0.1 ? '😬 حظ سيء!' : '😐 نتيجة عادية';

        const embed = new EmbedBuilder()
            .setColor(percent >= 0.7 ? '#57F287' : percent <= 0.1 ? '#ED4245' : '#FEE75C')
            .setTitle('🎲 رمية النرد')
            .setDescription(`> ${message.author} رمى نرداً بـ **${faces}** وجه\n\n# ${result}\n\n> ${quality}`)
            .addFields({ name: '📊 النسبة', value: `**${Math.round(percent * 100)}%** من الحد الأقصى`, inline: true });

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`roll_again_${faces}_${message.author.id}`)
                .setLabel('🎲 ارمِ مجدداً')
                .setStyle(ButtonStyle.Primary),
        );

        await message.reply({ embeds: [embed], components: [row] });
    },

    async handleRollInteraction(interaction) {
        if (!interaction.customId.startsWith('roll_again_')) return;
        const parts = interaction.customId.split('_');
        const faces = parseInt(parts[2]);
        const ownerId = parts[3];

        if (interaction.user.id !== ownerId) {
            return interaction.reply({ content: '❌ ليس لك!', flags: MessageFlags.Ephemeral });
        }

        const result = Math.floor(Math.random() * faces) + 1;
        const percent = result / faces;
        const quality = percent >= 0.9 ? '🔥 ممتاز!' : percent >= 0.7 ? '✅ جيد' : percent <= 0.1 ? '😬 سيء!' : '😐 عادي';

        const embed = new EmbedBuilder()
            .setColor(percent >= 0.7 ? '#57F287' : percent <= 0.1 ? '#ED4245' : '#FEE75C')
            .setTitle('🎲 رمية النرد')
            .setDescription(`> ${interaction.user} رمى نرداً بـ **${faces}** وجه\n\n# ${result}\n\n> ${quality}`)
            .addFields({ name: '📊 النسبة', value: `**${Math.round(percent * 100)}%**`, inline: true });

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`roll_again_${faces}_${ownerId}`)
                .setLabel('🎲 ارمِ مجدداً')
                .setStyle(ButtonStyle.Primary),
        );

        await interaction.update({ embeds: [embed], components: [row] });
    }
};

// ════════════════════════════════════════════════════════════════════════════
//  🔮 8BALL — الكرة السحرية
// ════════════════════════════════════════════════════════════════════════════

const BALL_ANSWERS = [
    { text: '✅ نعم بالتأكيد!', color: '#57F287', type: 'pos' },
    { text: '✅ الأمور تبدو جيدة!', color: '#57F287', type: 'pos' },
    { text: '✅ بدون شك!', color: '#57F287', type: 'pos' },
    { text: '✅ يمكنك الاعتماد عليه', color: '#57F287', type: 'pos' },
    { text: '✅ نعم — بالتأكيد!', color: '#57F287', type: 'pos' },
    { text: '🤔 الآن لا أستطيع التنبؤ', color: '#FEE75C', type: 'neu' },
    { text: '🤔 اسأل مرة أخرى لاحقاً', color: '#FEE75C', type: 'neu' },
    { text: '🤔 من الأفضل ألا أخبرك الآن', color: '#FEE75C', type: 'neu' },
    { text: '❌ لا تعتمد عليه', color: '#ED4245', type: 'neg' },
    { text: '❌ توقعاتي تقول لا', color: '#ED4245', type: 'neg' },
    { text: '❌ مصادري تقول لا', color: '#ED4245', type: 'neg' },
    { text: '❌ غير محتمل أبداً', color: '#ED4245', type: 'neg' },
];

module.exports.ball = {
    name: aliases: ['تنبؤ', 'كرة_الحظ', ],
    description: 'اسأل الكرة السحرية',
    usage: '8ball [سؤال]',

    async execute(message, args) {
        if (!args || args.length === 0) {
            return message.reply('❌ يجب أن تسأل سؤالاً!\nمثال: `8ball هل سأفوز اليوم؟`');
        }

        const question = args.join(' ');
        const answer = BALL_ANSWERS[Math.floor(Math.random() * BALL_ANSWERS.length)];

        const embed = new EmbedBuilder()
            .setColor(answer.color)
            .setTitle('🔮 الكرة السحرية')
            .addFields(
                { name: '❓ السؤال', value: `> ${question}`, inline: false },
                { name: '💬 الجواب', value: `> **${answer.text}**`, inline: false },
            )
            .setFooter({ text: `سأل: ${message.author.username}`, iconURL: message.author.displayAvatarURL() })
            .setTimestamp();

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`ball_again_${message.author.id}_${Buffer.from(question).toString('base64').slice(0, 50)}`)
                .setLabel('🔮 سؤال آخر')
                .setStyle(ButtonStyle.Secondary),
        );

        await message.reply({ embeds: [embed], components: [row] });
    },

    async handleBallInteraction(interaction) {
        if (!interaction.customId.startsWith('ball_again_')) return;
        const parts = interaction.customId.split('_');
        const ownerId = parts[2];

        if (interaction.user.id !== ownerId) {
            return interaction.reply({ content: '❌ ليس لك!', flags: MessageFlags.Ephemeral });
        }

        const answer = BALL_ANSWERS[Math.floor(Math.random() * BALL_ANSWERS.length)];
        const oldQuestion = interaction.message.embeds[0]?.fields?.[0]?.value?.replace('> ', '') || '...';

        const embed = new EmbedBuilder()
            .setColor(answer.color)
            .setTitle('🔮 الكرة السحرية')
            .addFields(
                { name: '❓ السؤال', value: `> ${oldQuestion}`, inline: false },
                { name: '💬 الجواب', value: `> **${answer.text}**`, inline: false },
            )
            .setFooter({ text: `سأل: ${interaction.user.username}`, iconURL: interaction.user.displayAvatarURL() })
            .setTimestamp();

        await interaction.update({ embeds: [embed] });
    }
};

module.exports.name = 'fun-buttons';
module.exports.execute = async () => {};
