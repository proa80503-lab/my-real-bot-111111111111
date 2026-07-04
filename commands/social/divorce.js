'use strict';

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require('../../utils/database');
const config = require('../../config');

module.exports = {
    name: 'divorce',
    aliases: ['طلاق', 'خلع', 'فراق'],
    description: 'إنهاء علاقة الزواج مع شريكك الحالي',
    usage: 'طلاق',

    async execute(message) {
        const userId = message.author.id;
        const userData = db.getUserData(userId);

        // دعم الحقول القديمة والجديدة
        const partnerId = userData.marriedTo || userData.partner || null;

        if (!partnerId) {
            return message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor('#ED4245')
                        .setTitle('❌ لست متزوجاً')
                        .setDescription(
                            '> لا يوجد زواج قائم لإنهائه.\n> استخدم `زواج @شخص` للزواج.'
                        )
                        .setTimestamp(),
                ],
            });
        }

        const partnerUser = await message.client.users.fetch(partnerId).catch(() => null);
        const partnerName = partnerUser?.username ?? `مستخدم محذوف (${partnerId})`;

        // ── إحصائيات الزواج ───────────────────────────────────────────
        const since = userData.marriedSince || userData.marriageDate || null;
        const days = since ? Math.floor((Date.now() - since) / 86_400_000) : 0;

        const confirmEmbed = new EmbedBuilder()
            .setColor('#FF6B6B')
            .setTitle('💔 تأكيد الطلاق')
            .setDescription(
                [
                    `> هل أنت متأكد من رغبتك في الطلاق من **${partnerName}**؟`,
                    ``,
                    `> 🗓️ مدة الزواج: **${days} يوم**`,
                    `> ⚠️ هذا الإجراء **لا يمكن التراجع عنه**.`,
                ].join('\n')
            )
            .setFooter({ text: '⏰ ينتهي هذا الطلب خلال 30 ثانية' })
            .setTimestamp();

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`divorce_confirm_${userId}`)
                .setLabel('✅ تأكيد الطلاق')
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId(`divorce_cancel_${userId}`)
                .setLabel('❌ إلغاء')
                .setStyle(ButtonStyle.Secondary)
        );

        const confirmMsg = await message.reply({ embeds: [confirmEmbed], components: [row] });

        // فقط صاحب الأمر يستطيع التفاعل
        const filter = (i) => i.user.id === userId;

        let interaction;
        try {
            interaction = await confirmMsg.awaitMessageComponent({ filter, time: 30_000 });
        } catch {
            await confirmMsg
                .edit({
                    embeds: [
                        new EmbedBuilder()
                            .setColor('#95A5A6')
                            .setTitle('⏰ انتهى الوقت')
                            .setDescription('> تم إلغاء طلب الطلاق تلقائياً.')
                            .setTimestamp(),
                    ],
                    components: [],
                })
                .catch(() => {});
            return;
        }

        await interaction.deferUpdate();

        // ── إلغاء ─────────────────────────────────────────────────────
        if (interaction.customId.startsWith('divorce_cancel_')) {
            await confirmMsg.edit({
                embeds: [
                    new EmbedBuilder()
                        .setColor('#57F287')
                        .setTitle('❤️ تراجعت عن الطلاق')
                        .setDescription('> الزواج لا يزال قائماً. قرار حكيم!')
                        .setTimestamp(),
                ],
                components: [],
            });
            return;
        }

        // ── تنفيذ الطلاق — تنظيف الحقلين القديم والجديد ─────────────
        db.updateFields(userId, {
            marriedTo: null,
            marriedSince: null,
            partner: null,
            marriageDate: null,
        });
        db.updateFields(partnerId, {
            marriedTo: null,
            marriedSince: null,
            partner: null,
            marriageDate: null,
        });

        await confirmMsg.edit({
            embeds: [
                new EmbedBuilder()
                    .setColor('#808080')
                    .setTitle('💔 تم الطلاق')
                    .setDescription(
                        [
                            `> تم فسخ عقد الزواج بين **${message.author.username}** و **${partnerName}**.`,
                            `> مدة الزواج كانت **${days} يوم**.`,
                            '',
                            `> 🕊️ نتمنى لكما التوفيق في المستقبل.`,
                        ].join('\n')
                    )
                    .setTimestamp(),
            ],
            components: [],
        });
    },
};
