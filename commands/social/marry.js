'use strict';

const {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder,
    MessageFlags,
} = require('discord.js');
const db = require('../../utils/database');
const config = require('../../config');

// ─── طلبات الزواج المعلقة ───────────────────────────────────────────────────
// المفتاح: msgId → { proposerId, targetId, cost, timestamp }
const pendingProposals = new Map();

const MARRIAGE_COST = 10_000;
const PROPOSAL_TIMEOUT = 60_000; // 60 ثانية

// ─── تنظيف تلقائي للطلبات المنتهية ─────────────────────────────────────────
const _cleanup = setInterval(() => {
    const now = Date.now();
    for (const [msgId, data] of pendingProposals) {
        if (now - data.timestamp > PROPOSAL_TIMEOUT + 5000) {
            pendingProposals.delete(msgId);
        }
    }
}, 5 * 60 * 1000);
_cleanup.unref?.();

// ─── بناء بطاقة الزواج ──────────────────────────────────────────────────────
function buildMarriageCard(user, partner, since) {
    const days = Math.floor((Date.now() - since) / 86_400_000);
    const years = Math.floor(days / 365);
    const months = Math.floor((days % 365) / 30);
    const remDays = days % 30;

    const durationParts = [];
    if (years > 0) durationParts.push(`${years} سنة`);
    if (months > 0) durationParts.push(`${months} شهر`);
    durationParts.push(`${remDays} يوم`);
    const durationStr = durationParts.join(' و ') || 'أقل من يوم';

    const heartColor = days > 365 ? '#FF0080' : days > 30 ? '#FF69B4' : '#FFB6C1';

    return new EmbedBuilder()
        .setColor(heartColor)
        .setTitle('💍 بطاقة الزواج الرسمية')
        .setDescription(
            [
                `> 💕 **${user.username}** × **${partner.username}**`,
                `> *زوجان متصلا القلوب*`,
            ].join('\n')
        )
        .addFields(
            {
                name: '💒 تاريخ الزواج',
                value: `<t:${Math.floor(since / 1000)}:D>`,
                inline: true,
            },
            {
                name: '🗓️ مدة الزواج',
                value: `**${durationStr}**`,
                inline: true,
            },
            {
                name: '❤️ الذكرى السنوية',
                value: `<t:${Math.floor(since / 1000) + 365 * 24 * 3600}:R>`,
                inline: true,
            }
        )
        .setThumbnail(user.displayAvatarURL({ size: 256 }))
        .setImage(partner.displayAvatarURL({ size: 512 }))
        .setFooter({ text: '💌 عقد زواج موثّق — استخدم طلاق لإنهاء الزواج' })
        .setTimestamp(since);
}

// ─── بناء embed طلب الزواج ──────────────────────────────────────────────────
function buildProposalEmbed(proposer, target) {
    return new EmbedBuilder()
        .setColor('#FF69B4')
        .setTitle('💍 طلب زواج رسمي')
        .setDescription(
            [
                `> 💌 ${proposer} يتقدم لطلب يد ${target}`,
                ``,
                `> 💰 تكلفة إتمام الزواج: **${MARRIAGE_COST.toLocaleString()} ${config.currency}**`,
                `> ⏰ مهلة الرد: **60 ثانية**`,
            ].join('\n')
        )
        .setThumbnail(proposer.displayAvatarURL({ size: 256 }))
        .setFooter({ text: `${proposer.username} ينتظر ردّك بفارغ الصبر` });
}

