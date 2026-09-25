const { EmbedBuilder, AuditLogEvent } = require('discord.js');
const db = require('./database');
const config = require('../config');
const channelResolver = require('./channel-resolver');

// ─── استثناء البوت من السجلات ───────────────────────────────────────────────
// لا يجب أن يُسجَّل البوت كـ executor لمخالفة في سجلات الحماية
// هذا يمنع "البوت يرى نفسه مخالفاً" عند تنفيذ أوامر مثل حذف رسالة سبام

let _botId = null;

/**
 * تعيين معرف البوت (يُستدعى مرة واحدة عند بدء التشغيل من ready.js)
 */
function setBotId(id) {
    _botId = id;
}

/**
 * فحص ما إذا كان الـ executor هو البوت نفسه
 * @param {import('discord.js').User|null} executor
 * @returns {boolean}
 */
function _isBotAction(executor) {
    if (!executor) return false;
    if (_botId && executor.id === _botId) return true;
    if (executor.bot === true) return true;
    return false;
}

// ─── إرسال Log إلى قناة السجلات ───────────────────────────────────────────────
async function sendLog(guild, embed) {
    if (!guild) return;

    let logChannel = null;

    // 1. استخدام logChannelId المحفوظ في DB أولاً (أدق)
    try {
        const guildData = db.getGuildData(guild.id);
        const logId = guildData.logChannelId || guildData.logChannel;
        if (logId) {
            logChannel = guild.channels.cache.get(logId) || null;
        }
    } catch {}

    // 2. Fallback — channel-resolver بالاسم
    if (!logChannel) {
        logChannel = channelResolver.resolve(guild, 'logChannel');
    }

    if (!logChannel) return;

    try {
        await logChannel.send({ embeds: [embed] });
    } catch (error) {
        // 50001 = Missing Access — تجاهل بصمت
        if (error.code !== 50001 && error.code !== 50013) {
            console.error('[Logger] خطأ غير متوقع في السجلات:', error.message);
        }
    }
}

// ─── Helper: جلب المنفذ من Audit Log بدقة ────────────────────────────────────
async function getExecutor(guild, type, targetId = null, windowMs = 15000) {
    if (!guild || !guild.members.me.permissions.has('ViewAuditLog')) return null;

    // Retry mechanism: جرب 3 مرات لضمان التقاط الحدث من Audit Log
    for (let i = 0; i < 3; i++) {
        await new Promise(r => setTimeout(r, 1000 + (i * 500))); // 1s, 1.5s, 2s
        try {
            const auditLogs = await guild.fetchAuditLogs({ type, limit: 20 });
            const entry = auditLogs.entries.find(e => {
                const isRecent = (Date.now() - e.createdTimestamp) < windowMs;
                const targetMatch = targetId
                    ? (e.target?.id === targetId || e.targetId === targetId)
                    : true;
                return isRecent && targetMatch;
            });
            if (entry) return entry.executor;
        } catch {
            // تجاهل الأخطاء واستمر في المحاولة
        }
    }
    return null;
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
    if (message.author.bot) return;

    // في حالة حذف الرسالة، الـ target في الـ Audit Log هو صاحب الرسالة
    const executor = await getExecutor(message.guild, AuditLogEvent.MessageDelete, message.author.id);

    if (_isBotAction(executor)) return;

    const safeContent = message.content
        ? (message.content.length > 1024 ? message.content.substring(0, 1020) + '...' : message.content)
        : '*بدون محتوى نصي*';

    const executorText = executor ? `${executor} (\`${executor.id}\`)` : `${message.author} (بنفسه/تطبيق طرف ثالث)`;

    const embed = new EmbedBuilder()
        .setColor('#ED4245')
        .setTitle('🗑️ رسالة محذوفة')
        .setAuthor({ name: message.author.tag, iconURL: message.author.displayAvatarURL() })
        .setDescription(`**تم حذف رسالة في القناة:** ${message.channel}`)
        .addFields(
            { name: '📝 المحتوى', value: `\`\`\`\n${safeContent}\n\`\`\``, inline: false },
            { name: '👤 صاحب الرسالة', value: `${message.author} (\`${message.author.id}\`)`, inline: true },
            { name: '👮 المحذوف بواسطة', value: executorText, inline: true }
        )
        .setTimestamp()
        .setFooter({ text: `Message ID: ${message.id}` });

    if (message.attachments.size > 0) {
        embed.addFields({ name: '📎 المرفقات', value: `${message.attachments.size} ملف(ات)`, inline: false });
    }

    await sendLog(message.guild, embed);
}

