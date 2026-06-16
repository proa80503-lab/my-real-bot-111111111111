const { ChannelType, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const clanManager = require('./clan-manager');

// إنشاء أصول الكلان (رول، قنوات)
// إنشاء أصول الكلان (رول، قنوات)
async function createClanAssets(guild, clan, leaderMember) {
    let createdChannels = { category: null, text: null, admin: null, voice: null };
    let currentStep = 'Start'; // لتتبع مكان الخطأ

    try {
        const botId = guild.client.user.id;

        // 1. إنشاء الرتب المخصصة
        currentStep = 'Creating Leader Role';
        const createdRoles = {};

        createdRoles.leader = await guild.roles.create({
            name: `👑 ${clan.name} - قائد`,
            color: '#FFD700',
            reason: `Clan Leader Role`
        });

        currentStep = 'Creating Deputy Role';
        createdRoles.deputy = await guild.roles.create({
            name: `⭐ ${clan.name} - نائب`,
            color: '#00BFFF',
            reason: `Clan Deputy Role`
        });

        currentStep = 'Creating Officer Role';
        createdRoles.officer = await guild.roles.create({
            name: `🎖️ ${clan.name} - ضابط`,
            color: '#32CD32',
            reason: `Clan Officer Role`
        });

        currentStep = 'Creating Member Role';
        createdRoles.member = await guild.roles.create({
            name: `🛡️ ${clan.name} - جندي`,
            color: '#808080',
            reason: `Clan Member Role`
        });

        currentStep = 'Assigning Roles to Leader';
        // إعطاء رتبة القائد (والعضو أيضاً لتوحيد الوصول) للعضو المؤسس
        await leaderMember.roles.add([createdRoles.leader, createdRoles.member]).catch((e) => {
            console.warn(`Failed to assign roles to leader: ${e.message}`);
            // لا نوقف العملية هنا، فقط تحذير
        });

        // 2. إنشاء التصنيف (Category)
        currentStep = 'Creating Category Channel';
        const category = await guild.channels.create({
            name: `🏰・${clan.name}`,
            type: ChannelType.GuildCategory,
            permissionOverwrites: [
                {
                    id: guild.id,
                    deny: [PermissionFlagsBits.ViewChannel],
                },
                {
                    id: createdRoles.member.id,
                    allow: [PermissionFlagsBits.ViewChannel],
                },
                {
                    id: botId,
                    allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.Connect, PermissionFlagsBits.ManageChannels, PermissionFlagsBits.ManageRoles]
                }
            ]
        });
        createdChannels.category = category;

        // 3. إنشاء الشات الكتابي
        currentStep = 'Creating Text Channel';
        try {
            const textChannel = await guild.channels.create({
                name: `💬・شات-${clan.name}`,
                type: ChannelType.GuildText,
                parent: category.id
            });
            await textChannel.lockPermissions().catch(() => { });
            createdChannels.text = textChannel;
        } catch (e) { console.error('Error creating text channel:', e); }

        // 4. إنشاء روم التحكم (سري للإدارة فقط)
        currentStep = 'Creating Admin Channel';
        try {
            const adminChannel = await guild.channels.create({
                name: `⚙️・إدارة-${clan.name}`,
                type: ChannelType.GuildText,
                parent: category.id,
                permissionOverwrites: [
                    { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] }, // إخفاء عن الجميع
                    { id: createdRoles.member.id, allow: [PermissionFlagsBits.ViewChannel], deny: [PermissionFlagsBits.SendMessages] }, // الأعضاء يرونه لكن لا يكتبون
                    { id: createdRoles.officer.id, allow: [PermissionFlagsBits.ViewChannel], deny: [PermissionFlagsBits.SendMessages] },
                    { id: createdRoles.deputy.id, allow: [PermissionFlagsBits.ViewChannel], deny: [PermissionFlagsBits.SendMessages] },
                    { id: createdRoles.leader.id, allow: [PermissionFlagsBits.ViewChannel], deny: [PermissionFlagsBits.SendMessages] }, // حتى القائد لا يكتب، فقط أزرار
                    { id: botId, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks] }
                ]
            });
            createdChannels.admin = adminChannel;
        } catch (e) { console.error('Error creating admin channel:', e); }

        // 5. إنشاء الروم الصوتي
        currentStep = 'Creating Voice Channel';
        try {
            const voiceChannel = await guild.channels.create({
                name: `🔊・${clan.name}`,
                type: ChannelType.GuildVoice,
                parent: category.id,
                permissionOverwrites: [
                    { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                    { id: createdRoles.member.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect, PermissionFlagsBits.Speak] },
                    { id: botId, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect, PermissionFlagsBits.ManageChannels] }
                ]
            });
            createdChannels.voice = voiceChannel;
        } catch (e) { console.error('Error creating voice channel:', e); }

        // 6. حفظ المعرفات
        currentStep = 'Saving Assets to DB';
        clanManager.updateClanAssets(guild.id, clan.id, {
            roles: {
                leader: createdRoles.leader.id,
                deputy: createdRoles.deputy.id,
                officer: createdRoles.officer.id,
                member: createdRoles.member.id
            },
            categoryId: category ? category.id : null,
            textChannelId: createdChannels.text ? createdChannels.text.id : null,
            adminChannelId: createdChannels.admin ? createdChannels.admin.id : null,
            voiceChannelId: createdChannels.voice ? createdChannels.voice.id : null
        });

        // 7. إرسال لوحة التحكم
        currentStep = 'Sending Dashboard';
        if (createdChannels.admin) {
            await sendClanDashboard(createdChannels.admin, clan);
        }

        return { success: true, textChannel: createdChannels.text || createdChannels.admin };

    } catch (error) {
        console.error(`Create Clan Assets Error at step [${currentStep}]:`, error);

        if (error.code === 50013) {
            return { success: false, error: `البوت لا يملك صلاحيات كافية (Missing Permissions)! فشل أثناء: **${currentStep}**.` };
        }
        return { success: false, error: `خطأ غير متوقع (${error.message}) أثناء: **${currentStep}**` };
    }
}

