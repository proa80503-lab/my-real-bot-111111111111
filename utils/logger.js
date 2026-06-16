const { EmbedBuilder, AuditLogEvent } = require('discord.js');
const db = require('./database');
const config = require('../config');

// دالة لإرسال لوج إلى روم السجلات
async function sendLog(guild, embed) {
    const guildData = db.getGuildData(guild.id);
    if (!guildData.logChannel) return;

    const logChannel = guild.channels.cache.get(guildData.logChannel);
    if (!logChannel) return;

    try {
        await logChannel.send({ embeds: [embed] });
    } catch (error) {
        // تجاهل أخطاء الصلاحيات بشكل صامت (السيرفر قد لا يكون مُعد بعد)
        if (error.code !== 50001) {
            console.error('خطأ غير متوقع في السجلات:', error.message);
        }
    }
}

// دالة مساعدة للحصول على المنفذ من audit log
async function getExecutor(guild, type, targetId = null) {
    try {
        // ننتظر قليلاً لأن Audit Log قد يتأخر
        await new Promise(r => setTimeout(r, 1500));

        const auditLogs = await guild.fetchAuditLogs({
            type: type,
            limit: 10
        });

        const log = auditLogs.entries.find(entry => {
            const isRecent = (Date.now() - entry.createdTimestamp) < 15000; // خلال 15 ثانية
            const targetMatches = targetId ? (entry.target?.id === targetId || entry.targetId === targetId) : true;
            return isRecent && targetMatches;
        });

        if (!log) return null;

        return log.executor;
    } catch (error) {
        // console.error('Error fetching audit logs:', error);
        return null;
    }
}

// === سجلات الصوت ===

// تحديث حالة الصوت (انضمام، مغادرة، انتقال)
async function logVoiceState(oldState, newState) {
    const member = newState.member || oldState.member; // العضو
    if (!member) return;

    const guild = member.guild;
    let embed = new EmbedBuilder().setTimestamp().setFooter({ text: `ID: ${member.id}` });
    let action = '';

    // حالة الانضمام
    if (!oldState.channelId && newState.channelId) {
        action = 'join';
        embed.setColor('#00FF00')
            .setTitle('🔊 انضمام لقناة صوتية')
            .setDescription(`${member} انضم إلى القناة الصوتية`)
            .addFields({ name: 'القناة', value: `${newState.channel}`, inline: true });
    }
    // حالة المغادرة (Disconnect)
    else if (oldState.channelId && !newState.channelId) {
        action = 'leave';
        // محاولة معرفة إذا كان طرداً
        const executor = await getExecutor(guild, AuditLogEvent.MemberDisconnect, member.id);

        embed.setColor('#FF0000')
            .setTitle('🔇 مغادرة قناة صوتية')
            .setDescription(`${member} غادر القناة الصوتية`)
            .addFields(
                { name: 'القناة', value: `${oldState.channel}`, inline: true },
                { name: 'بواسطة', value: executor ? `${executor} (طرد)` : 'بنفسه', inline: true }
            );
    }
    // حالة الانتقال (Move)
    else if (oldState.channelId && newState.channelId && oldState.channelId !== newState.channelId) {
        action = 'move';
        // محاولة معرفة إذا وتم نقله
        const executor = await getExecutor(guild, AuditLogEvent.MemberMove, member.id);

        embed.setColor('#FFA500')
            .setTitle('↔️ انتقال صوتي')
            .setDescription(`${member} انتقل بين القنوات الصوتية`)
            .addFields(
                { name: 'من', value: `${oldState.channel}`, inline: true },
                { name: 'إلى', value: `${newState.channel}`, inline: true },
                { name: 'بواسطة', value: executor ? `${executor} (سحب)` : 'بنفسه', inline: true }
            );
    }
    // حالات أخرى (Mute/Deafen) يمكن إضافتها هنا إذا لزم الأمر

    if (action) {
        await sendLog(guild, embed);
    }
}

// === سجلات الرسائل ===