// رسالة معدلة
async function logMessageUpdate(oldMessage, newMessage) {
    if (!newMessage.guild) return;
    if (oldMessage.content === newMessage.content) return;
    if (newMessage.author?.bot) return;

    const safeOldContent = oldMessage.content
        ? (oldMessage.content.length > 1024 ? oldMessage.content.substring(0, 1020) + '...' : oldMessage.content)
        : '*بدون محتوى*';

    const safeNewContent = newMessage.content
        ? (newMessage.content.length > 1024 ? newMessage.content.substring(0, 1020) + '...' : newMessage.content)
        : '*بدون محتوى*';

    const embed = new EmbedBuilder()
        .setColor('#FEE75C')
        .setTitle('✏️ رسالة معدلة')
        .setAuthor({ name: newMessage.author.tag, iconURL: newMessage.author.displayAvatarURL() })
        .setDescription(`**تم تعديل رسالة في القناة:** ${newMessage.channel}`)
        .addFields(
            { name: '🔴 النص السابق', value: `\`\`\`\n${safeOldContent}\n\`\`\``, inline: false },
            { name: '🟢 النص الجديد', value: `\`\`\`\n${safeNewContent}\n\`\`\``, inline: false },
            { name: '👤 صاحب الرسالة', value: `${newMessage.author} (\`${newMessage.author.id}\`)`, inline: true }
        )
        .setTimestamp()
        .setFooter({ text: `Message ID: ${newMessage.id}` });

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

    const executor = await getExecutor(channel.guild, AuditLogEvent.ChannelCreate, channel.id);
    const executorText = executor ? `${executor} (\`${executor.id}\`)` : 'غير معروف';

    const embed = new EmbedBuilder()
        .setColor('#57F287')
        .setTitle('📁 قناة جديدة تم إنشاؤها')
        .setDescription(`**تم إنشاء قناة جديدة:** ${channel}`)
        .addFields(
            { name: '🏷️ اسم القناة', value: `\`${channel.name}\``, inline: true },
            { name: '📋 نوع القناة', value: channel.type === 0 ? 'نصية 💬' : (channel.type === 2 ? 'صوتية 🔊' : 'أخرى'), inline: true },
            { name: '👮 المنشئ', value: executorText, inline: false }
        )
        .setTimestamp()
        .setFooter({ text: `Channel ID: ${channel.id}` });

    await sendLog(channel.guild, embed);
}

// قناة تم حذفها
async function logChannelDelete(channel) {
    if (!channel.guild) return;

    const executor = await getExecutor(channel.guild, AuditLogEvent.ChannelDelete, channel.id);
    const executorText = executor ? `${executor} (\`${executor.id}\`)` : 'غير معروف';

    const embed = new EmbedBuilder()
        .setColor('#ED4245')
        .setTitle('🗑️ قناة تم حذفها')
        .setDescription(`**اسم القناة:** \`${channel.name}\``)
        .addFields(
            { name: '📋 نوع القناة', value: channel.type === 0 ? 'نصية 💬' : (channel.type === 2 ? 'صوتية 🔊' : 'أخرى'), inline: true },
            { name: '👮 المحذوف بواسطة', value: executorText, inline: false }
        )
        .setTimestamp()
        .setFooter({ text: `Channel ID: ${channel.id}` });

    await sendLog(channel.guild, embed);
}

