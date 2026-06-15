'use strict';

/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║   🏠 ROOM CREATOR v3.0 — نظام الغرف المخصصة 2060             ║
 * ║   إنشاء غرف بأزرار تفاعلية + Mobile Legends + 8 ألعاب        ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */

const {
    EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle,
    ChannelType, PermissionFlagsBits, MessageFlags, ModalBuilder,
    TextInputBuilder, TextInputStyle
} = require('discord.js');
const config = require('../../config');
const db = require('../../utils/database');
const fs = require('fs');
const path = require('path');

// ─── ملف الغرف ─────────────────────────────────────────────────────────────
const ROOMS_FILE = path.join(__dirname, '../../data/custom-rooms.json');
let _rooms = null;
let _dirty = false;

function _loadRooms() {
    if (_rooms) return _rooms;
    try {
        if (fs.existsSync(ROOMS_FILE)) {
            _rooms = JSON.parse(fs.readFileSync(ROOMS_FILE, 'utf8'));
        }
    } catch { /* ignore */ }
    if (!_rooms || typeof _rooms !== 'object') _rooms = {};
    return _rooms;
}

function _saveRooms() {
    if (!_dirty) return;
    try {
        const dir = path.dirname(ROOMS_FILE);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(ROOMS_FILE, JSON.stringify(_rooms, null, 2), 'utf8');
        _dirty = false;
    } catch { /* ignore */ }
}

setInterval(_saveRooms, 60_000).unref?.();
process.on('SIGINT', _saveRooms);
process.on('SIGTERM', _saveRooms);

// ─── الثوابت ───────────────────────────────────────────────────────────────
const ROOM_COST = 2500;
const ROOM_RENEW_COST = 1000;
const ROOM_DURATION = 7 * 24 * 60 * 60 * 1000;
const ROOM_INACTIVE_LIMIT = 48 * 60 * 60 * 1000;

// ─── الألعاب المدعومة (8 ألعاب) ────────────────────────────────────────────
const SUPPORTED_GAMES = {
    // Among Us
    'امونق اص':       { emoji: '👾', color: '#FF0000', icon: '🔴', displayName: 'Among Us' },
    'امونج اس':       { emoji: '👾', color: '#FF0000', icon: '🔴', displayName: 'Among Us' },
    'among us':       { emoji: '👾', color: '#FF0000', icon: '🔴', displayName: 'Among Us' },
    // PUBG
    'ببجي':           { emoji: '🔫', color: '#FFD700', icon: '🟡', displayName: 'PUBG' },
    'pubg':           { emoji: '🔫', color: '#FFD700', icon: '🟡', displayName: 'PUBG' },
    // COD
    'كول اوف ديوتي': { emoji: '💥', color: '#00FF00', icon: '🟢', displayName: 'Call of Duty' },
    'كود':            { emoji: '💥', color: '#00FF00', icon: '🟢', displayName: 'Call of Duty' },
    'cod':            { emoji: '💥', color: '#00FF00', icon: '🟢', displayName: 'Call of Duty' },
    // Fortnite
    'فورتنايت':       { emoji: '🏗️', color: '#0099FF', icon: '🔵', displayName: 'Fortnite' },
    'fortnite':       { emoji: '🏗️', color: '#0099FF', icon: '🔵', displayName: 'Fortnite' },
    // Valorant
    'فالورانت':       { emoji: '🎯', color: '#9B59B6', icon: '🟣', displayName: 'Valorant' },
    'valorant':       { emoji: '🎯', color: '#9B59B6', icon: '🟣', displayName: 'Valorant' },
    // Minecraft
    'ماين كرافت':     { emoji: '⛏️', color: '#2ECC71', icon: '🟩', displayName: 'Minecraft' },
    'ماينكرافت':      { emoji: '⛏️', color: '#2ECC71', icon: '🟩', displayName: 'Minecraft' },
    'minecraft':      { emoji: '⛏️', color: '#2ECC71', icon: '🟩', displayName: 'Minecraft' },
    // 🌟 Mobile Legends
    'موبايل ليجند':   { emoji: '🌟', color: '#FF6B35', icon: '🌟', displayName: 'Mobile Legends' },
    'موبايل ليجندز':  { emoji: '🌟', color: '#FF6B35', icon: '🌟', displayName: 'Mobile Legends' },
    'mobile legends': { emoji: '🌟', color: '#FF6B35', icon: '🌟', displayName: 'Mobile Legends' },
    'ml':             { emoji: '🌟', color: '#FF6B35', icon: '🌟', displayName: 'Mobile Legends' },
    'mlbb':           { emoji: '🌟', color: '#FF6B35', icon: '🌟', displayName: 'Mobile Legends' },
};