// رسالة محذوفة
async function logMessageDelete(message) {
    if (!message.author) return;
    if (!message.guild) return;

    // في حالة حذف الرسالة، الـ target في الـ Audit Log هو صاحب الرسالة
    const executor = await getExecutor(message.guild, AuditLogEvent.MessageDelete, message.author.id);

    const safeContent = message.content
        ? (message.content.length > 1024 ? message.content.substring(0, 1020) + '...' : message.content)
        : '*بدون محتوى نصي*';

    const embed = new EmbedBuilder()
        .setColor('#FF0000')
        .setTitle('🗑️ رسالة محذوفة')
        .setDescription(`**القناة:** ${message.channel}\n**المؤلف:** ${message.author}`)
        .addFields(
            { name: 'المحتوى', value: safeContent },
            // إذا لم نجد executor (بسبب الوقت أو عدم التطابق)، فغالباً المستخدم حذفها بنفسه
            { name: 'المحذوف بواسطة', value: executor ? `${executor}` : `${message.author} (بنفسه)` }
        )
        .setTimestamp()
        .setFooter({ text: `ID: ${message.id}` });

    if (message.attachments.size > 0) {
        embed.addFields({ name: 'المرفقات', value: `${message.attachments.size} ملف(ات)` });
    }

    await sendLog(message.guild, embed);
}

// رسالة معدلة
async function logMessageUpdate(oldMessage, newMessage) {
    if (!newMessage.guild) return;
    if (oldMessage.content === newMessage.content) return;

    const safeOldContent = oldMessage.content
        ? (oldMessage.content.length > 1024 ? oldMessage.content.substring(0, 1020) + '...' : oldMessage.content)
        : '*بدون محتوى*';

    const safeNewContent = newMessage.content
        ? (newMessage.content.length > 1024 ? newMessage.content.substring(0, 1020) + '...' : newMessage.content)
        : '*بدون محتوى*';

    const embed = new EmbedBuilder()
        .setColor('#FFA500')
        .setTitle('✏️ رسالة معدلة')
        .setDescription(`**القناة:** ${newMessage.channel}\n**المؤلف:** ${newMessage.author}`)
        .addFields(
            { name: 'قبل', value: safeOldContent },
            { name: 'بعد', value: safeNewContent }
        )
        .setTimestamp()
        .setFooter({ text: `ID: ${newMessage.id}` });

    await sendLog(newMessage.guild, embed);
}

// === سجلات الأعضاء ===

// عضو انضم
async function logMemberJoin(member) {
    const embed = new EmbedBuilder()
        .setColor('#00FF00')
        .setTitle('👋 عضو جديد')
        .setDescription(`${member} انضم إلى السيرفر`)
        .addFields(
            { name: 'الاسم', value: member.user.tag, inline: true },
            { name: 'تاريخ الإنشاء', value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`, inline: true },
            { name: 'عدد الأعضاء', value: `${member.guild.memberCount}`, inline: true }
        )
        .setThumbnail(member.user.displayAvatarURL())
        .setTimestamp()
        .setFooter({ text: `ID: ${member.id}` });

    await sendLog(member.guild, embed);
}

// عضو غادر
async function logMemberLeave(member) {
    const embed = new EmbedBuilder()
        .setColor('#FF0000')
        .setTitle('🚪 عضو غادر')
        .setDescription(`${member.user.tag} غادر السيرفر`)
        .addFields(
            { name: 'الاسم', value: member.user.tag, inline: true },
            { name: 'تاريخ الانضمام', value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>`, inline: true },
            { name: 'عدد الأعضاء', value: `${member.guild.memberCount}`, inline: true }
        )
        .setThumbnail(member.user.displayAvatarURL())
        .setTimestamp()
        .setFooter({ text: `ID: ${member.id}` });

    await sendLog(member.guild, embed);
}