// === سجلات الرولات ===

// رول تم إنشاؤه
async function logRoleCreate(role) {
    const executor = await getExecutor(role.guild, AuditLogEvent.RoleCreate, role.id);
    const executorText = executor ? `${executor} (\`${executor.id}\`)` : 'غير معروف';

    const embed = new EmbedBuilder()
        .setColor('#57F287')
        .setTitle('🎭 رتبة جديدة تم إنشاؤها')
        .setDescription(`**الرتبة:** ${role}`)
        .addFields(
            { name: '🏷️ اسم الرتبة', value: `\`${role.name}\``, inline: true },
            { name: '🎨 اللون', value: `\`${role.hexColor}\``, inline: true },
            { name: '👮 المنشئ', value: executorText, inline: false }
        )
        .setTimestamp()
        .setFooter({ text: `Role ID: ${role.id}` });

    await sendLog(role.guild, embed);
}

// رول تم حذفه
async function logRoleDelete(role) {
    const executor = await getExecutor(role.guild, AuditLogEvent.RoleDelete, role.id);
    const executorText = executor ? `${executor} (\`${executor.id}\`)` : 'غير معروف';

    const embed = new EmbedBuilder()
        .setColor('#ED4245')
        .setTitle('🗑️ رتبة تم حذفها')
        .setDescription(`**اسم الرتبة:** \`${role.name}\``)
        .addFields(
            { name: '🎨 اللون', value: `\`${role.hexColor}\``, inline: true },
            { name: '👮 المحذوف بواسطة', value: executorText, inline: false }
        )
        .setTimestamp()
        .setFooter({ text: `Role ID: ${role.id}` });

    await sendLog(role.guild, embed);
}

// === سجلات الباند والكيك ===

// باند
async function logBan(ban) {
    const executor = await getExecutor(ban.guild, AuditLogEvent.MemberBanAdd, ban.user.id);
    const executorText = executor ? `${executor} (\`${executor.id}\`)` : 'غير معروف';

    const embed = new EmbedBuilder()
        .setColor('#8B0000')
        .setTitle('🔨 تم حظر عضو (Ban)')
        .setAuthor({ name: ban.user.tag, iconURL: ban.user.displayAvatarURL() })
        .setDescription(`**تم حظر العضو:** ${ban.user}`)
        .addFields(
            { name: '📋 السبب', value: `\`${ban.reason || 'لا يوجد سبب'}\``, inline: false },
            { name: '👤 العضو', value: `\`${ban.user.id}\``, inline: true },
            { name: '👮 المحظور بواسطة', value: executorText, inline: true }
        )
        .setThumbnail(ban.user.displayAvatarURL())
        .setTimestamp()
        .setFooter({ text: `User ID: ${ban.user.id}` });

    await sendLog(ban.guild, embed);
}

// إلغاء باند
async function logUnban(ban) {
    const executor = await getExecutor(ban.guild, AuditLogEvent.MemberBanRemove, ban.user.id);
    const executorText = executor ? `${executor} (\`${executor.id}\`)` : 'غير معروف';

    const embed = new EmbedBuilder()
        .setColor('#57F287')
        .setTitle('🔓 تم رفع الحظر (Unban)')
        .setAuthor({ name: ban.user.tag, iconURL: ban.user.displayAvatarURL() })
        .setDescription(`**تم رفع الحظر عن العضو:** ${ban.user}`)
        .addFields(
            { name: '👤 العضو', value: `\`${ban.user.id}\``, inline: true },
            { name: '👮 تم الإلغاء بواسطة', value: executorText, inline: true }
        )
        .setThumbnail(ban.user.displayAvatarURL())
        .setTimestamp()
        .setFooter({ text: `User ID: ${ban.user.id}` });

    await sendLog(ban.guild, embed);
}

// === سجلات الطرد والتايم أوت ===

