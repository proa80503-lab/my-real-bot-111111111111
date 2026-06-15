'use strict';

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const db = require('../../utils/database');
const config = require('../../config');
const { PremiumEmbedBuilder } = require('../../utils/embed-builder');

module.exports = {
    name: 'divorce',
    aliases: ['طلاق', 'خلع'],
    description: 'إنهاء علاقة الزواج مع شريكك',
    usage: 'divorce',

    async execute(message, args) {
        const userId = message.author.id;
        const userData = db.getUserData(userId);

        // التحقق من وجود زواج
        if (!userData.partner) {
            return message.reply({
                embeds: [
                    PremiumEmbedBuilder.error(
                        'لست متزوجاً!',
                        '**لا يوجد زواج لإنهائه.** استخدم أمر `تزوج @شخص` للزواج أولاً.'
                    )
                ]
            });
        }

        const partnerId = userData.partner;
        const partnerUser = await message.client.users.fetch(partnerId).catch(() => null);
        const partnerName = partnerUser ? partnerUser.username : `مستخدم محذوف (${partnerId})`;

        // طلب تأكيد الطلاق
        const confirmEmbed = new EmbedBuilder()
            .setColor('#FF6B6B')
            .setTitle('💔 تأكيد الطلاق')
            .setDescription(
                `هل أنت متأكد من رغبتك في الطلاق من **${partnerName}**?\n\n` +
                `هذا الإجراء **لا يمكن التراجع عنه**.`
            )
            .setTimestamp();

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`divorce_confirm_${userId}`)
                .setLabel('✅ نعم، أريد الطلاق')
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId(`divorce_cancel_${userId}`)
                .setLabel('❌ إلغاء')
                .setStyle(ButtonStyle.Secondary)
        );

        const confirmMsg = await message.reply({ embeds: [confirmEmbed], components: [row] });

        // انتظار الرد خلال 30 ثانية
        const filter = i => i.user.id === userId;
        let interaction;

        try {
            interaction = await confirmMsg.awaitMessageComponent({ filter, time: 30_000 });
        } catch {
            // انتهى الوقت
            await confirmMsg.edit({
                embeds: [PremiumEmbedBuilder.error('انتهى الوقت', 'تم إلغاء طلب الطلاق.')],
                components: []
            }).catch(() => { });
            return;
        }

        await interaction.deferUpdate();

        if (interaction.customId.startsWith('divorce_cancel_')) {
            await confirmMsg.edit({
                embeds: [PremiumEmbedBuilder.success('تم الإلغاء', '❤️ تراجعت عن قرار الطلاق.')],
                components: []
            });
            return;
        }

        // تنفيذ الطلاق — إزالة الزواج من كلا الشريكين
        db.updateFields(userId, { partner: null, marriageDate: null });
        db.updateFields(partnerId, { partner: null, marriageDate: null });

        await confirmMsg.edit({
            embeds: [
                new EmbedBuilder()
                    .setColor('#808080')
                    .setTitle('💔 تم الطلاق')
                    .setDescription(
                        `لقد تم فسخ عقد الزواج بين **${message.author.username}** و **${partnerName}**.\n\n` +
                        `نتأسف لسماع ذلك. نتمنى لكما الأفضل. 🕊️`
                    )
                    .setTimestamp()
            ],
            components: []
        });
    },
};
