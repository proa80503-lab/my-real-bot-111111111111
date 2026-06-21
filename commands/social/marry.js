'use strict';

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║  💍 MARRY v3.0 — نظام الزواج بالأزرار الاحترافية                       ║
 * ║  طلب زواج | قبول/رفض | دفتر النكاح | طلاق                             ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, MessageFlags } = require('discord.js');
const db = require('../../utils/database');
const config = require('../../config');

// ─── طلبات الزواج المعلقة ────────────────────────────────────────────────────
const pendingProposals = new Map(); // msgId → { proposer, target, cost }

const MARRIAGE_COST = 10000;

function buildMarriageCard(proposer, partner, since) {
    const days = Math.floor((Date.now() - since) / 86400000);
    return new EmbedBuilder()
        .setColor('#FF69B4')
        .setTitle('💍 بطاقة الزواج')
        .setDescription(`> 💕 **${proposer.username}** و **${partner.username}**\n> زوجان سعيدان!`)
        .addFields(
            { name: '💒 تاريخ الزواج', value: `<t:${Math.floor(since / 1000)}:D>`, inline: true },
            { name: '🗓️ مدة الزواج', value: `**${days}** يوم`, inline: true },
        )
        .setThumbnail(proposer.displayAvatarURL())
        .setImage(partner.displayAvatarURL())
        .setFooter({ text: '❤️ عقد زواج رسمي من البوت' });
}

