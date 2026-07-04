'use strict';

const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, MessageFlags, PermissionFlagsBits } = require('discord.js');
const db = require('../../utils/database');
const { hasPermOrOwner, getAuthor } = require('../../utils/permissions');

// ─── طلبات التأكيد المعلقة ─────────────────────────────────────────────────
// المفتاح: msgId → ActionData
const pendingActions = new Map();

// تنظيف تلقائي كل 10 دقائق
const _cleanup = setInterval(() => {
    const now = Date.now();
    for (const [msgId, data] of pendingActions) {
        if (now - data.createdAt > 35_000) pendingActions.delete(msgId);
    }
}, 10 * 60 * 1000);
_cleanup.unref?.();

// ─── بناء embed التأكيد ──────────────────────────────────────────────────────
async function requestConfirmation(message, action) {
    const { type, target, reason, author } = action;

    const META = {
        ban:  { icon: '🔨', color: '#ED4245', label: 'حظر نهائي' },
        kick: { icon: '👢', color: '#E67E22', label: 'طرد'       },
        mute: { icon: '🔇', color: '#FEE75C', label: 'كتم'       },
        warn: { icon: '⚠️',  color: '#FFA500', label: 'تحذير'    },
        jail: { icon: '🔒', color: '#95A5A6', label: 'سجن'       },
    };
    const m = META[type] || META.ban;

    const embed = new EmbedBuilder()
        .setColor(m.color)
        .setTitle(`${m.icon} تأكيد — ${m.label}`)
        .setDescription(
            [
                `> **العضو:** ${target}`,
                `> **السبب:** ${reason || 'بدون سبب محدد'}`,
                `> **المسؤول:** ${author}`,
                '',
                `> ⚠️ هل تريد تنفيذ هذا الإجراء؟`,
            ].join('\n')
        )
        .setThumbnail(target.displayAvatarURL?.() || null)
        .setFooter({ text: '⏰ ينتهي التأكيد بعد 30 ثانية' });

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`mod_confirm_${type}_${target.id}_${author.id}`)
            .setLabel(`✅ ${m.label}`)
            .setStyle(type === 'warn' ? ButtonStyle.Primary : ButtonStyle.Danger),
        new ButtonBuilder()
            .setCustomId(`mod_cancel_${type}_${target.id}_${author.id}`)
            .setLabel('❌ إلغاء')
            .setStyle(ButtonStyle.Secondary)
    );

    const msg = await message.reply({ embeds: [embed], components: [row] });
    pendingActions.set(msg.id, { ...action, createdAt: Date.now(), authorId: author.id });

    // إلغاء تلقائي بعد 30 ثانية
    setTimeout(() => {
        if (!pendingActions.has(msg.id)) return;
        pendingActions.delete(msg.id);
        embed.setColor('#95A5A6').setDescription('> ⏰ **انتهى وقت التأكيد — تم إلغاء الإجراء.**');
        msg.edit({ embeds: [embed], components: [] }).catch(() => {});
    }, 30_000);
}

// ─── بناء embed النتيجة ──────────────────────────────────────────────────────
function buildResultEmbed(type, target, reason, author, extra = '') {
    const META = {
        ban:    { icon: '🔨', color: '#ED4245', label: 'حظر نهائي'   },
        kick:   { icon: '👢', color: '#E67E22', label: 'طرد'          },
        mute:   { icon: '🔇', color: '#FEE75C', label: 'كتم مؤقت'    },
        warn:   { icon: '⚠️',  color: '#FFA500', label: 'تحذير'       },
        jail:   { icon: '🔒', color: '#95A5A6', label: 'سجن'          },
        unjail: { icon: '🔓', color: '#57F287', label: 'إطلاق سراح'  },
        unmute: { icon: '🔊', color: '#57F287', label: 'رفع الكتم'   },
    };
    const m = META[type] || META.ban;

    return new EmbedBuilder()
        .setColor(m.color)
        .setTitle(`${m.icon} تم تنفيذ ${m.label}`)
        .addFields(
            { name: '👤 العضو',    value: `${target}`,             inline: true },
            { name: '📝 السبب',    value: reason || 'بدون سبب',   inline: true },
            { name: '👮 المسؤول',  value: `${author}`,             inline: true }
        )
        .setFooter({ text: extra || 'تم التنفيذ بنجاح' })
        .setTimestamp();
}

