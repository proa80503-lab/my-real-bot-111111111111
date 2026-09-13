'use strict';

/**
 * ════════════════════════════════════════════════════════
 *  color-system.js — نظام ألوان البروفايل الاحترافي
 *  ─ يُرسل Embed جميل مع Select Menu للألوان
 *  ─ يمنع التكرار عند Restart
 *  ─ يحذف الرسائل القديمة عند تغيير الروم
 * ════════════════════════════════════════════════════════
 */

const {
    EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder,
    ChannelType, PermissionsBitField,
} = require('discord.js');
const config = require('../config');
const db = require('./database');

// ─── خريطة الألوان مع مجموعات ───────────────────────────────────────────────
const COLOR_GROUPS = [
    {
        label: '🔥 ألوان النار',
        emoji: '🔥',
        colors: ['red', 'orange'],
    },
    {
        label: '🌊 ألوان الماء والسماء',
        emoji: '🌊',
        colors: ['blue', 'cyan'],
    },
    {
        label: '🌿 ألوان الطبيعة',
        emoji: '🌿',
        colors: ['green'],
    },
    {
        label: '💫 ألوان الفخامة',
        emoji: '💫',
        colors: ['gold', 'purple', 'pink'],
    },
    {
        label: '🌑 ألوان الغموض',
        emoji: '🌑',
        colors: ['black', 'white'],
    },
];

// ─── Build Main Color Embed ──────────────────────────────────────────────────
function buildColorEmbed() {
    const availColors = config.availableColors || {};
    const colorList = Object.entries(availColors)
        .map(([id, c]) => `${c.emoji} **${c.name}** — \`${c.hex}\``)
        .join('\n');

    return new EmbedBuilder()
        .setColor('#5865F2')
        .setTitle('🎨 نظام ألوان البروفايل')
        .setDescription([
            '> اختر لونك المفضل لتخصيص بروفايلك في السيرفر',
            '',
            '**الألوان المتاحة:**',
            colorList,
            '',
            '> 💡 اختر من القائمة أدناه لتغيير لونك فوراً',
        ].join('\n'))
        .addFields(
            { name: '📌 كيف تستخدم اللون', value: 'اكتب `!profile` لترى بروفايلك بلونك الجديد', inline: true },
            { name: '✅ مجاني', value: 'تغيير اللون مجاني بالكامل', inline: true },
        )
        .setFooter({ text: '🎨 نظام الألوان الاحترافي • اختر لونك الآن' })
        .setTimestamp();
}

// ─── Build Color Select Menu ─────────────────────────────────────────────────
function buildColorSelectMenu() {
    const availColors = config.availableColors || {};
    const options = Object.entries(availColors).map(([id, c]) => ({
        label: c.name,
        value: id,
        description: `لون ${c.name} — ${c.hex}`,
        emoji: c.emoji,
    }));

    // Discord limit: 25 options per menu max
    const chunks = [];
    for (let i = 0; i < options.length; i += 25) {
        chunks.push(options.slice(i, i + 25));
    }

    const rows = chunks.map((chunk, idx) => {
        const menu = new StringSelectMenuBuilder()
            .setCustomId(`color_select_${idx}`)
            .setPlaceholder(idx === 0 ? '🎨 اختر لونك...' : '🎨 المزيد من الألوان...')
            .addOptions(chunk);
        return new ActionRowBuilder().addComponents(menu);
    });

    // أضف زر إزالة اللون
    return rows;
}

// ─── Setup Color Channel ──────────────────────────────────────────────────────
/**
 * يُجهّز قناة الألوان:
 * 1. يمسح رسائل البوت القديمة إذا أمكن
 * 2. يرسل Embed + Select Menu جديد
 * 3. يحفظ message_id في DB لمنع التكرار
 * @param {Guild} guild
 * @param {TextChannel} channel
 * @param {string|null} oldChannelId القناة القديمة (لمسحها)
 */
