const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');
const db = require('./database');

async function sendPunishmentToChannel(guild, punishmentData) {
    const guildData = db.getGuildData(guild.id);
    if (!guildData.punishmentsChannel) return;

    const punishmentChannel = guild.channels.cache.get(guildData.punishmentsChannel);
    if (!punishmentChannel) return;

    const embed = new EmbedBuilder()
        .setColor(punishmentData.color)
        .setTitle(punishmentData.title)
        .setDescription(`**العضو:** <@${punishmentData.userId}>`)
        .addFields(
            { name: 'السبب', value: punishmentData.reason },
            { name: 'المدة', value: punishmentData.duration },
            { name: 'المسؤول', value: punishmentData.moderator },
            { name: 'التاريخ', value: `<t:${Math.floor(Date.now() / 1000)}:F>` }
        )
        .setFooter({ text: `ID: ${punishmentData.userId}` })
        .setTimestamp();

    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId(`remove_${punishmentData.type}_${punishmentData.userId}`)
                .setLabel('إزالة العقوبة')
                .setStyle(ButtonStyle.Success)
                .setEmoji('✅')
        );

    await punishmentChannel.send({ embeds: [embed], components: [row] });
}

async function handlePunishmentButton(interaction) {
    if (!interaction.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
        return interaction.reply({ content: '❌ ليس لديك صلاحية!', ephemeral: true });
    }

    const parts = interaction.customId.split('_');
    const action = parts[0];
    const type = parts[1];
    const userId = parts[2];

    if (action === 'remove') {
        const member = await interaction.guild.members.fetch(userId).catch(() => null);

        if (type === 'jail') {
            const guildData = db.getGuildData(interaction.guild.id);
            const jailRole = interaction.guild.roles.cache.get(guildData.jailRole);

            if (member && jailRole) {
                await member.roles.remove(jailRole);
                db.updateUserData(userId, { jailTime: null });
            }
        } else if (type === 'mute') {
            if (member) {
                await member.timeout(null);
                db.updateUserData(userId, { muteTime: null });
            }
        }

        await interaction.update({
            components: [],
            embeds: [
                EmbedBuilder.from(interaction.message.embeds[0])
                    .setColor('#808080')
                    .setFooter({ text: `تمت الإزالة بواسطة ${interaction.user.tag}` })
            ]
        });
    }
}

module.exports = {
    sendPunishmentToChannel,
    handlePunishmentButton
};