// تحديث عضو (رولات، اسم، إلخ)
async function logMemberUpdate(oldMember, newMember) {
    const changes = [];

    // تغيير الاسم
    if (oldMember.nickname !== newMember.nickname) {
        changes.push(`**الاسم المستعار:** \`${oldMember.nickname || 'لا يوجد'}\` → \`${newMember.nickname || 'لا يوجد'}\``);
    }

    // تغيير الرولات
    const oldRoles = oldMember.roles.cache.filter(r => r.id !== oldMember.guild.id);
    const newRoles = newMember.roles.cache.filter(r => r.id !== newMember.guild.id);

    const addedRoles = newRoles.filter(r => !oldRoles.has(r.id));
    const removedRoles = oldRoles.filter(r => !newRoles.has(r.id));

    if (addedRoles.size > 0) {
        changes.push(`**رولات مضافة:** ${addedRoles.map(r => r).join(', ')}`);
    }
    if (removedRoles.size > 0) {
        changes.push(`**رولات محذوفة:** ${removedRoles.map(r => r).join(', ')}`);
    }

    if (changes.length === 0) return;

    const embed = new EmbedBuilder()
        .setColor('#0099FF')
        .setTitle('👤 تحديث عضو')
        .setDescription(`**العضو:** ${newMember}`)
        .addFields({ name: 'التغييرات', value: changes.join('\n') })
        .setThumbnail(newMember.user.displayAvatarURL())
        .setTimestamp()
        .setFooter({ text: `ID: ${newMember.id}` });

    await sendLog(newMember.guild, embed);
}

// === سجلات القنوات ===

// قناة تم إنشاؤها
async function logChannelCreate(channel) {
    if (!channel.guild) return;

    const executor = await getExecutor(channel.guild, AuditLogEvent.ChannelCreate);

    const embed = new EmbedBuilder()
        .setColor('#00FF00')
        .setTitle('📁 قناة جديدة')
        .setDescription(`**القناة:** ${channel}`)
        .addFields(
            { name: 'الاسم', value: channel.name, inline: true },
            { name: 'النوع', value: channel.type === 0 ? 'نصية' : 'صوتية', inline: true },
            { name: 'المنشئ', value: executor ? `${executor}` : 'غير معروف', inline: true }
        )
        .setTimestamp()
        .setFooter({ text: `ID: ${channel.id}` });

    await sendLog(channel.guild, embed);
}

// قناة تم حذفها
async function logChannelDelete(channel) {
    if (!channel.guild) return;

    const executor = await getExecutor(channel.guild, AuditLogEvent.ChannelDelete);

    const embed = new EmbedBuilder()
        .setColor('#FF0000')
        .setTitle('🗑️ قناة محذوفة')
        .setDescription(`**الاسم:** ${channel.name}`)
        .addFields(
            { name: 'النوع', value: channel.type === 0 ? 'نصية' : 'صوتية', inline: true },
            { name: 'المحذوف بواسطة', value: executor ? `${executor}` : 'غير معروف', inline: true }
        )
        .setTimestamp()
        .setFooter({ text: `ID: ${channel.id}` });

    await sendLog(channel.guild, embed);
}

// === سجلات الرولات ===

// رول تم إنشاؤه
async function logRoleCreate(role) {
    const executor = await getExecutor(role.guild, AuditLogEvent.RoleCreate);

    const embed = new EmbedBuilder()
        .setColor('#00FF00')
        .setTitle('🎭 رول جديد')
        .setDescription(`**الرول:** ${role}`)
        .addFields(
            { name: 'الاسم', value: role.name, inline: true },
            { name: 'اللون', value: role.hexColor, inline: true },
            { name: 'المنشئ', value: executor ? `${executor}` : 'غير معروف', inline: true }
        )
        .setTimestamp()
        .setFooter({ text: `ID: ${role.id}` });

    await sendLog(role.guild, embed);
}

