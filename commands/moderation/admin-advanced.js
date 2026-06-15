const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { PremiumEmbedBuilder } = require('../../utils/embed-builder');

// ============================
// أوامر إدارية متقدمة
// ============================

// 1. Mass Actions - إجراءات جماعية
async function massKick(message, args) {
    if (!message.member.permissions.has(PermissionFlagsBits.KickMembers)) {
        return message.reply('❌ ليس لديك صلاحية!');
    }

    const role = message.mentions.roles.first();
    if (!role) {
        return message.reply('❌ منشن الرتبة!');
    }

    const members = role.members;
    let kicked = 0;

    for (const [id, member] of members) {
        try {
            await member.kick('Mass kick');
            kicked++;
        } catch (error) { }
    }

    return message.reply(`✅ تم طرد ${kicked} عضو من رتبة ${role.name}`);
}

async function massBan(message, args) {
    if (!message.member.permissions.has(PermissionFlagsBits.BanMembers)) {
        return message.reply('❌ ليس لديك صلاحية!');
    }

    const role = message.mentions.roles.first();
    if (!role) {
        return message.reply('❌ منشن الرتبة!');
    }

    const members = role.members;
    let banned = 0;

    for (const [id, member] of members) {
        try {
            await member.ban({ reason: 'Mass ban' });
            banned++;
        } catch (error) { }
    }

    return message.reply(`✅ تم حظر ${banned} عضو من رتبة ${role.name}`);
}

// 2. Warning System - نظام تحذيرات
const warnings = new Map();

async function warn(message, args) {
    if (!message.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
        return message.reply('❌ ليس لديك صلاحية!');
    }

    const user = message.mentions.users.first();
    const reason = args.slice(1).join(' ') || 'لا يوجد سبب';

    if (!user) {
        return message.reply('❌ منشن العضو!');
    }

    const guildId = message.guild.id;
    const key = `${guildId}-${user.id}`;

    if (!warnings.has(key)) {
        warnings.set(key, []);
    }

    warnings.get(key).push({
        reason,
        moderator: message.author.id,
        timestamp: Date.now()
    });

    const warnCount = warnings.get(key).length;

    const embed = PremiumEmbedBuilder.warning(
        '⚠️ تحذير',
        `${user} حصل على تحذير #${warnCount}`,
        [
            { name: 'السبب', value: reason },
            { name: 'المشرف', value: `${message.author}` }
        ]
    );

    // إجراءات تلقائية
    const member = message.guild.members.cache.get(user.id);
    if (warnCount === 3) {
        await member.timeout(60 * 60 * 1000, '3 تحذيرات'); // ساعة
        embed.addFields({ name: '⏱️ إجراء تلقائي', value: 'تم كتم الصوت لمدة ساعة' });
    } else if (warnCount === 5) {
        await member.kick('5 تحذيرات');
        embed.addFields({ name: '👢 إجراء تلقائي', value: 'تم الطرد' });
    }

    return message.reply({ embeds: [embed] });
}

async function warnings_list(message, args) {
    const user = message.mentions.users.first() || message.author;
    const key = `${message.guild.id}-${user.id}`;

    const userWarnings = warnings.get(key) || [];

    if (userWarnings.length === 0) {
        return message.reply(`✅ ${user} ليس لديه تحذيرات!`);
    }

    const fields = userWarnings.map((w, i) => ({
        name: `تحذير #${i + 1}`,
        value: `السبب: ${w.reason}\nالمشرف: <@${w.moderator}>\nالتاريخ: <t:${Math.floor(w.timestamp / 1000)}:R>`,
        inline: false
    }));

    const embed = PremiumEmbedBuilder.warning(
        `⚠️ تحذيرات ${user.username}`,
        `إجمالي: ${userWarnings.length}`,
        fields
    );

    return message.reply({ embeds: [embed] });
}

// 3. Slowmode Control
async function slowmode(message, args) {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
        return message.reply('❌ ليس لديك صلاحية!');
    }

    const seconds = parseInt(args[0]);

    if (isNaN(seconds) || seconds < 0 || seconds > 21600) {
        return message.reply('❌ الوقت يجب أن يكون بين 0 و 21600 ثانية!');
    }

    await message.channel.setRateLimitPerUser(seconds);

    if (seconds === 0) {
        return message.reply('✅ تم إيقاف الوضع البطيء!');
    }

    return message.reply(`✅ تم تفعيل الوضع البطيء: رسالة كل ${seconds} ثانية`);
}

// 4. Lock/Unlock Channels
async function lock(message) {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
        return message.reply('❌ ليس لديك صلاحية!');
    }

    await message.channel.permissionOverwrites.edit(message.guild.id, {
        SendMessages: false
    });

    return message.reply('🔒 تم قفل القناة!');
}

async function unlock(message) {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
        return message.reply('❌ ليس لديك صلاحية!');
    }

    await message.channel.permissionOverwrites.edit(message.guild.id, {
        SendMessages: null
    });

    return message.reply('🔓 تم فتح القناة!');
}

// 5. Purge Messages
async function purge(message, args) {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
        return message.reply('❌ ليس لديك صلاحية!');
    }

    const amount = parseInt(args[0]);

    if (!amount || amount < 1 || amount > 100) {
        return message.reply('❌ العدد يجب أن يكون بين 1 و 100!');
    }

    const deleted = await message.channel.bulkDelete(amount + 1, true);

    const reply = await message.channel.send(`✅ تم حذف ${deleted.size - 1} رسالة`);
    setTimeout(() => reply.delete(), 3000);
}