// طرد عضو (Kick)
async function logKick(member, executor = null) {
    // If executor is not passed directly, try to fetch it
    if (!executor) {
        executor = await getExecutor(member.guild, AuditLogEvent.MemberKick, member.id);
    }
    const executorText = executor ? `${executor} (\`${executor.id}\`)` : 'غير معروف';

    const embed = new EmbedBuilder()
        .setColor('#E67E22')
        .setTitle('👢 تم طرد عضو (Kick)')
        .setAuthor({ name: member.user.tag, iconURL: member.user.displayAvatarURL() })
        .setDescription(`**تم طرد العضو:** ${member.user}`)
        .addFields(
            { name: '👤 العضو', value: `\`${member.id}\``, inline: true },
            { name: '👮 المطرود بواسطة', value: executorText, inline: true }
        )
        .setThumbnail(member.user.displayAvatarURL())
        .setTimestamp()
        .setFooter({ text: `User ID: ${member.id}` });

    await sendLog(member.guild, embed);
}

// تطبيق Timeout على عضو
async function logTimeout(oldMember, newMember) {
    const wasTimedOut = oldMember.communicationDisabledUntil;
    const isTimedOut = newMember.communicationDisabledUntil;

    // Timeout مُضاف
    if (!wasTimedOut && isTimedOut) {
        const executor = await getExecutor(newMember.guild, AuditLogEvent.MemberUpdate, newMember.id);
        const executorText = executor ? `${executor} (\`${executor.id}\`)` : 'غير معروف';
        const until = Math.floor(new Date(isTimedOut).getTime() / 1000);
        
        const embed = new EmbedBuilder()
            .setColor('#FEE75C')
            .setTitle('🔇 تم إعطاء العضو كتم صوتي (Timeout)')
            .setAuthor({ name: newMember.user.tag, iconURL: newMember.user.displayAvatarURL() })
            .setDescription(`**العضو:** ${newMember}`)
            .addFields(
                { name: '⏳ حتى', value: `<t:${until}:R>`, inline: true },
                { name: '👮 بواسطة', value: executorText, inline: true }
            )
            .setThumbnail(newMember.user.displayAvatarURL())
            .setTimestamp()
            .setFooter({ text: `User ID: ${newMember.id}` });

        await sendLog(newMember.guild, embed);
    }
    // Timeout مُرفع
    else if (wasTimedOut && !isTimedOut) {
        const executor = await getExecutor(newMember.guild, AuditLogEvent.MemberUpdate, newMember.id);
        const executorText = executor ? `${executor} (\`${executor.id}\`)` : 'غير معروف';
        
        const embed = new EmbedBuilder()
            .setColor('#57F287')
            .setTitle('🔊 رُفع كتم الصوت (Timeout Removed)')
            .setAuthor({ name: newMember.user.tag, iconURL: newMember.user.displayAvatarURL() })
            .setDescription(`**العضو:** ${newMember}`)
            .addFields(
                { name: '👮 رُفع بواسطة', value: executorText, inline: true }
            )
            .setThumbnail(newMember.user.displayAvatarURL())
            .setTimestamp()
            .setFooter({ text: `User ID: ${newMember.id}` });

        await sendLog(newMember.guild, embed);
    }
}