// رول تم حذفه
async function logRoleDelete(role) {
    const executor = await getExecutor(role.guild, AuditLogEvent.RoleDelete);

    const embed = new EmbedBuilder()
        .setColor('#FF0000')
        .setTitle('🗑️ رول محذوف')
        .setDescription(`**الاسم:** ${role.name}`)
        .addFields(
            { name: 'اللون', value: role.hexColor, inline: true },
            { name: 'المحذوف بواسطة', value: executor ? `${executor}` : 'غير معروف', inline: true }
        )
        .setTimestamp()
        .setFooter({ text: `ID: ${role.id}` });

    await sendLog(role.guild, embed);
}

// === سجلات الباند والكيك ===

// باند
async function logBan(ban) {
    const executor = await getExecutor(ban.guild, AuditLogEvent.MemberBanAdd);

    const embed = new EmbedBuilder()
        .setColor('#8B0000')
        .setTitle('🔨 عضو محظور')
        .setDescription(`**العضو:** ${ban.user.tag}`)
        .addFields(
            { name: 'السبب', value: ban.reason || 'لا يوجد سبب' },
            { name: 'المحظور بواسطة', value: executor ? `${executor}` : 'غير معروف' }
        )
        .setThumbnail(ban.user.displayAvatarURL())
        .setTimestamp()
        .setFooter({ text: `ID: ${ban.user.id}` });

    await sendLog(ban.guild, embed);
}

// إلغاء باند
async function logUnban(ban) {
    const executor = await getExecutor(ban.guild, AuditLogEvent.MemberBanRemove);

    const embed = new EmbedBuilder()
        .setColor('#00FF00')
        .setTitle('🔓 إلغاء حظر')
        .setDescription(`**العضو:** ${ban.user.tag}`)
        .addFields(
            { name: 'تم الإلغاء بواسطة', value: executor ? `${executor}` : 'غير معروف' }
        )
        .setThumbnail(ban.user.displayAvatarURL())
        .setTimestamp()
        .setFooter({ text: `ID: ${ban.user.id}` });

    await sendLog(ban.guild, embed);
}

// === سجلات الطرد والتايم أوت ===

// طرد عضو (Kick)
async function logKick(member, executor) {
    const embed = new EmbedBuilder()
        .setColor('#FF4500')
        .setTitle('👢 طرد عضو')
        .setDescription(`**العضو:** ${member.user.tag} مُغادر بسبب الطرد`)
        .addFields(
            { name: 'الاسم', value: member.user.tag, inline: true },
            { name: 'المطرود بواسطة', value: executor ? `${executor}` : 'غير معروف', inline: true }
        )
        .setThumbnail(member.user.displayAvatarURL())
        .setTimestamp()
        .setFooter({ text: `ID: ${member.id}` });

    await sendLog(member.guild, embed);
}

// تطبيق Timeout على عضو
async function logTimeout(oldMember, newMember) {
    const wasTimedOut = oldMember.communicationDisabledUntil;
    const isTimedOut = newMember.communicationDisabledUntil;

    // Timeout مُضاف
    if (!wasTimedOut && isTimedOut) {
        const executor = await getExecutor(newMember.guild, AuditLogEvent.MemberUpdate, newMember.id);
        const until = Math.floor(new Date(isTimedOut).getTime() / 1000);
        const embed = new EmbedBuilder()
            .setColor('#FFA500')
            .setTitle('🔇 كتم صوت (Timeout)')
            .setDescription(`**العضو:** ${newMember}`)
            .addFields(
                { name: 'حتى', value: `<t:${until}:R>`, inline: true },
                { name: 'بواسطة', value: executor ? `${executor}` : 'غير معروف', inline: true }
            )
            .setThumbnail(newMember.user.displayAvatarURL())
            .setTimestamp()
            .setFooter({ text: `ID: ${newMember.id}` });

        await sendLog(newMember.guild, embed);
    }
    // Timeout مُرفع
    else if (wasTimedOut && !isTimedOut) {
        const executor = await getExecutor(newMember.guild, AuditLogEvent.MemberUpdate, newMember.id);
        const embed = new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle('🔊 رُفع كتم الصوت (Timeout)')
            .setDescription(`**العضو:** ${newMember}`)
            .addFields(
                { name: 'رُفع بواسطة', value: executor ? `${executor}` : 'غير معروف', inline: true }
            )
            .setThumbnail(newMember.user.displayAvatarURL())
            .setTimestamp()
            .setFooter({ text: `ID: ${newMember.id}` });

        await sendLog(newMember.guild, embed);
    }
}