// أسماء الألعاب للأزرار السريعة
const QUICK_GAME_MAP = {
    'pubg':      { key: 'ببجي',           ...SUPPORTED_GAMES['ببجي'] },
    'cod':       { key: 'كول اوف ديوتي', ...SUPPORTED_GAMES['كول اوف ديوتي'] },
    'valorant':  { key: 'فالورانت',       ...SUPPORTED_GAMES['فالورانت'] },
    'ml':        { key: 'موبايل ليجند',   ...SUPPORTED_GAMES['موبايل ليجند'] },
    'fortnite':  { key: 'فورتنايت',       ...SUPPORTED_GAMES['فورتنايت'] },
    'among':     { key: 'امونق اص',       ...SUPPORTED_GAMES['امونق اص'] },
    'minecraft': { key: 'ماين كرافت',     ...SUPPORTED_GAMES['ماين كرافت'] },
    'custom':    { key: 'custom',          emoji: '🏠', color: '#9B59B6', icon: '🏠', displayName: 'غرفة خاصة' },
};

function detectGame(text) {
    if (!text) return { key: 'custom', emoji: '🏠', color: '#9B59B6', icon: '🏠', displayName: 'غرفة خاصة' };
    const lower = text.toLowerCase().trim();
    for (const [key, val] of Object.entries(SUPPORTED_GAMES)) {
        if (lower.includes(key)) return { key, ...val };
    }
    return { key: 'custom', emoji: '🏠', color: '#9B59B6', icon: '🏠', displayName: 'غرفة خاصة' };
}

