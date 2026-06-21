'use strict';

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║  🔨⚠️👢🔇 أوامر الإدارة v3.0 — بتأكيد الأزرار الاحترافية             ║
 * ║  ban | kick | mute | warn — تأكيد قبل التنفيذ + سجل بصري             ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, MessageFlags, PermissionFlagsBits } = require('discord.js');
const db = require('../../utils/database');
const { hasPermOrOwner, getAuthor } = require('../../utils/permissions');

// ─── معالج مشترك للتأكيد ─────────────────────────────────────────────────────
const pendingActions = new Map(); // msgId → ActionData

async function requestConfirmation(message, action) {
    const { type, target, reason, author, cost } = action;

    const icons = { ban: '🔨', kick: '👢', mute: '🔇', warn: '⚠️', jail: '🔒' };
    const colors = { ban: '#ED4245', kick: '#E67E22', mute: '#FEE75C', warn: '#FFA500', jail: '#95A5A6' };
    const labels = { ban: 'حظر نهائي', kick: 'طرد', mute: 'كتم', warn: 'تحذير', jail: 'سجن' };

    const embed = new EmbedBuilder()
        .setColor(colors[type] || '#ED4245')
        .setTitle(`${icons[type]} تأكيد ${labels[type]}`)
        .setDescription([
            `> **العضو:** ${target}`,
            `> **السبب:** ${reason || 'بدون سبب'}`,
            `> **المسؤول:** ${author}`,
            '',
            `> ⚠️ **هل أنت متأكد من تنفيذ هذا الإجراء؟**`,
        ].join('\n'))
        .setThumbnail(target.displayAvatarURL?.() || null)
        .setFooter({ text: '⏰ ينتهي التأكيد بعد 30 ثانية' });

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`mod_confirm_${type}_${target.id}`)
            .setLabel(`✅ نعم، ${labels[type]}`)
            .setStyle(type === 'warn' ? ButtonStyle.Primary : ButtonStyle.Danger),
        new ButtonBuilder()
            .setCustomId(`mod_cancel_${type}_${target.id}`)
            .setLabel('❌ إلغاء')
            .setStyle(ButtonStyle.Secondary),
    );

    const msg = await message.reply({ embeds: [embed], components: [row] });
    pendingActions.set(msg.id, { ...action, msg });

    // انتهاء التأكيد
    setTimeout(() => {
        if (pendingActions.has(msg.id)) {
            pendingActions.delete(msg.id);
            embed.setColor('#95A5A6').setDescription('> ⏰ **انتهى وقت التأكيد.**');
            msg.edit({ embeds: [embed], components: [] }).catch(() => {});
        }
    }, 30000);
}

// ─── بناء embed النتيجة ──────────────────────────────────────────────────────
function buildResultEmbed(type, target, reason, author, extra = '') {
    const icons = { ban: '🔨', kick: '👢', mute: '🔇', warn: '⚠️', jail: '🔒', unjail: '🔓', unmute: '🔊' };
    const colors = { ban: '#ED4245', kick: '#E67E22', mute: '#FEE75C', warn: '#FFA500', jail: '#95A5A6', unjail: '#57F287', unmute: '#57F287' };
    const labels = { ban: 'حظر نهائي', kick: 'طرد', mute: 'كتم', warn: 'تحذير', jail: 'سجن', unjail: 'إطلاق سراح', unmute: 'رفع الكتم' };

    return new EmbedBuilder()
        .setColor(colors[type] || '#ED4245')
        .setTitle(`${icons[type]} تم تنفيذ ${labels[type]}`)
        .addFields(
            { name: '👤 العضو', value: `${target}`, inline: true },
            { name: '📝 السبب', value: reason || 'بدون سبب', inline: true },
            { name: '👮 المسؤول', value: `${author}`, inline: true },
        )
        .setFooter({ text: extra || `تم التنفيذ بنجاح` })
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
        if (!target.bannable) return message.reply('❌ لا يمكنني حظر هذا العضو!');

        const reason = args.slice(1).join(' ') || 'لا يوجد سبب';
        await requestConfirmation(message, {
            type: 'ban', target: target.user, member: target,
            reason, author: message.author, guild: message.guild
        });
    },

    async handleModInteraction(interaction) { await handleModButton(interaction); }
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

        const reason = args.slice(1).join(' ') || 'لا يوجد سبب';
        await requestConfirmation(message, {
            type: 'kick', target: target.user, member: target,
            reason, author: message.author, guild: message.guild
        });
    },

    async handleModInteraction(interaction) { await handleModButton(interaction); }
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
        if (!target) return message.reply('❌ منشن العضو!');
        if (target.id === message.author.id) return message.reply('❌ لا يمكنك تحذير نفسك!');

        const reason = args.slice(1).join(' ') || 'لا يوجد سبب';
        await requestConfirmation(message, {
            type: 'warn', target: target.user, member: target,
            reason, author: message.author, guild: message.guild
        });
    },

    async handleModInteraction(interaction) { await handleModButton(interaction); }
};

