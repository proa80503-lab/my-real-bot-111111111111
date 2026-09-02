'use strict';

/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║  ⚖️ نظام العقوبات الاحترافي v2.0                                          ║
 * ║  يرسل إلى قناة العقوبات تلقائياً بذكاء — حتى لو لم تُحفظ مسبقاً        ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */

const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    PermissionFlagsBits
} = require('discord.js');
const db = require('./database');
const channelResolver = require('./channel-resolver');

// ─── ألوان وأيقونات العقوبات ──────────────────────────────────────────────────
const PUNISHMENT_CONFIG = {
    jail:    { color: '#E74C3C', icon: '🔒', label: 'سجن',     btnLabel: '🔓 فك السجن'    },
    mute:    { color: '#E67E22', icon: '🔇', label: 'كتم',     btnLabel: '🔊 فك الكتم'    },
    ban:     { color: '#8B0000', icon: '🔨', label: 'حظر',     btnLabel: '🔓 فك الحظر'    },
    warn:    { color: '#F1C40F', icon: '⚠️', label: 'تحذير',   btnLabel: '✅ مراجعة'       },
    kick:    { color: '#9B59B6', icon: '👢', label: 'طرد',     btnLabel: '✅ ملاحظة'       },
    timeout: { color: '#FF8C00', icon: '⏰', label: 'تايم-أوت', btnLabel: '✅ ملاحظة'      },
};

/**
 * يُرسل بطاقة عقوبة احترافية إلى قناة العقوبات
 * @param {Guild} guild
 * @param {Object} data  بيانات العقوبة
 */
async function sendPunishmentToChannel(guild, data) {
    if (!guild) return;

    const cfg = PUNISHMENT_CONFIG[data.type] || { color: '#808080', icon: '⚖️', label: data.type || 'عقوبة', btnLabel: '✅ ملاحظة' };

    // بناء Embed احترافي بالعربية
    const embed = new EmbedBuilder()
        .setColor(cfg.color)
        .setTitle(`${cfg.icon} ${data.title || `عقوبة: ${cfg.label}`}`)
        .setDescription([
            `> 👤 **العضو:** <@${data.userId}>`,
            `> 🆔 **الـ ID:** \`${data.userId}\``,
        ].join('\n'))
        .addFields(
            { name: '📋 السبب',      value: data.reason    || 'لم يُذكر',  inline: true },
            { name: '⏳ المدة',      value: data.duration  || 'دائم',      inline: true },
            { name: '👮 المسؤول',   value: data.moderator || 'Auto-Mod',  inline: true },
            { name: '📅 التاريخ',   value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: false },
        )
        .setFooter({ text: `⚖️ نظام العقوبات الآلي • ${guild.name}` })
        .setTimestamp();

    // زر إزالة العقوبة (فقط للعقوبات القابلة للإزالة)
    const showBtn = ['jail', 'mute', 'timeout'].includes(data.type);
    const components = showBtn ? [
        new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`remove_${data.type}_${data.userId}`)
                .setLabel(cfg.btnLabel)
                .setStyle(data.type === 'warn' ? ButtonStyle.Secondary : ButtonStyle.Success)
                .setEmoji('✅'),
            new ButtonBuilder()
                .setCustomId(`ignore_${data.type}_${data.userId}`)
                .setLabel('تجاهل')
                .setStyle(ButtonStyle.Danger)
                .setEmoji('❌')
        )
    ] : [];

    const sent = await channelResolver.sendTo(guild, 'punishmentsChannel', { embeds: [embed], components });

    // Fallback: إذا لم توجد قناة عقوبات → نبحث عن أي قناة إدارية
    if (!sent) {
        const adminCh = channelResolver.resolve(guild, 'adminChannel')
                     || channelResolver.resolve(guild, 'logChannel');
        if (adminCh) {
            await adminCh.send({ embeds: [embed], components }).catch(() => {});
        }
    }
}

/**
 * يتعامل مع ضغط زر إزالة العقوبة
 */
async function handlePunishmentButton(interaction) {
    if (!interaction.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
        return interaction.reply({ content: '❌ ما عندك صلاحية لهذا يخوي!', ephemeral: true });
    }

    const parts = interaction.customId.split('_');
    // remove_jail_userId أو ignore_mute_userId
    const action = parts[0];   // remove | ignore
    const type   = parts[1];   // jail | mute | timeout | ban
    const userId = parts.slice(2).join('_'); // userId قد يحتوي على _

    if (action === 'ignore') {
        const updatedEmbed = EmbedBuilder.from(interaction.message.embeds[0])
            .setColor('#808080')
            .setFooter({ text: `✅ تم التجاهل بواسطة ${interaction.user.username} — ${new Date().toLocaleString('ar-IQ')}` });
        return interaction.update({ embeds: [updatedEmbed], components: [] });
    }

    if (action === 'remove') {
        const member = await interaction.guild.members.fetch(userId).catch(() => null);
        let successMsg = '';

        try {
            if (type === 'jail') {
                const guildData = db.getGuildData(interaction.guild.id);
                const jailRole  = guildData.jailRole
                    ? interaction.guild.roles.cache.get(guildData.jailRole)
                    : interaction.guild.roles.cache.find(r => r.name.includes('سجين') || r.name.includes('jail'));

                if (member && jailRole && member.roles.cache.has(jailRole.id)) {
                    await member.roles.remove(jailRole);
                    db.updateUserData(userId, { jailTime: null });
                    successMsg = '🔓 تم فك السجن';
                } else {
                    successMsg = '⚠️ العضو مو موجود أو مو مسجون';
                }
            }

            else if (type === 'mute' || type === 'timeout') {
                if (member) {
                    await member.timeout(null);
                    db.updateUserData(userId, { muteTime: null });
                    successMsg = '🔊 تم فك الكتم';
                } else {
                    successMsg = '⚠️ العضو مو موجود';
                }
            }

            else if (type === 'ban') {
                await interaction.guild.bans.remove(userId).catch(() => {});
                successMsg = '🔓 تم فك الحظر';
            }

        } catch (err) {
            successMsg = `❌ حصل خطأ: ${err.message}`;
        }

        const updatedEmbed = EmbedBuilder.from(interaction.message.embeds[0])
            .setColor('#2ECC71')
            .setFooter({ text: `${successMsg} — بواسطة ${interaction.user.username} — ${new Date().toLocaleString('ar-IQ')}` });

        return interaction.update({ embeds: [updatedEmbed], components: [] });
    }
}

module.exports = { sendPunishmentToChannel, handlePunishmentButton };
