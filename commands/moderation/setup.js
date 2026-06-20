const {
    EmbedBuilder,
    PermissionFlagsBits,
    ChannelType
} = require('discord.js');
const db = require('../../utils/database');
const config = require('../../config');

module.exports = {
    name: 'setup',
    aliases: ['تفعيل', 'اعداد', 'إعداد'],
    description: 'إعداد السيرفر وإنشاء القنوات والرتب تلقائياً',
    usage: 'تفعيل',
    permissions: [PermissionFlagsBits.Administrator],

    async execute(message) {
        // فقط الأدمن أو مالك البوت
        const isOwner = message.author.id === config.ownerId;
        const isAdmin = message.member?.permissions?.has(PermissionFlagsBits.Administrator);
        if (!isOwner && !isAdmin) {
            return message.reply('❌ هذا الأمر يتطلب صلاحية **الأدمن**!');
        }

        const guild = message.guild;
        const results = { success: [], failed: [], skipped: [] };

        // رسالة جاري الإعداد
        const loadingEmbed = new EmbedBuilder()
            .setColor('#FFA500')
            .setTitle('⚙️ جاري إعداد السيرفر...')
            .setDescription('```\n⏳ الرجاء الانتظار...\n```')
            .setTimestamp();
        const msg = await message.reply({ embeds: [loadingEmbed] });

        // ─── إنشاء الرتب ────────────────────────────────────────
        const rolesToCreate = [
            { key: 'jailRole', name: config.jailRoleName || '🔒┃سجين', color: '#000000', perms: [], deny: ['SendMessages', 'Speak', 'ViewChannel'] },
            { key: 'muteRole', name: config.muteRoleName || '🔇┃مكتوم', color: '#808080', perms: [], deny: ['SendMessages'] },
        ];

        for (const roleDef of rolesToCreate) {
            try {
                const existing = guild.roles.cache.find(r => r.name === roleDef.name);
                let role = existing;
                if (existing) {
                    results.skipped.push(`🔄 رتبة **${roleDef.name}** موجودة مسبقاً (تم تحديث صلاحياتها)`);
                    if (!db.getGuildData(guild.id)[roleDef.key]) {
                        db.updateGuildData(guild.id, { [roleDef.key]: existing.id });
                    }
                } else {
                    role = await guild.roles.create({
                        name: roleDef.name,
                        color: roleDef.color,
                        reason: 'إعداد تلقائي بواسطة البوت'
                    });
                    db.updateGuildData(guild.id, { [roleDef.key]: role.id });
                    results.success.push(`✅ تم إنشاء رتبة **${roleDef.name}**`);
                }

                // منع الكتابة/الرؤية في كل القنوات لهذه الرتبة
                for (const channel of guild.channels.cache.values()) {
                    if (channel.isTextBased() || channel.isVoiceBased()) {
                        if (roleDef.key === 'jailRole' && (channel.name.includes('سجن') || channel.name.includes('jail'))) continue;
                        await channel.permissionOverwrites.edit(role.id, Object.fromEntries(roleDef.deny.map(p => [p, false]))).catch(() => { });
                    }
                }
            } catch (e) {
                results.failed.push(`❌ فشل إنشاء/تعديل رتبة **${roleDef.name}**: ${e.message}`);
            }
        }

        // ─── إنشاء القنوات ───────────────────────────────────────
        const channelsToCreate = [
            {
                key: 'jailChannel',
                name: '🔒┃السجن',
                type: ChannelType.GuildText,
                perms: [
                    { id: guild.roles.everyone.id, deny: ['ViewChannel'] }
                ]
            },
            {
                key: 'logChannel',
                name: config.logChannelName || '📝┃السجلات',
                type: ChannelType.GuildText,
                perms: [
                    { id: guild.roles.everyone.id, deny: ['SendMessages'] } // changed to string
                ]
            },
            {
                key: 'punishmentsChannel',
                name: config.punishmentsChannelName || '⚖️┃العقوبات',
                type: ChannelType.GuildText,
                perms: [
                    { id: guild.roles.everyone.id, deny: ['SendMessages'] } // changed to string
                ]
            },
            {
                key: 'bankChannel',
                name: config.bankChannelName || '💰┃البنك',
                type: ChannelType.GuildText,
                perms: []
            },
            {
                key: 'gamesChannel',
                name: config.gamesChannelName || '🎮┃الألعاب',
                type: ChannelType.GuildText,
                perms: []
            },
            {
                key: 'companiesChannelId',
                name: '🏢・الشركات',
                type: ChannelType.GuildText,
                perms: [
                    { id: guild.roles.everyone.id, deny: ['SendMessages', 'AddReactions'] },
                    { id: guild.members.me.id, allow: ['SendMessages', 'ManageMessages'] }
                ]
            }
        ];

        for (const chDef of channelsToCreate) {
            try {
                const currentData = db.getGuildData(guild.id);
                const currentId = currentData[chDef.key];
                const existing = currentId ? guild.channels.cache.get(currentId) : guild.channels.cache.find(c => c.name === chDef.name);

                if (existing) {
                    results.skipped.push(`🔄 قناة **${chDef.name}** موجودة مسبقاً`);
                    if (!currentId) db.updateGuildData(guild.id, { [chDef.key]: existing.id });
                    continue;
                }

                const permOverwrites = chDef.perms.map(p => ({
                    id: p.id,
                    deny: p.deny || [],
                    allow: p.allow || []
                }));

                const ch = await guild.channels.create({
                    name: chDef.name,
                    type: chDef.type,
                    permissionOverwrites: permOverwrites,
                    reason: 'إعداد تلقائي بواسطة البوت'
                });

                db.updateGuildData(guild.id, { [chDef.key]: ch.id });
                results.success.push(`✅ تم إنشاء قناة **${chDef.name}**`);
            } catch (e) {
                results.failed.push(`❌ فشل إنشاء قناة **${chDef.name}**: ${e.message}`);
            }
        }

        // إعطاء السجين صلاحية الرؤية لروم السجن
        try {
            const guildData = db.getGuildData(guild.id);
            if (guildData.jailRole) {
                let jailChannel = guild.channels.cache.find(c => c.name.includes('سجن') || c.name.includes('jail'));
                if (jailChannel) {
                    await jailChannel.permissionOverwrites.edit(guildData.jailRole, {
                        ViewChannel: true,
                        ReadMessageHistory: true,
                        SendMessages: false
                    }).catch(() => {});
                }
            }
        } catch (e) {}

        // ─── وضع علامة اكتمال الإعداد ────────────────────────────
        db.updateGuildData(guild.id, { setupComplete: true });

        // ─── إنشاء Embed النتيجة ─────────────────────────────────
        const totalDone = results.success.length;
        const totalSkipped = results.skipped.length;
        const totalFailed = results.failed.length;

        let color = '#00C853';
        if (totalFailed > 0 && totalDone === 0) color = '#FF1744';
        else if (totalFailed > 0) color = '#FFA500';

        const finalEmbed = new EmbedBuilder()
            .setColor(color)
            .setTitle('📊 تقرير الإعداد التلقائي')
            .setDescription(`**السيرفر**: ${guild.name}`)
            .setThumbnail(guild.iconURL())
            .setTimestamp()
            .setFooter({ text: `${totalDone} تم • ${totalSkipped} موجود • ${totalFailed} فشل` });

        if (results.success.length > 0) {
            finalEmbed.addFields({
                name: `✅ تم إنشاؤها (${results.success.length})`,
                value: results.success.join('\n'),
                inline: false
            });
        }

        if (results.skipped.length > 0) {
            finalEmbed.addFields({
                name: `🔄 موجودة مسبقاً (${results.skipped.length})`,
                value: results.skipped.join('\n'),
                inline: false
            });
        }

        if (results.failed.length > 0) {
            finalEmbed.addFields({
                name: `❌ فشل إنشاؤها (${results.failed.length})`,
                value: results.failed.join('\n'),
                inline: false
            });
        }

        if (totalDone === 0 && totalFailed === 0) {
            finalEmbed.addFields({
                name: '💡 ملاحظة',
                value: 'جميع القنوات والرتب كانت موجودة مسبقاً. لا حاجة لإعادة الإنشاء.',
                inline: false
            });
        }

        await msg.edit({ embeds: [finalEmbed] });
    }
};