// ─── إنشاء غرفة جديدة ─────────────────────────────────────────────────────
async function createRoom(message, roomName, gameName, interactionReply = null) {
    const guild = message?.guild || interactionReply?.guild;
    const userId = message?.author?.id || interactionReply?.user?.id;
    const replyFn = interactionReply ? 
        (opts) => interactionReply.followUp({ ...opts, flags: MessageFlags.Ephemeral }) :
        (opts) => message.reply(opts);

    if (!guild || !userId) return;

    const userData = db.getUserData(userId);

    // فحص الرصيد
    if ((userData.balance || 0) < ROOM_COST) {
        const embed = new EmbedBuilder()
            .setColor('#E74C3C')
            .setTitle('❌ رصيد غير كافٍ')
            .setDescription([
                `> 💰 **رصيدك الحالي:** \`${(userData.balance || 0).toLocaleString()}\` 💰`,
                `> 💸 **تكلفة الغرفة:** \`${ROOM_COST.toLocaleString()}\` 💰`,
                `> 💔 **الناقص:** \`${(ROOM_COST - (userData.balance || 0)).toLocaleString()}\` 💰`,
                '',
                '> اكتب `عمل` أو `يومي` لكسب عملات!',
            ].join('\n'))
            .setTimestamp();
        return replyFn({ embeds: [embed] });
    }

    // فحص إذا للمستخدم غرفة بالفعل
    const rooms = _loadRooms();
    const existingRoom = Object.values(rooms).find(r => r.ownerId === userId && r.guildId === guild.id);
    if (existingRoom) {
        const ch = guild.channels.cache.get(existingRoom.channelId);
        const embed = new EmbedBuilder()
            .setColor('#FF8C00')
            .setTitle('⚠️ لديك غرفة بالفعل!')
            .setDescription([
                `> 🏠 **غرفتك الحالية:** ${ch ? ch.toString() : '(لم تُوجد)'} — **${existingRoom.name}**`,
                '> اكتب `غرفتي` لإدارة غرفتك',
                '> أو اكتب `حذف غرفة` لحذف الغرفة الحالية أولاً',
            ].join('\n'))
            .setTimestamp();
        return replyFn({ embeds: [embed] });
    }

    // كشف اللعبة
    const game = detectGame(gameName || '');
    const displayName = (roomName || '').trim() || `غرفة ${guild.members.cache.get(userId)?.displayName || 'العضو'}`;
    const channelName = `${game.icon}┃${displayName.slice(0, 20).replace(/\s+/g, '-').replace(/[^a-zA-Z0-9\u0600-\u06FF┃\-_]/g, '')}`;

    // البحث عن فئة الغرف المخصصة
    let roomsCategory = guild.channels.cache.find(c =>
        c.type === ChannelType.GuildCategory && c.name.includes('الغرف المخصصة')
    );

    if (!roomsCategory) {
        roomsCategory = await guild.channels.create({
            name: '🏠 الغرف المخصصة',
            type: ChannelType.GuildCategory,
            reason: 'إنشاء فئة الغرف المخصصة',
        }).catch(() => null);
    }

    // صلاحيات المالك
    const ownerPermissions = [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ManageMessages,
        PermissionFlagsBits.MuteMembers,
        PermissionFlagsBits.DeafenMembers,
        PermissionFlagsBits.MoveMembers,
        PermissionFlagsBits.ManageChannels,
    ];

    let textChannel = null;
    let voiceChannel = null;

    try {
        textChannel = await guild.channels.create({
            name: channelName,
            type: ChannelType.GuildText,
            parent: roomsCategory,
            topic: `🏠 غرفة **${displayName}** | 🎮 **${game.displayName}** | 👑 المالك: <@${userId}>`,
            permissionOverwrites: [
                {
                    id: guild.roles.everyone.id,
                    allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages],
                },
                {
                    id: userId,
                    allow: ownerPermissions,
                },
            ],
            reason: `غرفة جديدة — ${game.displayName}`,
        });

        voiceChannel = await guild.channels.create({
            name: `🎤┃${displayName.slice(0, 15)}`,
            type: ChannelType.GuildVoice,
            parent: roomsCategory,
            userLimit: 10,
            permissionOverwrites: [
                {
                    id: guild.roles.everyone.id,
                    allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect],
                },
                {
                    id: userId,
                    allow: [...ownerPermissions, PermissionFlagsBits.Connect, PermissionFlagsBits.Speak],
                },
            ],
            reason: `غرفة صوتية — ${game.displayName}`,
        });

    } catch (err) {
        console.error('[RoomCreator] خطأ في إنشاء القناة:', err.message);
        return replyFn({ content: '❌ فشل إنشاء الغرفة! تأكد من صلاحيات البوت.' });
    }

    // خصم الرصيد
    db.removeMoney(userId, ROOM_COST);
    db.addTransaction(userId, 'room_create', -ROOM_COST, `إنشاء غرفة: ${displayName}`);

    // حفظ بيانات الغرفة
    const roomId = `room_${guild.id}_${userId}_${Date.now()}`;
    rooms[roomId] = {
        id: roomId,
        name: displayName,
        game: game.key,
        gameDisplay: game.displayName,
        gameEmoji: game.emoji,
        gameColor: game.color,
        ownerId: userId,
        guildId: guild.id,
        channelId: textChannel.id,
        voiceChannelId: voiceChannel?.id || null,
        createdAt: Date.now(),
        expiresAt: Date.now() + ROOM_DURATION,
        lastActivity: Date.now(),
        cost: ROOM_COST,
        isLocked: false,
    };
    _dirty = true;

    // رسالة الترحيب داخل الغرفة
    const welcomeEmbed = new EmbedBuilder()
        .setColor(game.color)
        .setTitle(`${game.emoji} غرفة ${displayName}`)
        .setDescription([
            `> 🎮 **اللعبة:** ${game.displayName}`,
            `> 👑 **المالك:** <@${userId}>`,
            `> ⏰ **تنتهي في:** <t:${Math.floor((Date.now() + ROOM_DURATION) / 1000)}:R>`,
            '',
            '**🔑 صلاحياتك كمالك الغرفة:**',
            '✅ حذف رسائل الأعضاء',
            '✅ كتم أعضاء في الصوتي',
            '✅ طرد أعضاء من الصوتي',
            '✅ قفل/فتح الغرفة',
            '✅ تغيير اسم وموضوع الغرفة',
        ].join('\n'))
        .setFooter({ text: `تكلفت ${ROOM_COST.toLocaleString()} 💰 • صالحة 7 أيام` })
        .setTimestamp();

    const roomRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`room_renew_${roomId}`)
            .setLabel('🔄 تجديد (+7 أيام)')
            .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
            .setCustomId(`room_lock_${roomId}`)
            .setLabel('🔒 قفل الغرفة')
            .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
            .setCustomId(`room_info_${roomId}`)
            .setLabel('ℹ️ معلومات')
            .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId(`room_delete_${roomId}`)
            .setLabel('🗑️ حذف')
            .setStyle(ButtonStyle.Danger),
    );

    await textChannel.send({ embeds: [welcomeEmbed], components: [roomRow] });

    // رسالة التأكيد للمستخدم
    const confirmEmbed = new EmbedBuilder()
        .setColor(game.color)
        .setTitle('🎉 تم إنشاء غرفتك بنجاح!')
        .setDescription([
            `> 🏠 **الغرفة النصية:** ${textChannel}`,
            `> 🎤 **الغرفة الصوتية:** ${voiceChannel}`,
            `> 🎮 **اللعبة:** ${game.emoji} ${game.displayName}`,
            `> 💰 **المدفوع:** \`${ROOM_COST.toLocaleString()}\` 💰`,
            `> 💰 **الرصيد المتبقي:** \`${((userData.balance || 0) - ROOM_COST).toLocaleString()}\` 💰`,
            `> ⏰ **تنتهي:** <t:${Math.floor((Date.now() + ROOM_DURATION) / 1000)}:R>`,
        ].join('\n'))
        .setFooter({ text: 'انتقل إلى غرفتك الآن! 🚀' })
        .setTimestamp();

    if (interactionReply) {
        await interactionReply.followUp({ embeds: [confirmEmbed], flags: MessageFlags.Ephemeral });
    } else {
        await message.reply({ embeds: [confirmEmbed] });
    }
}