async function setupColorChannel(guild, channel, oldChannelId = null) {
    try {
        const guildData = db.getGuildData(guild.id);

        // ─── 1. تنظيف القناة القديمة ────────────────────────────────────────
        if (oldChannelId && oldChannelId !== channel.id) {
            const oldChannel = guild.channels.cache.get(oldChannelId);
            if (oldChannel && oldChannel.type === ChannelType.GuildText) {
                const oldMsgId = guildData.colorMessageId;
                if (oldMsgId) {
                    try {
                        const oldMsg = await oldChannel.messages.fetch(oldMsgId);
                        if (oldMsg) await oldMsg.delete();
                    } catch {}
                }
            }
        }

        // ─── 2. تنظيف القناة الجديدة (رسائل البوت القديمة) ─────────────────
        const botMember = guild.members.me;
        if (botMember?.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
            try {
                const messages = await channel.messages.fetch({ limit: 50 });
                const botMessages = messages.filter(m => m.author.id === guild.client.user.id);
                if (botMessages.size > 0) {
                    await channel.bulkDelete(botMessages).catch(() => {
                        // إذا فشل bulkDelete (رسائل قديمة >14 يوم)، احذفهم فرداً
                        for (const msg of botMessages.values()) {
                            msg.delete().catch(() => {});
                        }
                    });
                }
            } catch {}
        }

        // ─── 3. إرسال النظام الجديد ─────────────────────────────────────────
        const embed = buildColorEmbed();
        const rows = buildColorSelectMenu();

        const sent = await channel.send({
            embeds: [embed],
            components: rows,
        });

        // ─── 4. حفظ Message ID ───────────────────────────────────────────────
        db.updateGuildData(guild.id, {
            colorChannelId: channel.id,
            colorMessageId: sent.id,
        });

        console.log(`[ColorSystem] ✅ Color channel setup in ${guild.name} → #${channel.name}`);
        return sent;
    } catch (err) {
        console.error(`[ColorSystem] ❌ Error in ${guild.name}:`, err.message);
        throw err;
    }
}

// ─── Check & Restore (بعد Restart — لا نُعيد الإرسال إذا الرسالة موجودة) ────
/**
 * يتحقق عند Restart هل نظام الألوان موجود أم لا
 * إذا الرسالة موجودة: لا يُعيد الإرسال
 * إذا محذوفة: يُعيد الإرسال فقط
 */
async function checkAndRestoreColorChannel(guild) {
    try {
        const guildData = db.getGuildData(guild.id);
        const { colorChannelId, colorMessageId } = guildData;
        if (!colorChannelId) return; // لا يوجد color channel محدد

        const channel = guild.channels.cache.get(colorChannelId);
        if (!channel) {
            // القناة محذوفة
            db.updateGuildData(guild.id, { colorChannelId: null, colorMessageId: null });
            return;
        }

        // تحقق هل الرسالة موجودة
        if (colorMessageId) {
            try {
                const msg = await channel.messages.fetch(colorMessageId);
                if (msg) {
                    console.log(`[ColorSystem] ✅ Color message exists in ${guild.name} — no re-send`);
                    return; // الرسالة موجودة — لا نُعيد الإرسال
                }
            } catch {
                // الرسالة محذوفة — نُعيد الإرسال
            }
        }

        // أعد الإرسال فقط إذا كانت الرسالة محذوفة
        await setupColorChannel(guild, channel, null);
    } catch (err) {
        console.error(`[ColorSystem] Restore error in ${guild.name}:`, err.message);
    }
}

// ─── Handle Color Selection ─────────────────────────────────────────────────
/**
 * يُعالج اختيار المستخدم للون من Select Menu
 * @param {StringSelectMenuInteraction} interaction
 */
async function handleColorSelect(interaction) {
    const colorId = interaction.values[0];
    const availColors = config.availableColors || {};
    const colorData = availColors[colorId];

    if (!colorData) {
        return interaction.reply({ content: '❌ اللون غير موجود', ephemeral: true });
    }

    try {
        await interaction.deferReply({ ephemeral: true });

        // حفظ اللون في قاعدة البيانات
        const db2 = require('./database');
        db2.updateUserData(interaction.user.id, { color: colorData.hex });

        const { EmbedBuilder: EB } = require('discord.js');
        await interaction.editReply({
            embeds: [
                new EB()
                    .setColor(colorData.hex)
                    .setTitle(`${colorData.emoji} تم تغيير لونك!`)
                    .setDescription([
                        `> لونك الجديد: **${colorData.name}** (${colorData.hex})`,
                        `> اكتب \`!profile\` لترى بروفايلك بلونك الجديد 🎨`,
                    ].join('\n'))
                    .setTimestamp()
            ],
        });
    } catch (err) {
        console.error('[ColorSystem] handleColorSelect error:', err.message);
        interaction.reply({ content: '❌ حدث خطأ', ephemeral: true }).catch(() => {});
    }
}

module.exports = {
    setupColorChannel,
    checkAndRestoreColorChannel,
    handleColorSelect,
    buildColorEmbed,
    buildColorSelectMenu,
};