// ════════════════════════════════════════════════════════════════════════════
//  🔇 MUTE
// ════════════════════════════════════════════════════════════════════════════
module.exports.mute = {
    name: 'mute',
    aliases: ['كتم', 'صمت'],
    description: 'كتم عضو (مع تأكيد)',
    usage: 'mute @user [السبب]',

    async execute(message, args) {
        if (!hasPermOrOwner(message.member, PermissionFlagsBits.ModerateMembers)) {
            return message.reply('❌ ليس لديك صلاحية الكتم!');
        }

        const target = message.mentions.members.first();
        if (!target) return message.reply('❌ منشن العضو!');
        if (!target.moderatable) return message.reply('❌ لا يمكنني كتم هذا العضو!');

        const reason = args.slice(1).join(' ') || 'لا يوجد سبب';
        await requestConfirmation(message, {
            type: 'mute', target: target.user, member: target,
            reason, author: message.author, guild: message.guild,
            duration: 10 * 60 * 1000 // 10 دقائق افتراضياً
        });
    },

    async handleModInteraction(interaction) { await handleModButton(interaction); }
};

// ─── معالج الأزرار الموحّد ────────────────────────────────────────────────────
async function handleModButton(interaction) {
    const id = interaction.customId;
    if (!id.startsWith('mod_confirm_') && !id.startsWith('mod_cancel_')) return;

    // فحص الصلاحيات
    if (!hasPermOrOwner(interaction.member, PermissionFlagsBits.ModerateMembers)) {
        return interaction.reply({ content: '❌ ليس لديك صلاحية!', flags: MessageFlags.Ephemeral });
    }

    const msgId = interaction.message.id;
    const actionData = pendingActions.get(msgId);

    if (!actionData) {
        return interaction.update({
            embeds: [new EmbedBuilder().setColor('#95A5A6').setDescription('> ⏰ انتهى وقت هذا الإجراء.')],
            components: []
        });
    }

    // إلغاء
    if (id.startsWith('mod_cancel_')) {
        pendingActions.delete(msgId);
        await interaction.update({
            embeds: [new EmbedBuilder().setColor('#95A5A6').setTitle('❌ تم إلغاء الإجراء').setDescription(`> تم إلغاء ${id.split('_')[2]} من قِبل ${interaction.user}`)],
            components: []
        });
        return;
    }

    // تأكيد
    pendingActions.delete(msgId);
    const { type, member, target, reason, author, guild, duration } = actionData;

    try {
        let resultExtra = '';

        if (type === 'ban') {
            await member.ban({ reason: `بواسطة ${author.username}: ${reason}` });
            resultExtra = '🔨 تم الحظر النهائي';

        } else if (type === 'kick') {
            await member.kick(`بواسطة ${author.username}: ${reason}`);
            resultExtra = '👢 تم الطرد';

        } else if (type === 'warn') {
            const userData = db.getUserData(target.id);
            const warnings = (userData.warnings || 0) + 1;
            db.updateFields(target.id, { warnings });
            resultExtra = `⚠️ التحذير رقم ${warnings}`;

            // إرسال DM للمحذَّر
            target.send?.(`⚠️ **تحذير** في **${guild.name}**\nالسبب: ${reason}\nعدد تحذيراتك: ${warnings}`).catch(() => {});

        } else if (type === 'mute') {
            await member.timeout(duration || 10 * 60 * 1000, `بواسطة ${author.username}: ${reason}`);
            resultExtra = '🔇 تم الكتم 10 دقائق';
        }

        const resultEmbed = buildResultEmbed(type, target, reason, author, resultExtra);

        // زر رفع العقوبة (للكتم فقط)
        const components = [];
        if (type === 'mute') {
            components.push(new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`mod_confirm_unmute_${target.id}`)
                    .setLabel('🔊 رفع الكتم')
                    .setStyle(ButtonStyle.Success)
            ));
        }

        await interaction.update({ embeds: [resultEmbed], components });

    } catch (error) {
        await interaction.update({
            embeds: [new EmbedBuilder().setColor('#ED4245').setTitle('❌ فشل التنفيذ').setDescription(`> ${error.message}`)],
            components: []
        });
    }
}

// تصدير المعالج ليُستخدم في interactionCreate
module.exports.handleModButton = handleModButton;