// إرسال لوحة التحكم المصغرة في شات الكلان (روم التحكم)
async function sendClanDashboard(channel, clan) {
    // حاولنا نجعل الرسالة جذابة
    const embed = new EmbedBuilder()
        .setColor('#2B2D31')
        .setTitle(`🏰 لوحة إدارة كلان ${clan.name}`)
        .setDescription(`
**أهلاً بك في غرفة القيادة!** 🛡️
هنا يمكنك التحكم في إعدادات الكلان وإدارة الأعضاء.

👑 **الصلاحيات:** للقائد والنواب فقط (حسب الأزرار).
🔇 **الشات:** للقراءة فقط، استخدم الأزرار للتفاعل.
        `)
        .addFields(
            { name: '📊 الأعضاء', value: `${clan.stats.totalMembers}`, inline: true },
            { name: '⭐ المستوى', value: `${clan.stats.level}`, inline: true },
            { name: '📅 تاريخ الإنشاء', value: `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: true }
        )
        .setThumbnail('https://cdn-icons-png.flaticon.com/512/681/681392.png') // أيقونة قلعة
        .setFooter({ text: 'نظام إدارة الكلانات الذكي' })
        .setTimestamp();

    const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`clan_invite_btn`).setLabel('دعوة عضو').setStyle(ButtonStyle.Success).setEmoji('📨'),
        new ButtonBuilder().setCustomId(`clan_kick_btn`).setLabel('طرد عضو').setStyle(ButtonStyle.Danger).setEmoji('👢'),
        new ButtonBuilder().setCustomId(`clan_edit_rank_btn`).setLabel('تعديل رتبة').setStyle(ButtonStyle.Primary).setEmoji('🎖️'),
        new ButtonBuilder().setCustomId(`clan_confirm_delete`).setLabel('حذف الكلان').setStyle(ButtonStyle.Danger).setEmoji('❌')
    );

    const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`clan_rename_btn`).setLabel('تغيير الاسم').setStyle(ButtonStyle.Primary).setEmoji('✏️'),
        new ButtonBuilder().setCustomId(`clan_desc_btn`).setLabel('تغيير الوصف').setStyle(ButtonStyle.Primary).setEmoji('📝')
    );

    const msg = await channel.send({ embeds: [embed], components: [row1, row2] });
    await msg.pin().catch(() => { }); // تثبيت الرسالة
}

// حذف أصول الكلان
async function deleteClanAssets(guild, clan) {
    try {
        if (clan.textChannelId) await guild.channels.delete(clan.textChannelId).catch(() => { });
        if (clan.adminChannelId) await guild.channels.delete(clan.adminChannelId).catch(() => { });
        if (clan.voiceChannelId) await guild.channels.delete(clan.voiceChannelId).catch(() => { });
        if (clan.categoryId) await guild.channels.delete(clan.categoryId).catch(() => { });

        // حذف الرتب المخصصة
        if (clan.roles) {
            for (const roleId of Object.values(clan.roles)) {
                if (roleId) await guild.roles.delete(roleId).catch(() => { });
            }
        } else if (clan.roleId) { // دعمLegacy
            await guild.roles.delete(clan.roleId).catch(() => { });
        }

        return true;
    } catch (error) {
        console.error('Delete Clan Assets Error:', error);
        return false;
    }
}

// إدارة الرولات للأعضاء
// rank: 'leader', 'deputy', 'officer', 'member'
async function addMemberRole(guild, memberId, clan, rank = 'member') {
    if (!clan.roles) return; // النظام القديم

    const member = await guild.members.fetch(memberId).catch(() => null);
    if (!member) return;

    // إضافة رتبة العضو (جندي) دائماً + الرتبة المحددة
    const rolesToAdd = [];
    if (clan.roles.member) rolesToAdd.push(clan.roles.member); // رول الجندي الأساسي

    if (rank !== 'member' && clan.roles[rank]) {
        rolesToAdd.push(clan.roles[rank]);
    }

    if (rolesToAdd.length > 0) {
        await member.roles.add(rolesToAdd).catch(() => { });
    }
}

async function removeMemberRole(guild, memberId, clan) {
    if (!clan.roles) return;
    const member = await guild.members.fetch(memberId).catch(() => null);
    if (!member) return;

    // إزالة جميع رولات هذا الكلان
    const rolesToRemove = Object.values(clan.roles).filter(Boolean);
    await member.roles.remove(rolesToRemove).catch(() => { });
}

module.exports = {
    createClanAssets,
    deleteClanAssets,
    addMemberRole,
    removeMemberRole
};
