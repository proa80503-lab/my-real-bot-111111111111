'use strict';

const { EmbedBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const db = require('../../utils/database');
const config = require('../../config');
const colorRoles = require('./color-roles');

module.exports = {
    name: 'setup',
    aliases: ['تفعيل', 'اعداد'],
    description: 'إعداد وإنشاء الرتب الأساسية (الألوان، السجن، الكتم)',
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
        const results = { success: [], skipped: [], failed: [] };

        const loadingEmbed = new EmbedBuilder()
            .setColor('#FFA500')
            .setTitle('⚙️ جاري إنشاء الرتب الأساسية...')
            .setDescription('```\n⏳ الرجاء الانتظار...\n```')
            .setTimestamp();
        const msg = await message.reply({ embeds: [loadingEmbed] });

        // 1. رتبة السجن
        try {
            let jailRole = guild.roles.cache.find(r => r.name === config.jailRoleName || r.name.includes('سجين'));
            if (!jailRole) {
                jailRole = await guild.roles.create({
                    name: config.jailRoleName || '🔒┃سجين',
                    color: '#000000',
                    permissions: [],
                    reason: 'إعداد الرتب التلقائي'
                });
                
                // منع الرتبة من الكتابة والرؤية
                for (const channel of guild.channels.cache.values()) {
                    if (channel.isTextBased() || channel.isVoiceBased()) {
                        if (channel.name.includes('سجن') || channel.name.includes('jail')) continue;
                        await channel.permissionOverwrites.edit(jailRole.id, {
                            SendMessages: false,
                            Speak: false,
                            ViewChannel: false
                        }).catch(() => {});
                    }
                }
                results.success.push(`✅ رتبة السجن (**${jailRole.name}**)`);
            } else {
                results.skipped.push(`🔄 رتبة السجن موجودة مسبقاً`);
                // تحديث الصلاحيات للرتبة الموجودة
                for (const channel of guild.channels.cache.values()) {
                    if (channel.isTextBased() || channel.isVoiceBased()) {
                        if (channel.name.includes('سجن') || channel.name.includes('jail')) continue;
                        await channel.permissionOverwrites.edit(jailRole.id, {
                            SendMessages: false,
                            Speak: false,
                            ViewChannel: false
                        }).catch(() => {});
                    }
                }
            }
            db.updateGuildData(guild.id, { jailRole: jailRole.id });

            // إعطاء السجين صلاحية الرؤية لروم السجن
            let jailChannel = guild.channels.cache.find(c => c.name.includes('سجن') || c.name.includes('jail'));
            if (!jailChannel) {
                jailChannel = await guild.channels.create({
                    name: '🔒┃السجن',
                    type: ChannelType.GuildText,
                    permissionOverwrites: [
                        { id: guild.roles.everyone.id, deny: ['ViewChannel'] },
                        { id: jailRole.id, allow: ['ViewChannel', 'ReadMessageHistory'], deny: ['SendMessages'] }
                    ]
                });
                results.success.push(`✅ تم إنشاء قناة **${jailChannel.name}**`);
            } else {
                await jailChannel.permissionOverwrites.edit(jailRole.id, {
                    ViewChannel: true,
                    ReadMessageHistory: true,
                    SendMessages: false
                }).catch(() => {});
            }

        } catch (e) {
            results.failed.push(`❌ رتبة السجن: ${e.message}`);
        }

        // 2. رتبة الكتم
        try {
            let muteRole = guild.roles.cache.find(r => r.name === config.muteRoleName || r.name === '🔇┃مكتوم');
            if (!muteRole) {
                muteRole = await guild.roles.create({
                    name: config.muteRoleName || '🔇┃مكتوم',
                    color: '#808080',
                    permissions: [],
                    reason: 'إعداد الرتب التلقائي'
                });
                
                for (const channel of guild.channels.cache.values()) {
                    if (channel.isTextBased() || channel.isVoiceBased()) {
                        await channel.permissionOverwrites.edit(muteRole.id, {
                            SendMessages: false
                        }).catch(() => {});
                    }
                }
                results.success.push(`✅ رتبة الكتم (**${muteRole.name}**)`);
            } else {
                results.skipped.push(`🔄 رتبة الكتم موجودة مسبقاً`);
            }
            db.updateGuildData(guild.id, { muteRole: muteRole.id });
        } catch (e) {
            results.failed.push(`❌ رتبة الكتم: ${e.message}`);
        }

        // 3. رتب الألوان
        try {
            await msg.edit({ embeds: [new EmbedBuilder().setColor('#FFA500').setTitle('🎨 جاري إنشاء رتب الألوان (20 لون)...')] });
            const createdColorsCount = await colorRoles.createGuildColorRoles(guild);
            if (createdColorsCount > 0) {
                results.success.push(`✅ تم إنشاء **${createdColorsCount}** رتب ألوان جديدة`);
            } else {
                results.skipped.push(`🔄 جميع رتب الألوان موجودة مسبقاً`);
            }
        } catch (e) {
            results.failed.push(`❌ رتب الألوان: ${e.message}`);
        }

        // النتيجة النهائية
        const totalDone = results.success.length;
        const totalFailed = results.failed.length;
        let color = '#00C853';
        if (totalFailed > 0 && totalDone === 0) color = '#FF1744';
        else if (totalFailed > 0) color = '#FFA500';

        const finalEmbed = new EmbedBuilder()
            .setColor(color)
            .setTitle('📊 تقرير إعداد الرتب')
            .setDescription('تم الانتهاء من فحص وتجهيز الرتب والقنوات المطلوبة!')
            .setTimestamp();

        if (results.success.length > 0) finalEmbed.addFields({ name: '✅ تم إنشاؤها', value: results.success.join('\n') });
        if (results.skipped.length > 0) finalEmbed.addFields({ name: '🔄 موجودة مسبقاً', value: results.skipped.join('\n') });
        if (results.failed.length > 0) finalEmbed.addFields({ name: '❌ فشل إنشاؤها', value: results.failed.join('\n') });

        await msg.edit({ embeds: [finalEmbed] });
    }
};