module.exports = {
    name: 'marry',
    aliases: ['زواج', 'خطوبة'],
    description: 'طلب الزواج من عضو آخر',
    usage: 'زواج @user',

    async execute(message, args) {
        const proposer = message.author;
        const target = message.mentions.users.first();

        if (!target) return message.reply('❌ منشن الشخص الذي تريد الزواج منه!\nمثال: `زواج @شخص`');
        if (target.id === proposer.id) return message.reply('❌ لا يمكنك الزواج من نفسك!');
        if (target.bot) return message.reply('❌ لا يمكنك الزواج من بوت!');

        const proposerData = db.getUserData(proposer.id);
        const targetData = db.getUserData(target.id);

        // فحص الزواج الحالي
        if (proposerData.marriedTo) {
            return message.reply(`❌ أنت متزوج بالفعل من <@${proposerData.marriedTo}>!\nاستخدم \`طلاق\` أولاً.`);
        }
        if (targetData.marriedTo) {
            return message.reply(`❌ ${target.username} متزوج/ة بالفعل!`);
        }

        // فحص الرصيد
        if ((proposerData.balance || 0) < MARRIAGE_COST) {
            return message.reply(`❌ تحتاج إلى **${MARRIAGE_COST.toLocaleString()} ${config.currency}** لتقديم طلب زواج!\n> رصيدك الحالي: **${(proposerData.balance || 0).toLocaleString()}**`);
        }

        // ── إرسال الطلب ───────────────────────────────────────────────
        const embed = new EmbedBuilder()
            .setColor('#FF69B4')
            .setTitle('💍 طلب زواج!')
            .setDescription([
                `> 💌 ${proposer} يطلب الزواج من ${target}!`,
                '',
                `> 💰 تكلفة الزواج: **${MARRIAGE_COST.toLocaleString()} ${config.currency}**`,
                `> ⏰ لديك **60 ثانية** للرد!`,
            ].join('\n'))
            .setThumbnail(proposer.displayAvatarURL())
            .setFooter({ text: `${proposer.username} ينتظر ردك!` });

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`marry_accept_${proposer.id}_${target.id}`)
                .setLabel('💍 أقبل!')
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId(`marry_reject_${proposer.id}_${target.id}`)
                .setLabel('💔 أرفض')
                .setStyle(ButtonStyle.Danger),
        );

        const msg = await message.reply({ content: `${target}`, embeds: [embed], components: [row] });
        pendingProposals.set(msg.id, { proposer, target, cost: MARRIAGE_COST, msg });

        // انتهاء الوقت بعد 60 ثانية
        setTimeout(async () => {
            if (pendingProposals.has(msg.id)) {
                pendingProposals.delete(msg.id);
                embed.setColor('#95A5A6').setDescription(`> ❌ **انتهى الوقت!**\n> ${target.username} لم يرد على طلب الزواج.`);
                msg.edit({ embeds: [embed], components: [] }).catch(() => { });
            }
        }, 60000);
    },

    async handleMarryInteraction(interaction) {
        const id = interaction.customId;

        if (id.startsWith('marry_accept_') || id.startsWith('marry_reject_')) {
            const parts = id.split('_');
            const proposerId = parts[2];
            const targetId = parts[3];
            const isAccept = id.startsWith('marry_accept_');

            // فقط المدعو يستطيع الرد
            if (interaction.user.id !== targetId) {
                return interaction.reply({ content: 'دمشي ولي لك مو الك طلب التكاثر هذا', flags: MessageFlags.Ephemeral });
            }

            const msgId = interaction.message.id;
            pendingProposals.delete(msgId);

            if (!isAccept) {
                const embed = new EmbedBuilder()
                    .setColor('#ED4245')
                    .setTitle('💔 ضربك بوري ههههه')
                    .setDescription(`> ${interaction.user} رفض/ت طلب الزواج.`);
                await interaction.update({ embeds: [embed], components: [] });
                return;
            }

            // ── قبول الزواج ─────────────────────────────────────────
            const proposerData = db.getUserData(proposerId);
            const targetData = db.getUserData(targetId);

            // فحصات أخيرة
            if (proposerData.marriedTo) {
                return interaction.update({ content: '❌ المتقدم تزوج بالفعل!', embeds: [], components: [] });
            }
            if (targetData.marriedTo) {
                return interaction.update({ content: '❌ ها خاين مو متزوج شعدك هنا', embeds: [], components: [] });
            }
            if ((proposerData.balance || 0) < MARRIAGE_COST) {
                return interaction.update({ content: '❌ ماعده فلوس ياكل تريده يعيشك', embeds: [], components: [] });
            }

            // تطبيق الزواج
            const now = Date.now();
            db.removeMoney(proposerId, MARRIAGE_COST);
            db.updateFields(proposerId, { marriedTo: targetId, marriedSince: now });
            db.updateFields(targetId, { marriedTo: proposerId, marriedSince: now });

            // جلب بيانات المستخدمين
            let proposerUser, targetUser;
            try {
                proposerUser = await interaction.client.users.fetch(proposerId);
                targetUser = interaction.user;
            } catch {
                proposerUser = { username: 'غير متاح', displayAvatarURL: () => '' };
                targetUser = interaction.user;
            }

            const embed = new EmbedBuilder()
                .setColor('#FF69B4')
                .setTitle('💒 تهانينا! تم الزفاف!')
                .setDescription([
                    `> 🎊 **${proposerUser.username}** و **${targetUser.username}** — زوجان الآن!`,
                    '',
                    `> 💰 تكلفة الخمسة ههه اقصد الزواج: **${MARRIAGE_COST.toLocaleString()} ${config.currency}** (تم خصمها)`,
                    `> 📅 تاريخ الزواج: <t:${Math.floor(now / 1000)}:D>`,
                ].join('\n'))
                .setFooter({ text: '❤️ مبارك الزواجيا قوم لوط استخدم زواجي لرؤية بطاقتك' })
                .setTimestamp();

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`married_card_${proposerId}_${targetId}`)
                    .setLabel('💍 بطاقة الزواج')
                    .setStyle(ButtonStyle.Primary),
            );

            await interaction.update({ content: '', embeds: [embed], components: [row] });
        }

        // عرض بطاقة الزواج
        if (id.startsWith('married_card_')) {
            const parts = id.split('_');
            const p1Id = parts[2];
            const p2Id = parts[3];
            const userData = db.getUserData(interaction.user.id);

            if (!userData.marriedTo || (interaction.user.id !== p1Id && interaction.user.id !== p2Id)) {
                return interaction.reply({ content: '❌ لست طرفاً في هذا الزواج يا مخنث', flags: MessageFlags.Ephemeral });
            }

            const partnerId = userData.marriedTo;
            try {
                const partner = await interaction.client.users.fetch(partnerId);
                const since = userData.marriedSince || Date.now();
                const card = buildMarriageCard(interaction.user, partner, since);
                await interaction.reply({ embeds: [card], flags: MessageFlags.Ephemeral });
            } catch {
                await interaction.reply({ content: '❌ لم يتم إيجاد الشريك.', flags: MessageFlags.Ephemeral });
            }
        }
    }
};