// ════════════════════════════════════════════════════════════════════════════
//  🔨 BAN
// ════════════════════════════════════════════════════════════════════════════
module.exports.ban = {
    name: 'ban',
    aliases: ['باند', 'حظر', 'طرد_نهائي'],
    description: 'حظر عضو من السيرفر (مع تأكيد)',
    usage: 'ban @user [السبب]',

    async execute(message, args) {
        if (!hasPermOrOwner(message.member, PermissionFlagsBits.BanMembers)) {
            return message.reply({ content: '❌ ليس لديك صلاحية الحظر!', flags: MessageFlags.Ephemeral });
        }
        const target = message.mentions.members.first();
        if (!target) return message.reply('❌ منشن العضو المراد حظره!\nمثال: `ban @شخص السبب`');
        if (!target.bannable) return message.reply('❌ لا يمكنني حظر هذا العضو — قد يكون رتبته أعلى مني!');
        if (target.id === message.author.id) return message.reply('❌ لا يمكنك حظر نفسك!');

        const reason = args.slice(1).join(' ') || 'لا يوجد سبب';
        await requestConfirmation(message, {
            type: 'ban', target: target.user, member: target,
            reason, author: message.author, guild: message.guild,
        });
    },

    async handleModInteraction(interaction) { await handleModButton(interaction); },
};

// ════════════════════════════════════════════════════════════════════════════
//  👢 KICK
// ════════════════════════════════════════════════════════════════════════════
module.exports.kick = {
    name: 'kick',
    aliases: ['طرد', 'كيك'],
    description: 'طرد عضو من السيرفر (مع تأكيد)',
    usage: 'kick @user [السبب]',

    async execute(message, args) {
        if (!hasPermOrOwner(message.member, PermissionFlagsBits.KickMembers)) {
            return message.reply('❌ ليس لديك صلاحية الطرد!');
        }
        const target = message.mentions.members.first();
        if (!target) return message.reply('❌ منشن العضو المراد طرده!');
        if (!target.kickable) return message.reply('❌ لا يمكنني طرد هذا العضو!');
        if (target.id === message.author.id) return message.reply('❌ لا يمكنك طرد نفسك!');

        const reason = args.slice(1).join(' ') || 'لا يوجد سبب';
        await requestConfirmation(message, {
            type: 'kick', target: target.user, member: target,
            reason, author: message.author, guild: message.guild,
        });
    },

    async handleModInteraction(interaction) { await handleModButton(interaction); },
};

// ════════════════════════════════════════════════════════════════════════════
//  ⚠️ WARN
// ════════════════════════════════════════════════════════════════════════════
module.exports.warn = {
    name: 'warn',
    aliases: ['تحذير', 'انذار'],
    description: 'تحذير عضو (مع تأكيد)',
    usage: 'warn @user [السبب]',

    async execute(message, args) {
        if (!hasPermOrOwner(message.member, PermissionFlagsBits.ModerateMembers)) {
            return message.reply('❌ ليس لديك صلاحية التحذير!');
        }
        const target = message.mentions.members.first();
        if (!target) return message.reply('❌ منشن العضو المراد تحذيره!');
        if (target.id === message.author.id) return message.reply('❌ لا يمكنك تحذير نفسك!');

        const reason = args.slice(1).join(' ') || 'لا يوجد سبب';
        await requestConfirmation(message, {
            type: 'warn', target: target.user, member: target,
            reason, author: message.author, guild: message.guild,
        });
    },

    async handleModInteraction(interaction) { await handleModButton(interaction); },
};

// ════════════════════════════════════════════════════════════════════════════
//  🔇 MUTE
// ════════════════════════════════════════════════════════════════════════════
module.exports.mute = {
    name: 'mute',
    aliases: ['كتم', 'صمت'],
    description: 'كتم عضو مؤقتاً (مع تأكيد)',
    usage: 'mute @user [السبب]',

    async execute(message, args) {
        if (!hasPermOrOwner(message.member, PermissionFlagsBits.ModerateMembers)) {
            return message.reply('❌ ليس لديك صلاحية الكتم!');
        }
        const target = message.mentions.members.first();
        if (!target) return message.reply('❌ منشن العضو المراد كتمه!');
        if (!target.moderatable) return message.reply('❌ لا يمكنني كتم هذا العضو!');
        if (target.id === message.author.id) return message.reply('❌ لا يمكنك كتم نفسك!');

        const reason = args.slice(1).join(' ') || 'لا يوجد سبب';
        await requestConfirmation(message, {
            type: 'mute', target: target.user, member: target,
            reason, author: message.author, guild: message.guild,
            duration: 10 * 60 * 1000, // 10 دقائق افتراضياً
        });
    },

    async handleModInteraction(interaction) { await handleModButton(interaction); },
};