// تعديل قناة
async function logChannelUpdate(oldChannel, newChannel) {
    if (!newChannel.guild) return;
    const changes = [];

    if (oldChannel.name !== newChannel.name) {
        changes.push(`**الاسم:** \`${oldChannel.name}\` ➔ \`${newChannel.name}\``);
    }
    if (oldChannel.topic !== newChannel.topic) {
        const oldTopic = oldChannel.topic || '*لا يوجد*';
        const newTopic = newChannel.topic || '*لا يوجد*';
        changes.push(`**الوصف:** \`${oldTopic.substring(0, 50)}\` ➔ \`${newTopic.substring(0, 50)}\``);
    }
    if (oldChannel.rateLimitPerUser !== newChannel.rateLimitPerUser) {
        changes.push(`**Slow Mode:** ${oldChannel.rateLimitPerUser}ث ➔ ${newChannel.rateLimitPerUser}ث`);
    }

    if (changes.length === 0) return;

    const executor = await getExecutor(newChannel.guild, AuditLogEvent.ChannelUpdate, newChannel.id);
    const executorText = executor ? `${executor} (\`${executor.id}\`)` : 'غير معروف';

    const embed = new EmbedBuilder()
        .setColor('#3498DB')
        .setTitle('📝 قناة تم تعديلها')
        .setDescription(`**القناة:** ${newChannel}`)
        .addFields(
            { name: '📋 التغييرات', value: changes.join('\n'), inline: false },
            { name: '👮 بواسطة', value: executorText, inline: true }
        )
        .setTimestamp()
        .setFooter({ text: `Channel ID: ${newChannel.id}` });

    await sendLog(newChannel.guild, embed);
}

// تعديل رول
async function logRoleUpdate(oldRole, newRole) {
    const changes = [];

    if (oldRole.name !== newRole.name) {
        changes.push(`**الاسم:** \`${oldRole.name}\` ➔ \`${newRole.name}\``);
    }
    if (oldRole.hexColor !== newRole.hexColor) {
        changes.push(`**اللون:** \`${oldRole.hexColor}\` ➔ \`${newRole.hexColor}\``);
    }
    if (oldRole.hoist !== newRole.hoist) {
        changes.push(`**الظهور المنفصل:** ${oldRole.hoist ? 'نعم' : 'لا'} ➔ ${newRole.hoist ? 'نعم' : 'لا'}`);
    }
    if (oldRole.mentionable !== newRole.mentionable) {
        changes.push(`**قابل للمنشن:** ${oldRole.mentionable ? 'نعم' : 'لا'} ➔ ${newRole.mentionable ? 'نعم' : 'لا'}`);
    }

    if (changes.length === 0) return;

    const executor = await getExecutor(newRole.guild, AuditLogEvent.RoleUpdate, newRole.id);
    const executorText = executor ? `${executor} (\`${executor.id}\`)` : 'غير معروف';
    
    const embed = new EmbedBuilder()
        .setColor('#9B59B6')
        .setTitle('🎭 رتبة تم تعديلها')
        .setDescription(`**الرتبة:** ${newRole}`)
        .addFields(
            { name: '📋 التغييرات', value: changes.join('\n'), inline: false },
            { name: '👮 بواسطة', value: executorText, inline: true }
        )
        .setTimestamp()
        .setFooter({ text: `Role ID: ${newRole.id}` });

    await sendLog(newRole.guild, embed);
}

// === سجلات الإيموجيات ===
async function logEmojiCreate(emoji) {
    const executor = await getExecutor(emoji.guild, AuditLogEvent.EmojiCreate, emoji.id);
    const executorText = executor ? `${executor} (\`${executor.id}\`)` : 'غير معروف';

    const embed = new EmbedBuilder()
        .setColor('#57F287')
        .setTitle('😀 إيموجي جديد تم إضافته')
        .setDescription(`**الإيموجي:** <:${emoji.name}:${emoji.id}>`)
        .addFields(
            { name: '🏷️ الاسم', value: `\`${emoji.name}\``, inline: true },
            { name: '👮 المنشئ', value: executorText, inline: true }
        )
        .setThumbnail(emoji.url)
        .setTimestamp()
        .setFooter({ text: `Emoji ID: ${emoji.id}` });

    await sendLog(emoji.guild, embed);
}

async function logEmojiDelete(emoji) {
    const executor = await getExecutor(emoji.guild, AuditLogEvent.EmojiDelete, emoji.id);
    const executorText = executor ? `${executor} (\`${executor.id}\`)` : 'غير معروف';

    const embed = new EmbedBuilder()
        .setColor('#ED4245')
        .setTitle('🗑️ إيموجي تم حذفه')
        .addFields(
            { name: '🏷️ الاسم', value: `\`${emoji.name}\``, inline: true },
            { name: '👮 المحذوف بواسطة', value: executorText, inline: true }
        )
        .setThumbnail(emoji.url)
        .setTimestamp()
        .setFooter({ text: `Emoji ID: ${emoji.id}` });

    await sendLog(emoji.guild, embed);
}

