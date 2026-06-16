'use strict';

const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
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
            let jailRole = guild.roles.cache.find(r => r.name === config.jailRoleName);
            if (!jailRole) {
                jailRole = await guild.roles.create({
                    name: config.jailRoleName || '🔒┃سجين',
                    color: '#000000',
                    permissions: [],
                    reason: 'إعداد الرتب التلقائي'
                });
                
                // منع الرتبة من الكتابة
                for (const channel of guild.channels.cache.values()) {
                    if (channel.isTextBased() || channel.isVoiceBased()) {
                        await channel.permissionOverwrites.create(jailRole, {
                            [PermissionFlagsBits.SendMessages]: false,
                            [PermissionFlagsBits.Speak]: false
                        }).catch(() => {});
                    }
                }
                results.success.push(`✅ رتبة السجن (**${jailRole.name}**)`);
            } else {
                results.skipped.push(`🔄 رتبة السجن موجودة مسبقاً`);
            }
            db.updateGuildData(guild.id, { jailRole: jailRole.id });
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
                        await channel.permissionOverwrites.create(muteRole, {
                            [PermissionFlagsBits.SendMessages]: false
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
            .setDescription('تم الانتهاء من فحص وتجهيز الرتب المطلوبة!')
            .setTimestamp();

        if (results.success.length > 0) finalEmbed.addFields({ name: '✅ تم إنشاؤها', value: results.success.join('\n') });
        if (results.skipped.length > 0) finalEmbed.addFields({ name: '🔄 موجودة مسبقاً', value: results.skipped.join('\n') });
        if (results.failed.length > 0) finalEmbed.addFields({ name: '❌ فشل إنشاؤها', value: results.failed.join('\n') });

        await msg.edit({ embeds: [finalEmbed] });
    }
};