// ─── عرض قائمة الغرف ──────────────────────────────────────────────────────
async function listRooms(message) {
    const rooms = _loadRooms();
    const guildRooms = Object.values(rooms).filter(r =>
        r.guildId === message.guild.id && Date.now() < r.expiresAt
    );

    if (guildRooms.length === 0) {
        const embed = new EmbedBuilder()
            .setColor('#9B59B6')
            .setTitle('🏠 الغرف المخصصة')
            .setDescription([
                '> **لا توجد غرف نشطة حالياً**',
                '',
                '> اكتب `غرفة جديدة [اسم] [لعبة]` لإنشاء غرفتك!',
                `> 💰 **التكلفة:** \`${ROOM_COST.toLocaleString()}\` 💰`,
            ].join('\n'))
            .setTimestamp();

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('quickroom_pubg').setLabel('🔫 ببجي').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('quickroom_ml').setLabel('🌟 موبايل ليجند').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('quickroom_valorant').setLabel('🎯 فالورانت').setStyle(ButtonStyle.Danger),
            new ButtonBuilder().setCustomId('quickroom_custom').setLabel('🏠 غرفة خاصة').setStyle(ButtonStyle.Secondary),
        );
        return message.reply({ embeds: [embed], components: [row] });
    }

    const embed = new EmbedBuilder()
        .setColor('#9B59B6')
        .setTitle(`🏠 الغرف المخصصة النشطة (${guildRooms.length} غرفة)`)
        .setTimestamp();

    for (const room of guildRooms.slice(0, 12)) {
        const ch = message.guild.channels.cache.get(room.channelId);
        const remaining = Math.max(0, room.expiresAt - Date.now());
        const days = Math.floor(remaining / 86400000);
        const hours = Math.floor((remaining % 86400000) / 3600000);

        embed.addFields({
            name: `${room.gameEmoji || '🏠'} ${room.name}`,
            value: [
                `> 📣 ${ch ? ch.toString() : '(محذوفة)'}`,
                `> 👑 <@${room.ownerId}>`,
                `> 🎮 ${room.gameDisplay || room.game}`,
                `> ⏰ ${days}ي ${hours}س متبقية`,
            ].join('\n'),
            inline: true,
        });
    }

    await message.reply({ embeds: [embed] });
}