// === سجلات الدعوات ===
async function logInviteCreate(invite) {
    const executor = await getExecutor(invite.guild, AuditLogEvent.InviteCreate);
    const executorText = executor ? `${executor} (\`${executor.id}\`)` : (invite.inviter ? `${invite.inviter} (\`${invite.inviter.id}\`)` : 'غير معروف');

    const embed = new EmbedBuilder()
        .setColor('#57F287')
        .setTitle('🔗 رابط دعوة جديد')
        .setDescription(`**الرابط:** ${invite.url}`)
        .addFields(
            { name: '📣 القناة', value: `${invite.channel}`, inline: true },
            { name: '👮 المنشئ', value: executorText, inline: true },
            { name: '⏳ الاستخدامات المسموحة', value: invite.maxUses === 0 ? 'غير محدود' : `${invite.maxUses}`, inline: true },
            { name: '⏱️ ينتهي بعد', value: invite.maxAge === 0 ? 'أبداً' : `<t:${Math.floor(invite.expiresTimestamp / 1000)}:R>`, inline: true }
        )
        .setTimestamp()
        .setFooter({ text: `Invite Code: ${invite.code}` });

    await sendLog(invite.guild, embed);
}

async function logInviteDelete(invite) {
    const executor = await getExecutor(invite.guild, AuditLogEvent.InviteDelete);
    const executorText = executor ? `${executor} (\`${executor.id}\`)` : 'غير معروف';

    const embed = new EmbedBuilder()
        .setColor('#ED4245')
        .setTitle('🗑️ رابط دعوة تم حذفه')
        .setDescription(`**الرمز:** \`${invite.code}\``)
        .addFields(
            { name: '📣 القناة', value: `${invite.channel}`, inline: true },
            { name: '👮 المحذوف بواسطة', value: executorText, inline: true }
        )
        .setTimestamp()
        .setFooter({ text: `Invite Code: ${invite.code}` });

    await sendLog(invite.guild, embed);
}

// === سجلات إعدادات السيرفر ===
async function logGuildUpdate(oldGuild, newGuild) {
    const changes = [];

    if (oldGuild.name !== newGuild.name) {
        changes.push(`**الاسم:** \`${oldGuild.name}\` ➔ \`${newGuild.name}\``);
    }
    if (oldGuild.icon !== newGuild.icon) {
        changes.push(`**الأيقونة:** تم تغيير الصورة`);
    }
    if (oldGuild.banner !== newGuild.banner) {
        changes.push(`**البانر:** تم تغيير البانر`);
    }

    if (changes.length === 0) return;

    const executor = await getExecutor(newGuild, AuditLogEvent.GuildUpdate, newGuild.id);
    const executorText = executor ? `${executor} (\`${executor.id}\`)` : 'غير معروف';

    const embed = new EmbedBuilder()
        .setColor('#3498DB')
        .setTitle('⚙️ إعدادات السيرفر تم تعديلها')
        .addFields(
            { name: '📋 التغييرات', value: changes.join('\n'), inline: false },
            { name: '👮 بواسطة', value: executorText, inline: true }
        )
        .setThumbnail(newGuild.iconURL())
        .setTimestamp()
        .setFooter({ text: `Guild ID: ${newGuild.id}` });

    await sendLog(newGuild, embed);
}

module.exports = {
    sendLog, setBotId,
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
    logKick,
    logTimeout,
    logChannelUpdate,
    logRoleUpdate,
    logEmojiCreate,
    logEmojiDelete,
    logInviteCreate,
    logInviteDelete,
    logGuildUpdate
};