// ─── معالج الأزرار الموحّد ─────────────────────────────────────────────────
async function handleModButton(interaction) {
    const id = interaction.customId;
    if (!id.startsWith('mod_confirm_') && !id.startsWith('mod_cancel_')) return;

    // استخراج authorId من الـ customId (المنسق: mod_confirm_type_targetId_authorId)
    const parts = id.split('_');
    // parts = ['mod','confirm'/'cancel', type, targetId, authorId]
    const authorId = parts[4];

    // تحقق: فقط صاحب الأمر الأصلي يستطيع تأكيده
    if (authorId && interaction.user.id !== authorId) {
        return interaction.reply({
            content: '❌ فقط من أصدر هذا الأمر يمكنه تأكيده أو إلغاؤه.',
            flags: MessageFlags.Ephemeral,
        });
    }

    // فحص صلاحيات عامة
    if (!hasPermOrOwner(interaction.member, PermissionFlagsBits.ModerateMembers)) {
        return interaction.reply({ content: '❌ ليس لديك صلاحية!', flags: MessageFlags.Ephemeral });
    }

    const msgId = interaction.message.id;
    const actionData = pendingActions.get(msgId);

    if (!actionData) {
        return interaction.update({
            embeds: [
                new EmbedBuilder()
                    .setColor('#95A5A6')
                    .setDescription('> ⏰ انتهى وقت هذا الإجراء — يمكنك إعادة الأمر.'),
            ],
            components: [],
        });
    }

    // ── إلغاء ──────────────────────────────────────────────────────────────
    if (id.startsWith('mod_cancel_')) {
        pendingActions.delete(msgId);
        return interaction.update({
            embeds: [
                new EmbedBuilder()
                    .setColor('#95A5A6')
                    .setTitle('❌ تم إلغاء الإجراء')
                    .setDescription(`> تم الإلغاء من قِبل ${interaction.user}`)
                    .setTimestamp(),
            ],
            components: [],
        });
    }

    // ── تنفيذ ──────────────────────────────────────────────────────────────
    pendingActions.delete(msgId);
    const { type, member, target, reason, author, guild, duration } = actionData;

    try {
        let resultExtra = '';

        if (type === 'ban') {
            await member.ban({ reason: `بواسطة ${author.username}: ${reason}` });
            resultExtra = '🔨 تم الحظر النهائي بنجاح';

        } else if (type === 'kick') {
            await member.kick(`بواسطة ${author.username}: ${reason}`);
            resultExtra = '👢 تم الطرد بنجاح';

        } else if (type === 'warn') {
            const userData = db.getUserData(target.id);
            const warnings = (userData.warnings || 0) + 1;
            db.updateFields(target.id, { warnings });
            resultExtra = `⚠️ هذا التحذير رقم ${warnings} للعضو`;
            // إرسال DM
            target.send?.(
                `⚠️ **تحذير** في سيرفر **${guild.name}**\nالسبب: ${reason}\nإجمالي تحذيراتك: **${warnings}**`
            ).catch(() => {});

        } else if (type === 'mute') {
            const muteDuration = duration || 10 * 60 * 1000;
            await member.timeout(muteDuration, `بواسطة ${author.username}: ${reason}`);
            const mins = Math.round(muteDuration / 60_000);
            resultExtra = `🔇 تم الكتم لمدة ${mins} دقيقة`;
        }

        const resultEmbed = buildResultEmbed(type, target, reason, author, resultExtra);

        // زر رفع الكتم للكتم فقط
        const components = [];
        if (type === 'mute') {
            components.push(
                new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId(`mod_confirm_unmute_${target.id}_${author.id}`)
                        .setLabel('🔊 رفع الكتم')
                        .setStyle(ButtonStyle.Success)
                )
            );
        }

        return interaction.update({ embeds: [resultEmbed], components });

    } catch (err) {
        return interaction.update({
            embeds: [
                new EmbedBuilder()
                    .setColor('#ED4245')
                    .setTitle('❌ فشل التنفيذ')
                    .setDescription(`> ${err.message}`)
                    .setTimestamp(),
            ],
            components: [],
        });
    }
}

// تصدير المعالج
module.exports.handleModButton = handleModButton;