// ─── إدارة الغرفة ──────────────────────────────────────────────────────────
async function manageRoom(message) {
    const rooms = _loadRooms();
    const myRoom = Object.values(rooms).find(r =>
        r.ownerId === message.author.id && r.guildId === message.guild.id
    );

    if (!myRoom) {
        const embed = new EmbedBuilder()
            .setColor('#E74C3C')
            .setTitle('❌ ليس لديك غرفة')
            .setDescription([
                '> لا تملك غرفة نشطة حالياً!',
                '',
                '> اكتب `غرفة جديدة [اسم] [لعبة]` لإنشاء واحدة',
                `> 💰 **التكلفة:** \`${ROOM_COST.toLocaleString()}\` 💰`,
            ].join('\n'))
            .setTimestamp();
        return message.reply({ embeds: [embed] });
    }

    const ch = message.guild.channels.cache.get(myRoom.channelId);
    const vc = myRoom.voiceChannelId ? message.guild.channels.cache.get(myRoom.voiceChannelId) : null;
    const remaining = Math.max(0, myRoom.expiresAt - Date.now());
    const days = Math.floor(remaining / 86400000);
    const hours = Math.floor((remaining % 86400000) / 3600000);
    const userData = db.getUserData(message.author.id);

    const embed = new EmbedBuilder()
        .setColor(myRoom.gameColor || '#9B59B6')
        .setTitle(`${myRoom.gameEmoji || '🏠'} إدارة غرفتك — ${myRoom.name}`)
        .addFields(
            { name: '📣 القناة النصية',  value: ch ? ch.toString() : '(غير موجودة)', inline: true },
            { name: '🎤 القناة الصوتية', value: vc ? vc.toString() : '(غير موجودة)', inline: true },
            { name: '🎮 اللعبة',          value: myRoom.gameDisplay || myRoom.game, inline: true },
            { name: '⏰ المتبقي',          value: `${days} يوم و ${hours} ساعة`, inline: true },
            { name: '💰 رصيدك',           value: `\`${(userData.balance || 0).toLocaleString()}\` 💰`, inline: true },
            { name: '🔄 تجديد',           value: `\`${ROOM_RENEW_COST.toLocaleString()}\` 💰 (+7 أيام)`, inline: true },
            { name: '🔒 الحالة',           value: myRoom.isLocked ? '🔒 مقفلة' : '🔓 مفتوحة', inline: true },
            { name: '📅 أُنشئت',          value: `<t:${Math.floor(myRoom.createdAt / 1000)}:R>`, inline: true },
        )
        .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`room_renew_${myRoom.id}`)
            .setLabel('🔄 تجديد 7 أيام')
            .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
            .setCustomId(`room_lock_${myRoom.id}`)
            .setLabel(myRoom.isLocked ? '🔓 فتح الغرفة' : '🔒 قفل الغرفة')
            .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
            .setCustomId(`room_info_${myRoom.id}`)
            .setLabel('ℹ️ تفاصيل')
            .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId(`room_delete_${myRoom.id}`)
            .setLabel('🗑️ حذف الغرفة')
            .setStyle(ButtonStyle.Danger),
    );

    await message.reply({ embeds: [embed], components: [row] });
}

// ─── تجديد الغرفة ─────────────────────────────────────────────────────────
async function renewRoom(interaction, roomId) {
    const rooms = _loadRooms();
    const room = rooms[roomId];

    if (!room || room.ownerId !== interaction.user.id) {
        return interaction.reply({ content: '❌ هذه ليست غرفتك!', flags: MessageFlags.Ephemeral });
    }

    const userData = db.getUserData(interaction.user.id);
    if ((userData.balance || 0) < ROOM_RENEW_COST) {
        return interaction.reply({
            content: `❌ رصيدك غير كافٍ! تحتاج \`${ROOM_RENEW_COST.toLocaleString()}\` 💰 للتجديد.\n> رصيدك: \`${(userData.balance || 0).toLocaleString()}\` 💰`,
            flags: MessageFlags.Ephemeral,
        });
    }

    db.removeMoney(interaction.user.id, ROOM_RENEW_COST);
    db.addTransaction(interaction.user.id, 'room_renew', -ROOM_RENEW_COST, `تجديد غرفة: ${room.name}`);

    room.expiresAt = Math.max(room.expiresAt, Date.now()) + ROOM_DURATION;
    _dirty = true;

    await interaction.reply({
        embeds: [new EmbedBuilder()
            .setColor('#2ECC71')
            .setTitle('✅ تم تجديد الغرفة!')
            .setDescription([
                `> 🏠 **الغرفة:** ${room.name}`,
                `> ⏰ **تنتهي الآن في:** <t:${Math.floor(room.expiresAt / 1000)}:R>`,
                `> 💰 **تم خصم:** \`${ROOM_RENEW_COST.toLocaleString()}\` 💰`,
            ].join('\n'))
            .setTimestamp()
        ],
        flags: MessageFlags.Ephemeral,
    });
}