// 6. Role Management
async function roleAll(message, args) {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageRoles)) {
        return message.reply('❌ ليس لديك صلاحية!');
    }

    const role = message.mentions.roles.first();
    if (!role) {
        return message.reply('❌ منشن الرتبة!');
    }

    // Security Check: Hierarchy
    if (message.member.roles.highest.position <= role.position && message.author.id !== config.ownerId) {
        return message.reply('❌ لا يمكنك إدارة رتبة أعلى من رتبتك أو مساوية لها!');
    }

    // Security Check: Protected Roles
    if (role.permissions.has(PermissionFlagsBits.Administrator) || role.name === '👑 Owner' || role.name === '👮 Admin') {
        if (message.author.id !== config.ownerId) {
            return message.reply('❌ لا يمكنك استخدام هذا الأمر على رتب الإدارة العليا!');
        }
    }

    const members = await message.guild.members.fetch();
    let added = 0;

    for (const [id, member] of members) {
        if (!member.roles.cache.has(role.id)) {
            try {
                await member.roles.add(role);
                added++;
            } catch (error) { }
        }
    }

    return message.reply(`✅ تم إعطاء رتبة ${role.name} لـ ${added} عضو`);
}

async function removeRoleAll(message, args) {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageRoles)) {
        return message.reply('❌ ليس لديك صلاحية!');
    }

    const role = message.mentions.roles.first();
    if (!role) {
        return message.reply('❌ منشن الرتبة!');
    }

    const members = role.members;
    let removed = 0;

    for (const [id, member] of members) {
        try {
            await member.roles.remove(role);
            removed++;
        } catch (error) { }
    }

    return message.reply(`✅ تم إزالة رتبة ${role.name} من ${removed} عضو`);
}

// 7. Nickname Management
async function nickAll(message, args) {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageNicknames)) {
        return message.reply('❌ ليس لديك صلاحية!');
    }

    const nickname = args.join(' ');
    if (!nickname) {
        return message.reply('❌ اكتب الاسم المستعار!');
    }

    const members = await message.guild.members.fetch();
    let changed = 0;

    for (const [id, member] of members) {
        try {
            await member.setNickname(nickname);
            changed++;
        } catch (error) { }
    }

    return message.reply(`✅ تم تغيير اسم ${changed} عضو`);
}

// 8. Server Stats
async function serverStats(message) {
    const guild = message.guild;
    const members = await guild.members.fetch();

    const botCount = members.filter(m => m.user.bot).size;
    const humanCount = members.size - botCount;
    const onlineCount = members.filter(m => m.presence?.status === 'online').size;

    const embed = PremiumEmbedBuilder.info(
        `📊 إحصائيات ${guild.name}`,
        null,
        [
            { name: '👥 الأعضاء', value: `${members.size}`, inline: true },
            { name: '🤖 البوتات', value: `${botCount}`, inline: true },
            { name: '👤 البشر', value: `${humanCount}`, inline: true },
            { name: '🟢 المتصلين', value: `${onlineCount}`, inline: true },
            { name: '📝 القنوات', value: `${guild.channels.cache.size}`, inline: true },
            { name: '🎭 الرتب', value: `${guild.roles.cache.size}`, inline: true },
            { name: '😊 الإيموجيز', value: `${guild.emojis.cache.size}`, inline: true },
            { name: '📅 تاريخ الإنشاء', value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:R>`, inline: true }
        ]
    );

    embed.setThumbnail(guild.iconURL());

    return message.reply({ embeds: [embed] });
}

module.exports = {
    // ─── واجهة الأمر المطلوبة من commandHandler ──────────────────
    name: 'admin-advanced',
    aliases: ['ادمن-متقدم'],
    description: 'أوامر إدارية متقدمة (mass kick/ban, slowmode, stats...)',
    usage: 'admin-advanced [kick/ban/slowmode/stats/role-all]',
    permissions: 'Administrator',

    async execute(message, args) {
        const sub = args[0]?.toLowerCase();
        if (sub === 'kick') return massKick(message, args.slice(1));
        if (sub === 'ban') return massBan(message, args.slice(1));
        if (sub === 'warn') return warn(message, args.slice(1));
        if (sub === 'warnings') return warnings_list(message, args.slice(1));
        if (sub === 'slowmode') return slowmode(message, args.slice(1));
        if (sub === 'lock') return lock(message);
        if (sub === 'unlock') return unlock(message);
        if (sub === 'purge') return purge(message, args.slice(1));
        if (sub === 'role-all') return roleAll(message, args.slice(1));
        if (sub === 'unrole-all') return removeRoleAll(message, args.slice(1));
        if (sub === 'nick-all') return nickAll(message, args.slice(1));
        if (sub === 'stats') return serverStats(message);
        return message.reply('❌ استخدام: `admin-advanced [kick/ban/warn/warnings/slowmode/lock/unlock/purge/role-all/stats]`');
    },

    // ─── export الدوال للاستخدام المباشر ────────────────────────
    massKick, massBan, warn, warnings_list,
    slowmode, lock, unlock, purge,
    roleAll, removeRoleAll, nickAll, serverStats,
};