// ─── الأمر الرئيسي ───────────────────────────────────────────────────────────
module.exports = {
    name: 'marry',
    aliases: ['زواج', 'خطوبة', 'تزوج'],
    description: 'تقديم طلب زواج لعضو آخر',
    usage: 'زواج @شخص',

    async execute(message, args) {
        const proposer = message.author;
        const target = message.mentions.users.first();

        if (!target) {
            return message.reply(
                '❌ يجب منشنة الشخص الذي تريد التقدم له.\n> مثال: `زواج @شخص`'
            );
        }
        if (target.id === proposer.id) {
            return message.reply('❌ لا يمكنك التقدم لنفسك!');
        }
        if (target.bot) {
            return message.reply('❌ لا يمكنك التقدم لبوت!');
        }

        const proposerData = db.getUserData(proposer.id);
        const targetData = db.getUserData(target.id);

        // فحص الزواج الحالي
        if (proposerData.marriedTo) {
            return message.reply('❌ أنت متزوج بالفعل! استخدم `طلاق` أولاً إن أردت.');
        }
        if (targetData.marriedTo) {
            return message.reply(`❌ **${target.username}** متزوج/ة بالفعل.`);
        }

        // فحص الرصيد
        if ((proposerData.balance || 0) < MARRIAGE_COST) {
            return message.reply(
                `❌ رصيدك غير كافٍ لإتمام الزواج.\n` +
                `> المطلوب: **${MARRIAGE_COST.toLocaleString()} ${config.currency}**\n` +
                `> رصيدك الحالي: **${(proposerData.balance || 0).toLocaleString()} ${config.currency}**`
            );
        }

        // ── إرسال طلب الزواج ─────────────────────────────────────────────
        const embed = buildProposalEmbed(proposer, target);

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`marry_accept_${proposer.id}_${target.id}`)
                .setLabel('💍 أقبل')
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId(`marry_reject_${proposer.id}_${target.id}`)
                .setLabel('💔 أرفض')
                .setStyle(ButtonStyle.Danger)
        );

        const msg = await message.reply({
            content: `${target}`,
            embeds: [embed],
            components: [row],
        });

        pendingProposals.set(msg.id, {
            proposerId: proposer.id,
            targetId: target.id,
            cost: MARRIAGE_COST,
            timestamp: Date.now(),
        });

        // انتهاء الوقت تلقائياً
        setTimeout(async () => {
            if (!pendingProposals.has(msg.id)) return;
            pendingProposals.delete(msg.id);

            const expiredEmbed = new EmbedBuilder()
                .setColor('#95A5A6')
                .setTitle('⏰ انتهى وقت الطلب')
                .setDescription(
                    `> **${target.username}** لم يستجب في الوقت المحدد.\n> يمكنك التقدم مجدداً متى شئت.`
                );

            msg.edit({ embeds: [expiredEmbed], components: [], content: '' }).catch(() => {});
        }, PROPOSAL_TIMEOUT);
    },

    // ─── معالج تفاعلات الأزرار ─────────────────────────────────────────────
    async handleMarryInteraction(interaction) {
        const id = interaction.customId;

        // ── أزرار القبول/الرفض ──────────────────────────────────────────
        if (id.startsWith('marry_accept_') || id.startsWith('marry_reject_')) {
            const parts = id.split('_');
            const proposerId = parts[2];
            const targetId = parts[3];
            const isAccept = id.startsWith('marry_accept_');

            // التحقق: فقط المدعو يستطيع الرد
            if (interaction.user.id !== targetId) {
                return interaction.reply({
                    content: '❌ هذا الطلب ليس موجهاً إليك.',
                    flags: MessageFlags.Ephemeral,
                });
            }

            const msgId = interaction.message.id;
            pendingProposals.delete(msgId);

            // ── رفض ─────────────────────────────────────────────────────
            if (!isAccept) {
                const rejectEmbed = new EmbedBuilder()
                    .setColor('#ED4245')
                    .setTitle('💔 تم رفض الطلب')
                    .setDescription(`> **${interaction.user.username}** رفض/ت طلب الزواج.`)
                    .setTimestamp();
                return interaction.update({ embeds: [rejectEmbed], components: [], content: '' });
            }

            // ── قبول — فحوصات أخيرة ──────────────────────────────────────
            const proposerData = db.getUserData(proposerId);
            const targetData = db.getUserData(targetId);

            if (proposerData.marriedTo) {
                return interaction.update({
                    content: '❌ المتقدم تزوّج مؤخراً من شخص آخر!',
                    embeds: [],
                    components: [],
                });
            }
            if (targetData.marriedTo) {
                return interaction.update({
                    content: '❌ أنت متزوج/ة بالفعل من شخص آخر!',
                    embeds: [],
                    components: [],
                });
            }
            if ((proposerData.balance || 0) < MARRIAGE_COST) {
                return interaction.update({
                    content: '❌ لم يعد المتقدم يملك رصيداً كافياً لإتمام الزواج.',
                    embeds: [],
                    components: [],
                });
            }

            // ── تطبيق الزواج ──────────────────────────────────────────────
            const now = Date.now();
            db.removeMoney(proposerId, MARRIAGE_COST);
            db.updateFields(proposerId, { marriedTo: targetId, marriedSince: now });
            db.updateFields(targetId, { marriedTo: proposerId, marriedSince: now });

            let proposerUser;
            try {
                proposerUser = await interaction.client.users.fetch(proposerId);
            } catch {
                proposerUser = { username: 'غير متاح', displayAvatarURL: () => '' };
            }

            const targetUser = interaction.user;

            const successEmbed = new EmbedBuilder()
                .setColor('#FF69B4')
                .setTitle('🎊 تهانينا — تمّ الزواج!')
                .setDescription(
                    [
                        `> 💕 **${proposerUser.username}** و **${targetUser.username}** — زوجان الآن`,
                        '',
                        `> 💰 تكلفة الزواج: **${MARRIAGE_COST.toLocaleString()} ${config.currency}** (تم خصمها)`,
                        `> 📅 تاريخ الزواج: <t:${Math.floor(now / 1000)}:D>`,
                    ].join('\n')
                )
                .setFooter({ text: '💌 استخدم زواجي لعرض بطاقة الزواج' })
                .setTimestamp();

            const cardRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`married_card_${proposerId}_${targetId}`)
                    .setLabel('💍 عرض البطاقة')
                    .setStyle(ButtonStyle.Primary)
            );

            return interaction.update({
                content: '',
                embeds: [successEmbed],
                components: [cardRow],
            });
        }

        // ── زر عرض بطاقة الزواج ─────────────────────────────────────────
        if (id.startsWith('married_card_')) {
            const parts = id.split('_');
            const p1Id = parts[2];
            const p2Id = parts[3];

            // فقط أحد الزوجين يرى البطاقة
            if (interaction.user.id !== p1Id && interaction.user.id !== p2Id) {
                return interaction.reply({
                    content: '❌ بطاقة الزواج خاصة بالزوجين فقط.',
                    flags: MessageFlags.Ephemeral,
                });
            }

            const userData = db.getUserData(interaction.user.id);
            if (!userData.marriedTo) {
                return interaction.reply({
                    content: '❌ أنت لست متزوجاً حالياً.',
                    flags: MessageFlags.Ephemeral,
                });
            }

            const partnerId = userData.marriedTo;
            try {
                const partner = await interaction.client.users.fetch(partnerId);
                const since = userData.marriedSince || Date.now();
                const card = buildMarriageCard(interaction.user, partner, since);
                return interaction.reply({ embeds: [card], flags: MessageFlags.Ephemeral });
            } catch {
                return interaction.reply({
                    content: '❌ تعذّر العثور على بيانات شريكك.',
                    flags: MessageFlags.Ephemeral,
                });
            }
        }
    },
};