// ─── حذف الغرفة ────────────────────────────────────────────────────────────
async function deleteRoom(message) {
    const rooms = _loadRooms();
    const myRoom = Object.values(rooms).find(r =>
        r.ownerId === message.author.id && r.guildId === message.guild.id
    );

    if (!myRoom) {
        return message.reply('❌ ليس لديك غرفة لحذفها!');
    }

    const ch = message.guild.channels.cache.get(myRoom.channelId);
    const vc = myRoom.voiceChannelId ? message.guild.channels.cache.get(myRoom.voiceChannelId) : null;

    if (ch) await ch.delete('حذف غرفة المستخدم').catch(() => {});
    if (vc) await vc.delete('حذف غرفة المستخدم').catch(() => {});

    delete rooms[myRoom.id];
    _dirty = true;

    await message.reply({
        embeds: [new EmbedBuilder()
            .setColor('#E74C3C')
            .setTitle('🗑️ تم حذف الغرفة')
            .setDescription(`> **تم حذف غرفة \"${myRoom.name}\" بنجاح.**`)
            .setTimestamp()
        ]
    });
}

// ─── تنظيف الغرف المنتهية ──────────────────────────────────────────────────
async function cleanupExpiredRooms(client) {
    const rooms = _loadRooms();
    const now = Date.now();
    let deleted = 0;

    for (const [id, room] of Object.entries(rooms)) {
        if (now > room.expiresAt) {
            try {
                const guild = client.guilds.cache.get(room.guildId);
                if (guild) {
                    const ch = guild.channels.cache.get(room.channelId);
                    const vc = room.voiceChannelId ? guild.channels.cache.get(room.voiceChannelId) : null;
                    if (ch) await ch.delete('انتهت مدة الغرفة').catch(() => {});
                    if (vc) await vc.delete('انتهت مدة الغرفة').catch(() => {});

                    // إشعار المالك
                    const owner = await guild.members.fetch(room.ownerId).catch(() => null);
                    if (owner) {
                        owner.send({
                            embeds: [new EmbedBuilder()
                                .setColor('#E74C3C')
                                .setTitle('⏰ انتهت مدة غرفتك')
                                .setDescription([
                                    `> 🏠 **غرفتك:** ${room.name} في **${guild.name}** قد انتهت مدتها وتم حذفها.`,
                                    '> اكتب `غرفة جديدة` لإنشاء غرفة جديدة.',
                                ].join('\n'))
                                .setTimestamp()
                            ]
                        }).catch(() => {});
                    }
                }
                delete rooms[id];
                _dirty = true;
                deleted++;
            } catch { /* ignore */ }
        }
    }

    if (deleted > 0) console.log(`[RoomCreator] 🗑️ تم حذف ${deleted} غرفة منتهية`);
    return deleted;
}

// ─── معالج الغرف السريعة (من أزرار شرح الغرف) ────────────────────────────
async function handleQuickRoomButton(interaction) {
    const gameKey = interaction.customId.replace('quickroom_', '');
    const gameData = QUICK_GAME_MAP[gameKey];

    if (!gameData) return interaction.reply({ content: '❌ لعبة غير معروفة!', flags: MessageFlags.Ephemeral });

    // نافذة Modal لكتابة اسم الغرفة
    const modal = new ModalBuilder()
        .setCustomId(`quickroom_modal_${gameKey}`)
        .setTitle(`🎮 إنشاء غرفة ${gameData.displayName}`);

    const nameInput = new TextInputBuilder()
        .setCustomId('room_name_input')
        .setLabel('اسم الغرفة')
        .setPlaceholder(`مثال: غرفة الصقور — ${gameData.displayName}`)
        .setStyle(TextInputStyle.Short)
        .setMinLength(2)
        .setMaxLength(30)
        .setRequired(true);

    modal.addComponents(new ActionRowBuilder().addComponents(nameInput));
    await interaction.showModal(modal);
}

// ─── معالج Modal إنشاء الغرفة ────────────────────────────────────────────
async function handleQuickRoomModal(interaction) {
    const gameKey = interaction.customId.replace('quickroom_modal_', '');
    const gameData = QUICK_GAME_MAP[gameKey];
    const roomName = interaction.fields.getTextInputValue('room_name_input');

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    await createRoom(null, roomName, gameData?.key || gameKey, interaction);
}

