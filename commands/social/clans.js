'use strict';

const {
    EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle,
    ModalBuilder, TextInputBuilder, TextInputStyle,
    StringSelectMenuBuilder, MessageFlags
} = require('discord.js');
const clanManager = require('../../utils/clan-manager');
const clanAssets = require('../../utils/clan-assets');
const config = require('../../config');
const { PremiumEmbedBuilder } = require('../../utils/embed-builder');

module.exports = {
    name: 'clans',
    // ملاحظة: 'كلان' و'كلانات' موجودة في CLAN_TRIGGERS بـ messageCreate.js
    // 'تفعيل كلان' تُعالج في messageCreate.js مباشرة
    aliases: ['قبائل', 'كلانات'],
    description: 'نظام الكلانات الاحترافي',
    usage: 'كلانات / كلان',

    async execute(context, args) {
        const isInteraction = context.isCommand?.() || context.isButton?.();
        const author = isInteraction ? context.user : context.author;
        const guild = context.guild;

        if (!guild) return;

        // ── تفعيل نظام الكلانات (setup)
        const setupArgs = ['setup', 'اعداد', 'إعداد', 'تفعيل'];
        if (args && setupArgs.includes(args[0]?.toLowerCase())) {
            // فحص صلاحية الأدمن
            const member = guild.members.cache.get(author.id);
            const isAdmin = member?.permissions.has('Administrator') || author.id === config.ownerId;
            if (!isAdmin) return _reply(context, isInteraction, '❌ هذا الأمر يحتاج صلاحية **Administrator**!');
            return await module.exports.setupClans(context);
        }

        const clan = clanManager.getUserClan(guild.id, author.id);
        if (!clan) {
            const embed = PremiumEmbedBuilder.info(
                '🏛️ نظام الكلانات',
                [
                    '> 🛡️ أنت لست في كلان حالياً!',
                    '',
                    '**يمكنك:**',
                    '> ✨ إنشاء كلانك الخاص',
                    '> 📜 الانضمام لكلان موجود عبر الدعوة',
                    '> 📋 رؤية قائمة الكلانات',
                ].join('\n')
            );
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('clan_create_btn').setLabel('إنشاء كلان').setStyle(ButtonStyle.Success).setEmoji('✨'),
                new ButtonBuilder().setCustomId('clan_list_btn').setLabel('قائمة الكلانات').setStyle(ButtonStyle.Primary).setEmoji('📜')
            );
            if (isInteraction) return context.reply({ embeds: [embed], components: [row], flags: MessageFlags.Ephemeral });
            return context.reply({ embeds: [embed], components: [row] });
        }

        await module.exports.showDashboard(context, clan);
    },

    // ─── مساعد: الرد حسب نوع السياق ─────────────────────────────────────
    // (متاحة في module.exports)

    // ─── إظهار لوحة تحكم الكلان ─────────────────────────────────────────
    async showDashboard(target, clan) {
        const isInteraction = target.isButton?.() || target.isStringSelectMenu?.();
        const user = isInteraction ? target.user : target.author;

        if (!clan || !clan.name) {
            const msg = '❌ تعذّر تحميل بيانات الكلان. جرّب الأمر مرة ثانية.';
            if (isInteraction) return target.update({ content: msg, embeds: [], components: [] }).catch(() => target.reply({ content: msg, flags: MessageFlags.Ephemeral }));
            return target.reply(msg);
        }

        const isLeader = clan.leaderId === user.id;
        const isDeputy = Array.isArray(clan.deputies) && clan.deputies.includes(user.id);
        const isOfficer = Array.isArray(clan.officers) && clan.officers.includes(user.id);
        const isAdmin = isLeader || isDeputy;

        const rankNames = { leader: '👑 قائد', deputy: '⭐ نائب', officer: '🎖️ ضابط', member: '🛡️ جندي' };
        let userRank = 'member';
        if (isLeader) userRank = 'leader';
        else if (isDeputy) userRank = 'deputy';
        else if (isOfficer) userRank = 'officer';

        // بناء قائمة الأعضاء من الهيكل الصحيح (Array)
        const allMemberIds = [
            clan.leaderId,
            ...(Array.isArray(clan.deputies) ? clan.deputies : []),
            ...(Array.isArray(clan.officers) ? clan.officers : []),
            ...(Array.isArray(clan.members) ? clan.members : []),
        ].filter(Boolean);

        const memberList = allMemberIds.slice(0, 6).map(id => {
            if (id === clan.leaderId) return `👑 <@${id}>`;
            if (clan.deputies?.includes(id)) return `⭐ <@${id}>`;
            if (clan.officers?.includes(id)) return `🎖️ <@${id}>`;
            return `🛡️ <@${id}>`;
        }).join('\n') || 'لا أعضاء بعد';

        const totalMembers = clan.stats?.totalMembers ?? allMemberIds.length;
        const level = clan.stats?.level ?? 1;
        const xp = clan.stats?.xp ?? 0;
        const nextLevelXP = level * 100;
        const progress = Math.min(Math.round((xp / nextLevelXP) * 10), 10);
        const progressBar = '█'.repeat(progress) + '░'.repeat(10 - progress);

        const embed = new EmbedBuilder()
            .setColor('#5865F2')
            .setTitle(`🏰 ${clan.name}${clan.tag ? ` [${clan.tag}]` : ''}`)
            .setDescription([
                clan.description ? `> *${clan.description}*` : '> *لا يوجد وصف — اضغط تعديل لإضافة وصف*',
                '',
                `\`\`\`${progressBar}\`\`\``,
                `⭐ المستوى **${level}** — ${xp}/${nextLevelXP} XP`,
            ].join('\n'))
            .addFields(
                { name: '👑 القائد', value: `<@${clan.leaderId}>`, inline: true },
                { name: '👥 الأعضاء', value: `**${totalMembers}** عضو`, inline: true },
                { name: '🎖️ رتبتك', value: `**${rankNames[userRank]}**`, inline: true },
                { name: '📋 الأعضاء', value: memberList, inline: false }
            )
            .setFooter({ text: `🏰 كلان ${clan.name} • اضغط على الأزرار للإدارة` })
            .setTimestamp();

        // صف 1: أزرار التفاعل
        const row1 = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('clan_invite_btn').setLabel('دعوة').setStyle(ButtonStyle.Success).setEmoji('📨'),
            new ButtonBuilder().setCustomId('clan_list_btn').setLabel('قائمة الكلانات').setStyle(ButtonStyle.Primary).setEmoji('📜'),
            new ButtonBuilder().setCustomId('clan_leave_btn').setLabel('مغادرة').setStyle(ButtonStyle.Secondary).setEmoji('🚪')
        );

        // صف 2: أزرار الإدارة (للقائد والنائب)
        const row2 = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('clan_desc_btn').setLabel('تعديل الوصف').setStyle(ButtonStyle.Secondary).setEmoji('✏️').setDisabled(!isAdmin),
            new ButtonBuilder().setCustomId('clan_rename_btn').setLabel('تغيير الاسم').setStyle(ButtonStyle.Secondary).setEmoji('🔤').setDisabled(!isLeader),
            new ButtonBuilder().setCustomId('clan_kick_btn').setLabel('فصل عضو').setStyle(ButtonStyle.Danger).setEmoji('🥾').setDisabled(!isAdmin),
            new ButtonBuilder().setCustomId('clan_edit_rank_btn').setLabel('تعديل رتبة').setStyle(ButtonStyle.Secondary).setEmoji('🎖️').setDisabled(!isLeader),
            new ButtonBuilder().setCustomId('clan_delete_btn').setLabel('حل الكلان').setStyle(ButtonStyle.Danger).setEmoji('💥').setDisabled(!isLeader)
        );

        const components = (isLeader || isDeputy) ? [row1, row2] : [row1];

        if (isInteraction) {
            await target.update({ embeds: [embed], components }).catch(() =>
                target.reply({ embeds: [embed], components, flags: MessageFlags.Ephemeral })
            );
        } else {
            await target.reply({ embeds: [embed], components });
        }
    },

    // ─── Interaction Handlers ─────────────────────────────────────────────

    async showCreateModal(interaction) {
        if (clanManager.getUserClan(interaction.guild.id, interaction.user.id)) {
            return interaction.reply({ content: '❌ أنت بالفعل في كلان!', flags: MessageFlags.Ephemeral });
        }
        const modal = new ModalBuilder().setCustomId('clan_create_modal').setTitle('✨ إنشاء كلان جديد');
        modal.addComponents(
            new ActionRowBuilder().addComponents(
                new TextInputBuilder().setCustomId('clan_name').setLabel('اسم الكلان').setPlaceholder('مثلاً: الفرسان الذهبيون').setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(32)
            ),
            new ActionRowBuilder().addComponents(
                new TextInputBuilder().setCustomId('clan_tag').setLabel('تاغ الكلان (اختياري)').setPlaceholder('مثلاً: FRN').setStyle(TextInputStyle.Short).setRequired(false).setMaxLength(5)
            )
        );
        await interaction.showModal(modal);
    },

    async handleCreateSubmit(interaction) {
        const name = interaction.fields.getTextInputValue('clan_name').trim();
        const tag  = interaction.fields.getTextInputValue('clan_tag').trim();

        if (!name) return interaction.reply({ content: '❌ اسم الكلان لا يمكن أن يكون فارغاً!', flags: MessageFlags.Ephemeral });

        const result = clanManager.createClan(interaction.guild.id, interaction.user.id, name, tag || null);
        if (!result.success) return interaction.reply({ content: `❌ ${result.error}`, flags: MessageFlags.Ephemeral });

        await interaction.reply({ content: '⏳ جاري إنشاء موارد الكلان (الرومات والرتب)...', flags: MessageFlags.Ephemeral });

        try {
            const assets = await clanAssets.createClanAssets(interaction.guild, result.clan, interaction.member);
            if (assets.success) {
                await interaction.editReply({ content: `✅ تم إنشاء الكلان **${name}** بنجاح!\n> توجه إلى ${assets.textChannel} للبدء.` });
            } else {
                await interaction.editReply({ content: `⚠️ تم إنشاء الكلان لكن حدثت مشكلة في القنوات: ${assets.error}` });
            }
        } catch (err) {
            await interaction.editReply({ content: `⚠️ تم إنشاء الكلان لكن فشل إنشاء الموارد: ${err.message}` });
        }
    },

    async handleInviteButton(interaction) {
        const clan = clanManager.getUserClan(interaction.guild.id, interaction.user.id);
        if (!clan) return interaction.reply({ content: '❌ لست في كلان!', flags: MessageFlags.Ephemeral });
        if (!clanManager.hasPermission(interaction.guild.id, interaction.user.id, 'invite')) {
            return interaction.reply({ content: '❌ ليس لديك صلاحية للدعوة!', flags: MessageFlags.Ephemeral });
        }
        const modal = new ModalBuilder().setCustomId('clan_invite_modal').setTitle('📨 دعوة عضو للكلان');
        modal.addComponents(
            new ActionRowBuilder().addComponents(
                new TextInputBuilder().setCustomId('user_id').setLabel('معرف العضو (ID)').setPlaceholder('مثلاً: 1234567890123456').setStyle(TextInputStyle.Short).setRequired(true)
            )
        );
        await interaction.showModal(modal);
    },

    async handleInviteSubmit(interaction) {
        const targetId = interaction.fields.getTextInputValue('user_id').trim().replace(/\D/g, '');
        if (!targetId) return interaction.reply({ content: '❌ معرف غير صحيح!', flags: MessageFlags.Ephemeral });

        const targetMember = await interaction.guild.members.fetch(targetId).catch(() => null);
        if (!targetMember) return interaction.reply({ content: '❌ العضو غير موجود في هذا السيرفر!', flags: MessageFlags.Ephemeral });
        if (targetMember.user.bot) return interaction.reply({ content: '❌ لا يمكن دعوة بوت!', flags: MessageFlags.Ephemeral });

        const clan = clanManager.getUserClan(interaction.guild.id, interaction.user.id);
        if (!clan) return interaction.reply({ content: '❌ لست في كلان!', flags: MessageFlags.Ephemeral });

        if (clanManager.getUserClan(interaction.guild.id, targetId)) {
            return interaction.reply({ content: `❌ ${targetMember.displayName} بالفعل في كلان!`, flags: MessageFlags.Ephemeral });
        }

        const result = clanManager.inviteMember(interaction.guild.id, clan.id, interaction.user.id, targetId);
        if (!result.success) return interaction.reply({ content: `❌ ${result.error}`, flags: MessageFlags.Ephemeral });

        const rankMenu = new StringSelectMenuBuilder()
            .setCustomId(`clan_invite_rank_${clan.id}|${targetId}|${interaction.guild.id}`)
            .setPlaceholder('اختر رتبة العضو الجديد...')
            .addOptions([
                { label: '🛡️ جندي', description: 'الرتبة الأساسية', value: 'member', emoji: '🛡️' },
                { label: '🎖️ ضابط', description: 'صلاحية الدعوة والقبول', value: 'officer', emoji: '🎖️' },
                { label: '⭐ نائب', description: 'صلاحيات واسعة', value: 'deputy', emoji: '⭐' },
            ]);

        await interaction.reply({
            content: `📨 حدد الرتبة لـ **${targetMember.displayName}** قبل إرسال الدعوة:`,
            components: [new ActionRowBuilder().addComponents(rankMenu)],
            flags: MessageFlags.Ephemeral
        });
    },

    async handleInviteRankSelect(interaction, clanId, targetId, guildId) {
        const selectedRank = interaction.values[0];
        const clan = clanManager.getClan(guildId, clanId);
        if (!clan) return interaction.update({ content: '❌ الكلان غير موجود!', components: [] });

        const guild = await interaction.client.guilds.fetch(guildId).catch(() => null);
        const targetMember = guild ? await guild.members.fetch(targetId).catch(() => null) : null;
        if (!targetMember) return interaction.update({ content: '❌ العضو غير موجود!', components: [] });

        const rankNames = { deputy: '⭐ نائب', officer: '🎖️ ضابط', member: '🛡️ جندي' };

        const embed = new EmbedBuilder()
            .setColor('#5865F2')
            .setTitle('📨 دعوة للانضمام لكلان')
            .setDescription([
                `> 🏰 **الكلان:** ${clan.name}${clan.tag ? ` [${clan.tag}]` : ''}`,
                `> 🎖️ **الرتبة المخصصة:** ${rankNames[selectedRank] || selectedRank}`,
                '',
                'هل تريد الانضمام؟',
            ].join('\n'));

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`clan:accept:${clanId}:${guildId}:${selectedRank}`).setLabel('قبول ✅').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId(`clan:reject:${clanId}:${guildId}`).setLabel('رفض ❌').setStyle(ButtonStyle.Danger)
        );

        const dmSent = await targetMember.send({ embeds: [embed], components: [row] }).catch(() => null);

        if (dmSent) {
            await interaction.update({ content: `✅ تم إرسال الدعوة لـ <@${targetId}> برتبة **${rankNames[selectedRank]}**.`, components: [] });
        } else {
            await interaction.update({
                content: `⚠️ تعذّر إرسال الدعوة لـ <@${targetId}> — ربما أغلق الرسائل الخاصة.\n> يمكنه كتابة \`كلانات\` والانضمام يدوياً.`,
                components: []
            });
        }
    },

    async handleInviteResponse(interaction, action, clanId, guildId, rank = 'member') {
        const resolvedGuildId = guildId || interaction.guild?.id;
        if (!resolvedGuildId) return interaction.update({ content: '❌ تعذّر تحديد السيرفر.', embeds: [], components: [] });

        if (action === 'accept') {
            const existingClan = clanManager.getUserClan(resolvedGuildId, interaction.user.id);
            if (existingClan) return interaction.update({ content: '❌ أنت بالفعل في كلان!', embeds: [], components: [] });

            const result = clanManager.addMember(resolvedGuildId, clanId, interaction.user.id, rank);
            if (!result.success) return interaction.update({ content: `❌ ${result.error}`, embeds: [], components: [] });

            const clan = clanManager.getClan(resolvedGuildId, clanId);
            if (!clan) return interaction.update({ content: '❌ الكلان لم يعد موجوداً!', embeds: [], components: [] });

            try {
                const guild = await interaction.client.guilds.fetch(resolvedGuildId).catch(() => null);
                if (guild) await clanAssets.addMemberRole(guild, interaction.user.id, clan, rank).catch(() => {});
            } catch (e) { console.error('[addMemberRole Error]:', e.message); }

            const rankNames = { deputy: '⭐ نائب', officer: '🎖️ ضابط', member: '🛡️ جندي' };
            await interaction.update({ content: `✅ انضممت لكلان **${clan.name}** برتبة **${rankNames[rank] || rank}**! 🎉`, embeds: [], components: [] });
        } else {
            await interaction.update({ content: '❌ تم رفض الدعوة.', embeds: [], components: [] });
        }
    },

    async handleLeave(interaction) {
        const clan = clanManager.getUserClan(interaction.guild.id, interaction.user.id);
        if (!clan) return interaction.reply({ content: '❌ أنت لست في أي كلان!', flags: MessageFlags.Ephemeral });
        if (clan.leaderId === interaction.user.id) {
            return interaction.reply({ content: '❌ القائد لا يمكنه المغادرة! يجب حل الكلان أو نقل القيادة.', flags: MessageFlags.Ephemeral });
        }

        const result = clanManager.kickMember(interaction.guild.id, clan.id, interaction.user.id, interaction.user.id);
        if (!result.success) return interaction.reply({ content: `❌ ${result.error}`, flags: MessageFlags.Ephemeral });

        await clanAssets.removeMemberRole(interaction.guild, interaction.user.id, clan).catch(() => {});
        await interaction.reply({ content: `🚪 لقد غادرت كلان **${clan.name}** بنجاح.`, flags: MessageFlags.Ephemeral });
    },

    async handleDissolve(interaction) {
        const clan = clanManager.getUserClan(interaction.guild.id, interaction.user.id);
        if (!clan || clan.leaderId !== interaction.user.id) {
            return interaction.reply({ content: '❌ فقط القائد يمكنه حل الكلان!', flags: MessageFlags.Ephemeral });
        }
        const embed = PremiumEmbedBuilder.error('⚠️ تحذير نهائي', `هل أنت متأكد من حل وحذف كلان **${clan.name}** بالكامل؟\n> ⚠️ **لا يمكن التراجع!**`);
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('clan_confirm_delete').setLabel('تأكيد الحل').setStyle(ButtonStyle.Danger).setEmoji('💥'),
            new ButtonBuilder().setCustomId('clan_cancel_delete').setLabel('إلغاء').setStyle(ButtonStyle.Secondary)
        );
        await interaction.reply({ embeds: [embed], components: [row], flags: MessageFlags.Ephemeral });
    },

    async handleConfirmDissolve(interaction) {
        const clan = clanManager.getUserClan(interaction.guild.id, interaction.user.id);
        if (!clan || clan.leaderId !== interaction.user.id) {
            return interaction.reply({ content: '❌ فشلت العملية.', flags: MessageFlags.Ephemeral });
        }
        await clanAssets.deleteClanAssets(interaction.guild, clan).catch(() => {});
        clanManager.dissolveClan(interaction.guild.id, clan.id, interaction.user.id);
        await interaction.update({ content: `✅ تم حل كلان **${clan.name}** وحذف جميع موارده.`, embeds: [], components: [] });
    },

    async showClanList(interaction) {
        const clans = clanManager.getAllClans(interaction.guild.id);
        if (clans.length === 0) {
            return interaction.reply({ content: '❌ لا يوجد كلانات في هذا السيرفر حالياً.\nاكتب `كلانات` لإنشاء أول كلان!', flags: MessageFlags.Ephemeral });
        }

        const embed = new EmbedBuilder()
            .setColor('#5865F2')
            .setTitle('📜 كلانات السيرفر')
            .setDescription(
                clans.map((c, i) => {
                    const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
                    return `${medal} **${c.name}**${c.tag ? ` \`[${c.tag}]\`` : ''} — 👥 ${c.stats?.totalMembers ?? 1} عضو`;
                }).join('\n')
            )
            .setFooter({ text: `${clans.length} كلان في السيرفر` })
            .setTimestamp();

        await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    },

    async handleDescButton(interaction) {
        const clan = clanManager.getUserClan(interaction.guild.id, interaction.user.id);
        if (!clan) return interaction.reply({ content: '❌ لست في كلان!', flags: MessageFlags.Ephemeral });
        const isAdmin = clan.leaderId === interaction.user.id || clan.deputies?.includes(interaction.user.id);
        if (!isAdmin) return interaction.reply({ content: '❌ فقط القائد والنائب يمكنهما تعديل الوصف!', flags: MessageFlags.Ephemeral });

        const modal = new ModalBuilder().setCustomId(`clan_desc_modal_${clan.id}`).setTitle('تعديل وصف الكلان');
        modal.addComponents(
            new ActionRowBuilder().addComponents(
                new TextInputBuilder().setCustomId('clan_desc').setLabel('الوصف الجديد').setPlaceholder('اكتب وصف مميز لكلانك...').setStyle(TextInputStyle.Paragraph).setRequired(true).setMaxLength(200)
            )
        );
        await interaction.showModal(modal);
    },

    async handleDescSubmit(interaction, clanId) {
        const desc = interaction.fields.getTextInputValue('clan_desc').trim();
        const clan = clanManager.getUserClan(interaction.guild.id, interaction.user.id);
        if (!clan) return interaction.reply({ content: '❌ لست في كلان!', flags: MessageFlags.Ephemeral });
        const isAdmin = clan.leaderId === interaction.user.id || clan.deputies?.includes(interaction.user.id);
        if (!isAdmin) return interaction.reply({ content: '❌ ليس لديك صلاحية!', flags: MessageFlags.Ephemeral });

        clan.description = desc;
        clanManager.saveClans();
        await interaction.reply({ content: `✅ تم تحديث وصف الكلان!`, flags: MessageFlags.Ephemeral });
    },

    async handleRenameButton(interaction, clanId) {
        const clan = clanManager.getUserClan(interaction.guild.id, interaction.user.id);
        if (!clan || clan.leaderId !== interaction.user.id) {
            return interaction.reply({ content: '❌ فقط القائد يمكنه إعادة التسمية!', flags: MessageFlags.Ephemeral });
        }
        const modal = new ModalBuilder().setCustomId(`clan_rename_modal_${clanId || clan.id}`).setTitle('إعادة تسمية الكلان');
        modal.addComponents(
            new ActionRowBuilder().addComponents(
                new TextInputBuilder().setCustomId('clan_new_name').setLabel('الاسم الجديد').setPlaceholder('أدخل الاسم الجديد للكلان').setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(32)
            )
        );
        await interaction.showModal(modal);
    },

    async handleRenameSubmit(interaction, clanId) {
        const newName = interaction.fields.getTextInputValue('clan_new_name').trim();
        if (!newName) return interaction.reply({ content: '❌ الاسم لا يمكن أن يكون فارغاً!', flags: MessageFlags.Ephemeral });

        const clan = clanManager.getUserClan(interaction.guild.id, interaction.user.id);
        if (!clan) return interaction.reply({ content: '❌ لست في كلان!', flags: MessageFlags.Ephemeral });
        if (clan.leaderId !== interaction.user.id) return interaction.reply({ content: '❌ فقط القائد يمكنه إعادة التسمية!', flags: MessageFlags.Ephemeral });

        if (clanManager.nameExists(interaction.guild.id, newName) && newName !== clan.name) {
            return interaction.reply({ content: '❌ يوجد كلان آخر بنفس الاسم!', flags: MessageFlags.Ephemeral });
        }

        const old = clan.name;
        clan.name = newName;
        clanManager.saveClans();
        await interaction.reply({ content: `✅ تم تغيير اسم الكلان: **${old}** → **${newName}**`, flags: MessageFlags.Ephemeral });
    },

    async handleKickButton(interaction) {
        const clan = clanManager.getUserClan(interaction.guild.id, interaction.user.id);
        const isAdmin = clan?.leaderId === interaction.user.id || clan?.deputies?.includes(interaction.user.id);
        if (!clan || !isAdmin) return interaction.reply({ content: '❌ ليس لديك صلاحية الفصل!', flags: MessageFlags.Ephemeral });

        const modal = new ModalBuilder().setCustomId('clan_kick_modal').setTitle('فصل عضو من الكلان');
        modal.addComponents(
            new ActionRowBuilder().addComponents(
                new TextInputBuilder().setCustomId('kick_user_id').setLabel('معرف العضو (ID)').setPlaceholder('الصق معرف العضو هنا').setStyle(TextInputStyle.Short).setRequired(true)
            )
        );
        await interaction.showModal(modal);
    },

    async handleKickSubmit(interaction) {
        const targetId = interaction.fields.getTextInputValue('kick_user_id').trim().replace(/\D/g, '');
        if (!targetId) return interaction.reply({ content: '❌ معرف غير صحيح!', flags: MessageFlags.Ephemeral });

        const clan = clanManager.getUserClan(interaction.guild.id, interaction.user.id);
        if (!clan) return interaction.reply({ content: '❌ لست في كلان!', flags: MessageFlags.Ephemeral });

        if (targetId === clan.leaderId) return interaction.reply({ content: '❌ لا يمكن فصل القائد!', flags: MessageFlags.Ephemeral });
        if (targetId === interaction.user.id) return interaction.reply({ content: '❌ لا يمكنك فصل نفسك! استخدم مغادرة.', flags: MessageFlags.Ephemeral });

        const result = clanManager.kickMember(interaction.guild.id, clan.id, interaction.user.id, targetId);
        if (!result.success) return interaction.reply({ content: `❌ ${result.error}`, flags: MessageFlags.Ephemeral });

        await clanAssets.removeMemberRole(interaction.guild, targetId, clan).catch(() => {});
        await interaction.reply({ content: `✅ تم فصل <@${targetId}> من الكلان.`, flags: MessageFlags.Ephemeral });
    },

    async handleRankSelection(interaction, targetId) {
        const selectedRank = interaction.values?.[0];
        if (!selectedRank || !targetId) return interaction.reply({ content: '❌ بيانات غير صحيحة.', flags: MessageFlags.Ephemeral });

        const clan = clanManager.getUserClan(interaction.guild.id, interaction.user.id);
        if (!clan || clan.leaderId !== interaction.user.id) {
            return interaction.reply({ content: '❌ فقط القائد يمكنه تعيين الرتب!', flags: MessageFlags.Ephemeral });
        }

        const result = clanManager.promoteMember(interaction.guild.id, clan.id, interaction.user.id, targetId, selectedRank);
        if (!result.success) return interaction.reply({ content: `❌ ${result.error}`, flags: MessageFlags.Ephemeral });

        await clanAssets.addMemberRole(interaction.guild, targetId, clan, selectedRank).catch(() => {});

        const rankNames = { deputy: '⭐ نائب', officer: '🎖️ ضابط', member: '🛡️ جندي' };
        await interaction.reply({ content: `✅ تم تعيين <@${targetId}> كـ **${rankNames[selectedRank] || selectedRank}**.`, flags: MessageFlags.Ephemeral });
    },

    async handleEditRankButton(interaction) {
        const clan = clanManager.getUserClan(interaction.guild.id, interaction.user.id);
        if (!clan || clan.leaderId !== interaction.user.id) {
            return interaction.reply({ content: '❌ فقط القائد يمكنه تعديل الرتب!', flags: MessageFlags.Ephemeral });
        }
        const modal = new ModalBuilder().setCustomId('clan_editrank_modal').setTitle('تعديل رتبة عضو');
        modal.addComponents(
            new ActionRowBuilder().addComponents(
                new TextInputBuilder().setCustomId('editrank_user_id').setLabel('معرف العضو (ID)').setPlaceholder('الصق معرف العضو هنا').setStyle(TextInputStyle.Short).setRequired(true)
            )
        );
        await interaction.showModal(modal);
    },

    async handleEditRankModalSubmit(interaction) {
        const targetId = interaction.fields.getTextInputValue('editrank_user_id').trim().replace(/\D/g, '');
        if (!targetId) return interaction.reply({ content: '❌ معرف غير صحيح!', flags: MessageFlags.Ephemeral });

        const clan = clanManager.getUserClan(interaction.guild.id, interaction.user.id);
        if (!clan || clan.leaderId !== interaction.user.id) {
            return interaction.reply({ content: '❌ فقط القائد يمكنه تعديل الرتب!', flags: MessageFlags.Ephemeral });
        }

        if (targetId === clan.leaderId) return interaction.reply({ content: '❌ لا يمكن تعديل رتبة القائد!', flags: MessageFlags.Ephemeral });

        const targetMember = await interaction.guild.members.fetch(targetId).catch(() => null);
        if (!targetMember) return interaction.reply({ content: '❌ العضو غير موجود في السيرفر!', flags: MessageFlags.Ephemeral });

        const currentRank = clanManager.getMemberRank(interaction.guild.id, targetId);
        if (!currentRank) return interaction.reply({ content: '❌ هذا العضو ليس في الكلان!', flags: MessageFlags.Ephemeral });

        const rankNames = { deputy: '⭐ نائب', officer: '🎖️ ضابط', member: '🛡️ جندي' };
        const rankMenu = new StringSelectMenuBuilder()
            .setCustomId(`clan_rank_select_${targetId}`)
            .setPlaceholder('اختر الرتبة الجديدة...')
            .addOptions([
                { label: '🛡️ جندي', description: 'الرتبة الأساسية', value: 'member', emoji: '🛡️' },
                { label: '🎖️ ضابط', description: 'صلاحية الدعوة والقبول', value: 'officer', emoji: '🎖️' },
                { label: '⭐ نائب', description: 'صلاحيات واسعة', value: 'deputy', emoji: '⭐' },
            ]);

        await interaction.reply({
            content: `🎖️ تعديل رتبة <@${targetId}>\n> الرتبة الحالية: **${rankNames[currentRank] || currentRank}**\nاختر الرتبة الجديدة:`,
            components: [new ActionRowBuilder().addComponents(rankMenu)],
            flags: MessageFlags.Ephemeral
        });
    },

    // ─── تفعيل نظام الكلانات ─────────────────────────────────────────────
    async setupClans(context) {
        const guild = context.guild;
        const author = context.author || context.user;
        const isInteraction = context.isCommand?.() || context.isButton?.();

        const loadMsg = await _reply(context, isInteraction, '⏳ جاري تفعيل نظام الكلانات...');

        try {
            clanManager.initGuild(guild.id);
            const botMember = guild.members.me;

            // البحث عن قناة الكلانات الموجودة أو إنشاؤها
            let clansChannel = guild.channels.cache.find(c =>
                c.type === 0 && (c.name?.includes('الكلانات') || c.name?.includes('clans') || c.name?.includes('🏰'))
            );

            if (!clansChannel) {
                // إنشاء فئة الكلانات
                const category = await guild.channels.create({
                    name: '🏰 ══ الكلانات ══',
                    type: 4,
                    permissionOverwrites: [
                        { id: guild.roles.everyone.id, deny: ['SendMessages'] },
                        { id: botMember.id, allow: ['SendMessages', 'ManageChannels', 'ManageRoles'] }
                    ]
                });

                clansChannel = await guild.channels.create({
                    name: '🏰┃الكلانات',
                    type: 0,
                    parent: category.id,
                    topic: '🏰 نظام الكلانات — اضغط الأزرار للبدء',
                    permissionOverwrites: [
                        { id: guild.roles.everyone.id, allow: ['ViewChannel', 'ReadMessageHistory'], deny: ['SendMessages'] },
                        { id: botMember.id, allow: ['SendMessages', 'ManageMessages'] }
                    ]
                });
            }

            // إرسال لوحة تحكم الكلانات
            const prevMsgs = await clansChannel.messages.fetch({ limit: 10 }).catch(() => null);
            const hasDash = prevMsgs?.some(m => m.author.id === botMember.id && m.embeds.length > 0);

            if (!hasDash) {
                const embed = new EmbedBuilder()
                    .setColor('#5865F2')
                    .setTitle('🏰 نظام الكلانات الاحترافي')
                    .setDescription([
                        '> 🛡️ **مرحباً بك في نظام الكلانات!**',
                        '',
                        '**ماذا يمكنك فعله؟**',
                        '> ✨ أنشئ كلانك الخاص مع رتب وقنوات حصرية',
                        '> 📨 ادع أصدقاءك وامنحهم رتباً مختلفة',
                        '> 🏆 تنافس مع الكلانات الأخرى',
                        '> 🔧 إدارة كاملة عبر الأزرار',
                        '',
                        '**الرتب المتاحة:**',
                        '> 👑 **قائد** — صلاحيات كاملة',
                        '> ⭐ **نائب** — صلاحيات إدارية واسعة',
                        '> 🎖️ **ضابط** — صلاحية الدعوة والقبول',
                        '> 🛡️ **جندي** — الرتبة الأساسية',
                        '',
                        '**للبدء:** اضغط على أحد الأزرار أدناه 👇',
                        '**أو اكتب:** `كلانات` في أي قناة',
                    ].join('\n'))
                    .setFooter({ text: '🏰 نظام الكلانات v2 • اضغط إنشاء للبدء' })
                    .setTimestamp();

                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('clan_create_btn').setLabel('✨ إنشاء كلان').setStyle(ButtonStyle.Success),
                    new ButtonBuilder().setCustomId('clan_list_btn').setLabel('📜 الكلانات الموجودة').setStyle(ButtonStyle.Primary)
                );

                const panelMsg = await clansChannel.send({ embeds: [embed], components: [row] });
                await panelMsg.pin().catch(() => {});
            }

            const replyMsg = `✅ تم تفعيل نظام الكلانات بنجاح!\n> 📌 قناة الكلانات: ${clansChannel}`;
            if (isInteraction && loadMsg?.edit) await loadMsg.edit(replyMsg).catch(() => {});
            else if (loadMsg?.edit) await loadMsg.edit(replyMsg).catch(() => {});

        } catch (e) {
            console.error('[setupClans Error]:', e);
            const errMsg = `❌ فشل التفعيل: ${e.message}`;
            if (loadMsg?.edit) await loadMsg.edit(errMsg).catch(() => {});
        }
    },

    // ─── stub لـ showDashboard من لوحة التحكم ────────────────────────────
    async showDashboard_interaction(interaction) {
        const clan = clanManager.getUserClan(interaction.guild.id, interaction.user.id);
        if (!clan) return interaction.reply({ content: '❌ لست في كلان!', flags: MessageFlags.Ephemeral });
        await module.exports.showDashboard(interaction, clan);
    },
};

// مساعد داخلي
async function _reply(context, isInteraction, text) {
    try {
        if (isInteraction) return await context.reply({ content: text, flags: MessageFlags.Ephemeral });
        return await context.reply(text);
    } catch {
        return null;
    }
}