// تعديل قناة
async function logChannelUpdate(oldChannel, newChannel) {
    if (!newChannel.guild) return;
    const changes = [];

    if (oldChannel.name !== newChannel.name) {
        changes.push(`**الاسم:** \`${oldChannel.name}\` → \`${newChannel.name}\``);
    }
    if (oldChannel.topic !== newChannel.topic) {
        const oldTopic = oldChannel.topic || '*لا يوجد*';
        const newTopic = newChannel.topic || '*لا يوجد*';
        changes.push(`**الوصف:** \`${oldTopic.substring(0, 50)}\` → \`${newTopic.substring(0, 50)}\``);
    }
    if (oldChannel.rateLimitPerUser !== newChannel.rateLimitPerUser) {
        changes.push(`**Slow Mode:** ${oldChannel.rateLimitPerUser}ث → ${newChannel.rateLimitPerUser}ث`);
    }

    if (changes.length === 0) return;

    const executor = await getExecutor(newChannel.guild, AuditLogEvent.ChannelUpdate);
    const embed = new EmbedBuilder()
        .setColor('#3498DB')
        .setTitle('📝 تعديل قناة')
        .setDescription(`**القناة:** ${newChannel}`)
        .addFields(
            { name: 'التغييرات', value: changes.join('\n') },
            { name: 'بواسطة', value: executor ? `${executor}` : 'غير معروف', inline: true }
        )
        .setTimestamp()
        .setFooter({ text: `ID: ${newChannel.id}` });

    await sendLog(newChannel.guild, embed);
}

// تعديل رول
async function logRoleUpdate(oldRole, newRole) {
    const changes = [];

    if (oldRole.name !== newRole.name) {
        changes.push(`**الاسم:** \`${oldRole.name}\` → \`${newRole.name}\``);
    }
    if (oldRole.hexColor !== newRole.hexColor) {
        changes.push(`**اللون:** \`${oldRole.hexColor}\` → \`${newRole.hexColor}\``);
    }
    if (oldRole.hoist !== newRole.hoist) {
        changes.push(`**الظهور المنفصل:** ${oldRole.hoist ? 'نعم' : 'لا'} → ${newRole.hoist ? 'نعم' : 'لا'}`);
    }
    if (oldRole.mentionable !== newRole.mentionable) {
        changes.push(`**قابل للمنشن:** ${oldRole.mentionable ? 'نعم' : 'لا'} → ${newRole.mentionable ? 'نعم' : 'لا'}`);
    }

    if (changes.length === 0) return;

    const executor = await getExecutor(newRole.guild, AuditLogEvent.RoleUpdate);
    const embed = new EmbedBuilder()
        .setColor('#9B59B6')
        .setTitle('🎭 تعديل رول')
        .setDescription(`**الرول:** ${newRole}`)
        .addFields(
            { name: 'التغييرات', value: changes.join('\n') },
            { name: 'بواسطة', value: executor ? `${executor}` : 'غير معروف', inline: true }
        )
        .setTimestamp()
        .setFooter({ text: `ID: ${newRole.id}` });

    await sendLog(newRole.guild, embed);
}

module.exports = {
    sendLog,
    logMessageDelete,
    logMessageUpdate,
    logMemberJoin,
    logMemberLeave,
    logMemberUpdate,
    logChannelCreate,
    logChannelDelete,
    logRoleCreate,
    logRoleDelete,
    logBan,
    logUnban,
    logVoiceState,
    // === الجديد ===
    logKick,
    logTimeout,
    logChannelUpdate,
    logRoleUpdate
};