// ─── معالج التفاعلات الرئيسي ────────────────────────────────────────────────
async function handleRoomInteraction(interaction) {
    const id = interaction.customId;

    // أزرار الغرف السريعة
    if (id.startsWith('quickroom_') && !id.includes('modal')) {
        return handleQuickRoomButton(interaction);
    }

    if (id.startsWith('room_renew_')) {
        const roomId = id.replace('room_renew_', '');
        return renewRoom(interaction, roomId);
    }

    if (id.startsWith('room_delete_')) {
        const roomId = id.replace('room_delete_', '');
        const rooms = _loadRooms();
        const room = rooms[roomId];

        if (!room) return interaction.reply({ content: '❌ الغرفة غير موجودة!', flags: MessageFlags.Ephemeral });

        // التحقق من الملكية أو الإدارة
        const isOwner = room.ownerId === interaction.user.id;
        const isAdmin = interaction.member?.permissions.has(PermissionFlagsBits.Administrator);
        if (!isOwner && !isAdmin) {
            return interaction.reply({ content: '❌ هذه ليست غرفتك!', flags: MessageFlags.Ephemeral });
        }

        // رسالة تأكيد الحذف
        const confirmRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`room_confirm_delete_${roomId}`)
                .setLabel('✅ نعم، احذف')
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId('room_cancel_delete')
                .setLabel('❌ إلغاء')
                .setStyle(ButtonStyle.Secondary),
        );

        return interaction.reply({
            embeds: [new EmbedBuilder()
                .setColor('#E74C3C')
                .setTitle('⚠️ تأكيد الحذف')
                .setDescription(`> هل أنت متأكد من حذف غرفة **${room.name}**؟`)
            ],
            components: [confirmRow],
            flags: MessageFlags.Ephemeral,
        });
    }

    if (id.startsWith('room_confirm_delete_')) {
        const roomId = id.replace('room_confirm_delete_', '');
        const rooms = _loadRooms();
        const room = rooms[roomId];

        if (!room) return interaction.update({ content: '❌ الغرفة غير موجودة!', components: [] });

        const guild = interaction.guild;
        const ch = guild.channels.cache.get(room.channelId);
        const vc = room.voiceChannelId ? guild.channels.cache.get(room.voiceChannelId) : null;

        if (ch) await ch.delete('حذف الغرفة').catch(() => {});
        if (vc) await vc.delete('حذف الغرفة').catch(() => {});

        delete rooms[roomId];
        _dirty = true;

        return interaction.update({
            embeds: [new EmbedBuilder().setColor('#E74C3C').setTitle('🗑️ تم حذف الغرفة').setDescription(`> تم حذف **${room.name}** بنجاح.`)],
            components: [],
        });
    }

    if (id === 'room_cancel_delete') {
        return interaction.update({ content: '❌ تم إلغاء الحذف.', components: [], embeds: [] });
    }

    if (id.startsWith('room_lock_')) {
        const roomId = id.replace('room_lock_', '');
        const rooms = _loadRooms();
        const room = rooms[roomId];

        if (!room || room.ownerId !== interaction.user.id) {
            return interaction.reply({ content: '❌ هذه ليست غرفتك!', flags: MessageFlags.Ephemeral });
        }

        const ch = interaction.guild.channels.cache.get(room.channelId);
        if (!ch) return interaction.reply({ content: '❌ القناة غير موجودة!', flags: MessageFlags.Ephemeral });

        const isLocked = room.isLocked || false;

        await ch.permissionOverwrites.edit(interaction.guild.roles.everyone.id, {
            SendMessages: isLocked ? true : false,
        });

        room.isLocked = !isLocked;
        _dirty = true;

        return interaction.reply({
            embeds: [new EmbedBuilder()
                .setColor(room.isLocked ? '#E74C3C' : '#2ECC71')
                .setTitle(room.isLocked ? '🔒 تم قفل الغرفة!' : '🔓 تم فتح الغرفة!')
                .setDescription(room.isLocked
                    ? '> لا أحد يستطيع الكتابة إلا أنت الآن.'
                    : '> يستطيع الجميع الكتابة الآن.'
                )
                .setTimestamp()
            ],
            flags: MessageFlags.Ephemeral,
        });
    }

    if (id.startsWith('room_info_')) {
        const roomId = id.replace('room_info_', '');
        const rooms = _loadRooms();
        const room = rooms[roomId];

        if (!room) return interaction.reply({ content: '❌ الغرفة غير موجودة!', flags: MessageFlags.Ephemeral });

        const remaining = Math.max(0, room.expiresAt - Date.now());
        const days = Math.floor(remaining / 86400000);
        const hours = Math.floor((remaining % 86400000) / 3600000);

        const embed = new EmbedBuilder()
            .setColor(room.gameColor || '#9B59B6')
            .setTitle(`${room.gameEmoji || '🏠'} معلومات الغرفة`)
            .addFields(
                { name: '🏠 الاسم',    value: room.name, inline: true },
                { name: '🎮 اللعبة',  value: room.gameDisplay || room.game, inline: true },
                { name: '👑 المالك',   value: `<@${room.ownerId}>`, inline: true },
                { name: '⏰ المتبقي',  value: `${days} يوم و ${hours} ساعة`, inline: true },
                { name: '🔒 الحالة',  value: room.isLocked ? '🔒 مقفلة' : '🔓 مفتوحة', inline: true },
                { name: '📅 أُنشئت',  value: `<t:${Math.floor(room.createdAt / 1000)}:R>`, inline: true },
            )
            .setTimestamp();

        return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    }
}

// ─── تصدير الوحدة ──────────────────────────────────────────────────────────
module.exports = {
    name: 'room-creator',
    aliases: ['غرفة جديدة', 'غرفة-جديدة', 'new-room', 'create-room'],
    description: 'إنشاء غرفة مخصصة',
    category: 'غرف',

    async execute(message, args) {
        if (!message.guild) return;

        const content = message.content.toLowerCase().trim();

        if (content === 'غرف' || content === 'rooms') return listRooms(message);
        if (content === 'غرفتي' || content === 'my-room') return manageRoom(message);
        if (content === 'حذف غرفة' || content === 'delete-room') return deleteRoom(message);

        if (content.startsWith('تجديد غرفة') || content.startsWith('renew-room')) {
            const rooms = _loadRooms();
            const myRoom = Object.values(rooms).find(r =>
                r.ownerId === message.author.id && r.guildId === message.guild.id
            );
            if (!myRoom) return message.reply('❌ ليس لديك غرفة للتجديد!');

            const userData = db.getUserData(message.author.id);
            if ((userData.balance || 0) < ROOM_RENEW_COST) {
                return message.reply(`❌ تحتاج \`${ROOM_RENEW_COST.toLocaleString()}\` 💰 للتجديد! رصيدك: \`${(userData.balance || 0).toLocaleString()}\` 💰`);
            }

            db.removeMoney(message.author.id, ROOM_RENEW_COST);
            db.addTransaction(message.author.id, 'room_renew', -ROOM_RENEW_COST, `تجديد غرفة: ${myRoom.name}`);
            myRoom.expiresAt = Math.max(myRoom.expiresAt, Date.now()) + ROOM_DURATION;
            _dirty = true;

            return message.reply({
                embeds: [new EmbedBuilder()
                    .setColor('#2ECC71')
                    .setTitle('✅ تم تجديد الغرفة!')
                    .setDescription([
                        `> 🏠 **الغرفة:** ${myRoom.name}`,
                        `> ⏰ **تنتهي الآن في:** <t:${Math.floor(myRoom.expiresAt / 1000)}:R>`,
                    ].join('\n'))
                    .setTimestamp()
                ]
            });
        }

        // إنشاء غرفة جديدة
        const fullText = args.join(' ');
        let roomName = fullText;
        let gameName = '';

        for (const key of Object.keys(SUPPORTED_GAMES)) {
            if (fullText.toLowerCase().includes(key)) {
                gameName = key;
                roomName = fullText.toLowerCase().replace(key, '').trim();
                break;
            }
        }

        if (!roomName.trim()) roomName = `غرفة ${message.author.displayName}`;
        await createRoom(message, roomName, gameName);
    },

    // دوال مُصدَّرة
    createRoom,
    listRooms,
    manageRoom,
    deleteRoom,
    renewRoom,
    handleRoomInteraction,
    handleQuickRoomModal,
    cleanupExpiredRooms,
    ROOM_COST,
    ROOM_RENEW_COST,
    SUPPORTED_GAMES,
    QUICK_GAME_MAP,
};
