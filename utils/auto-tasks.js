const { EmbedBuilder } = require('discord.js');
const db = require('./database');
const { PremiumEmbedBuilder } = require('./embed-builder');

// مهام تلقائية ذكية

// 1. Daily Birthday Announcements
async function checkBirthdays(client) {
    // يتم الفحص يومياً
    setInterval(async () => {
        const today = new Date();
        const todayStr = `${today.getMonth() + 1}-${today.getDate()}`;

        for (const guild of client.guilds.cache.values()) {
            const birthdayChannel = guild.channels.cache.find(ch => ch.name === '🎂┃birthdays');
            if (!birthdayChannel) continue;

            for (const [id, member] of guild.members.cache) {
                const userData = db.getUserData(id);
                if (userData.birthday === todayStr) {
                    const embed = PremiumEmbedBuilder.custom({
                        color: '#FF69B4',
                        title: '🎉 عيد ميلاد سعيد!',
                        description: `عيد ميلاد سعيد ${member}! 🎂🎈`
                    });

                    await birthdayChannel.send({ content: `${member}`, embeds: [embed] });

                    // مكافأة
                    userData.balance += 5000;
                    db.updateUserData(id, userData);
                }
            }
        }
    }, 24 * 60 * 60 * 1000); // كل 24 ساعة
}

// 2. Auto-Backup - نسخ احتياطي تلقائي
const fs = require('fs');
const path = require('path');

function autoBackup() {
    setInterval(() => {
        const dbPath = path.join(__dirname, '../data/database.json');
        const backupPath = path.join(__dirname, `../data/backup-${Date.now()}.json`);

        try {
            fs.copyFileSync(dbPath, backupPath);
            console.log('✅ تم إنشاء نسخة احتياطية');

            // حذف النسخ القديمة (أكثر من 7 أيام)
            const backupDir = path.join(__dirname, '../data');
            const files = fs.readdirSync(backupDir);
            const now = Date.now();

            files.forEach(file => {
                if (file.startsWith('backup-')) {
                    const timestamp = parseInt(file.split('-')[1].split('.')[0]);
                    if (now - timestamp > 7 * 24 * 60 * 60 * 1000) {
                        fs.unlinkSync(path.join(backupDir, file));
                    }
                }
            });
        } catch (error) {
            console.error('خطأ في النسخ الاحتياطي:', error);
        }
    }, 24 * 60 * 60 * 1000); // كل 24 ساعة
}

// 3. Inactive Cleanup - تنظيف الأعضاء غير النشطين
async function cleanupInactive(guild) {
    const members = await guild.members.fetch();
    const inactiveThreshold = 30 * 24 * 60 * 60 * 1000; // 30 يوم
    let removed = 0;

    for (const [id, member] of members) {
        if (member.user.bot) continue;

        const userData = db.getUserData(id);
        const lastActive = userData.lastActive || 0;

        if (Date.now() - lastActive > inactiveThreshold) {
            try {
                await member.kick('غير نشط لمدة 30+ يوم');
                removed++;
            } catch (error) { }
        }
    }

    return removed;
}

// 4. Auto-Role based on Level
async function autoRoleByLevel(member, level) {
    const guild = member.guild;

    const levelRoles = {
        10: 'مبتدئ',
        25: 'متوسط',
        50: 'متقدم',
        75: 'خبير',
        100: 'أسطورة'
    };

    for (const [requiredLevel, roleName] of Object.entries(levelRoles)) {
        const role = guild.roles.cache.find(r => r.name === roleName);
        if (!role) continue;

        if (level >= parseInt(requiredLevel)) {
            if (!member.roles.cache.has(role.id)) {
                await member.roles.add(role);
            }
        }
    }
}

// 5. Enhanced Welcome/Leave Messages
async function enhancedWelcome(member) {
    const welcomeChannel = member.guild.channels.cache.find(ch => ch.name === '👋┃welcome');
    if (!welcomeChannel) return;

    const memberCount = member.guild.memberCount;
    const accountAge = Math.floor((Date.now() - member.user.createdTimestamp) / (24 * 60 * 60 * 1000));

    const embed = PremiumEmbedBuilder.custom({
        color: '#2ECC71',
        title: '🎉 عضو جديد!',
        description: `مرحباً ${member}! أنت العضو رقم **${memberCount}**`,
        fields: [
            { name: '📅 عمر الحساب', value: `${accountAge} يوم`, inline: true },
            { name: '🎁 مكافأة', value: '1000 عملة', inline: true }
        ],
        thumbnail: member.user.displayAvatarURL()
    });

    await welcomeChannel.send({ embeds: [embed] });

    // مكافأة انضمام
    const userData = db.getUserData(member.id);
    userData.balance += 1000;
    db.updateUserData(member.id, userData);
}

async function enhancedLeave(member) {
    const leaveChannel = member.guild.channels.cache.find(ch => ch.name === '👋┃goodbye');
    if (!leaveChannel) return;

    const userData = db.getUserData(member.id);
    const memberSince = Math.floor((Date.now() - member.joinedTimestamp) / (24 * 60 * 60 * 1000));

    const embed = PremiumEmbedBuilder.custom({
        color: '#E74C3C',
        title: '👋 عضو غادر',
        description: `وداعاً ${member.user.tag}`,
        fields: [
            { name: '⏱️ كان معنا', value: `${memberSince} يوم` },
            { name: '📊 المستوى', value: `${userData.level || 1}` }
        ]
    });

    await leaveChannel.send({ embeds: [embed] });
}

// 6. Server Stats Auto-Update
async function updateServerStats(guild) {
    const statsChannel = guild.channels.cache.find(ch => ch.name === '📊┃stats');
    if (!statsChannel) return;

    const members = await guild.members.fetch();
    const botCount = members.filter(m => m.user.bot).size;
    const humanCount = members.size - botCount;
    const onlineCount = members.filter(m => m.presence?.status === 'online').size;

    const embed = PremiumEmbedBuilder.info(
        '📊 إحصائيات السيرفر (محدّثة)',
        null,
        [
            { name: 'الأعضاء', value: `${members.size}`, inline: true },
            { name: 'البشر', value: `${humanCount}`, inline: true },
            { name: 'البوتات', value: `${botCount}`, inline: true },
            { name: 'المتصلين', value: `${onlineCount}`, inline: true }
        ]
    );

    embed.setTimestamp();

    const messages = await statsChannel.messages.fetch({ limit: 1 });
    const lastMessage = messages.first();

    if (lastMessage && lastMessage.author.bot) {
        await lastMessage.edit({ embeds: [embed] });
    } else {
        await statsChannel.send({ embeds: [embed] });
    }
}

const randomInteractions = require('./random-interactions');

// ─── 7. تنظيف الغرف المنتهية ────────────────────────────────────────────────
async function cleanupExpiredRooms(client) {
    try {
        const roomCreator = require('../commands/moderation/room-creator');
        const deleted = await roomCreator.cleanupExpiredRooms(client);
        if (deleted > 0) console.log(`[AutoTask] 🗑️ ${deleted} غرفة منتهية حذفت`);
    } catch { /* ignore */ }
}

// ─── 8. تذكير اليومي ─────────────────────────────────────────────────────────
async function remindDailyReward(client) {
    const cfg = require('../config');
    if (cfg.autoMessagesEnabled === false) return;
    const { EmbedBuilder } = require('discord.js');
    const now = new Date();

    // الإرسال فقط عند الساعة 9 صباحاً
    if (now.getHours() !== 9 || now.getMinutes() > 5) return;

    for (const guild of client.guilds.cache.values()) {
        const guildData = db.getGuildData(guild.id);
        const botChannel = guild.channels.cache.get(guildData.botChannel) ||
            guild.channels.cache.find(c => c.name.includes('أوامر-البوت'));

        if (!botChannel) continue;

        const embed = new EmbedBuilder()
            .setColor('#FFD700')
            .setTitle('☀️ صباح الخير!')
            .setDescription([
                '> 🌟 **بداية يوم جديد!**',
                '> 🏆 لا تنس مكافأتك اليومية!',
                '',
                '‏💰 اكتب `يومي` لأخذ مكافأتك اليومية',
                '🕒 اكتب `عمل` لكسب عملات إضافية',
                '📅 اكتب `تحديات` لرؤية تحديات اليوم',
            ].join('\n'))
            .setTimestamp();

        await botChannel.send({ embeds: [embed] }).catch(() => {});
    }
}

// ─── 9. ملخص نشاط السيرفر المسائي ────────────────────────────────────────────
async function dailySummary(client) {
    const cfg = require('../config');
    if (cfg.autoMessagesEnabled === false) return;
    const { EmbedBuilder } = require('discord.js');
    const aiBrain = require('./ai-brain');
    const now = new Date();

    // الإرسال فقط عند الساعة 9 مساءً
    if (now.getHours() !== 21 || now.getMinutes() > 5) return;

    for (const guild of client.guilds.cache.values()) {
        const guildData = db.getGuildData(guild.id);
        const botChannel = guild.channels.cache.get(guildData.botChannel) ||
            guild.channels.cache.find(c => c.name.includes('أوامر-البوت'));

        if (!botChannel) continue;

        const stats = aiBrain.getServerStats();
        const topUsers = aiBrain.getTopUsers(3);

        const embed = new EmbedBuilder()
            .setColor('#2C3E50')
            .setTitle('🌙 خلاصة نشاط اليوم')
            .setDescription('> ملخص ما حدث اليوم في سيرفرنا! 📊')
            .addFields(
                { name: '💬 إجمالي الرسائل', value: `\`${stats.totalMessages.toLocaleString()}\``, inline: true },
                { name: '👥 المستخدمون', value: `\`${stats.totalUsers}\``, inline: true },
                { name: '📝 الموضوع الأشهر', value: stats.topTopic, inline: true },
                {
                    name: '🏆 أكثر الأعضاء نشاطاً',
                    value: topUsers.map((u, i) => `\`${i + 1}.\` <@${u.id}> — \`${u.count}\` رسالة`).join('\n') || 'لا يوجد بيانات بعد',
                    inline: false,
                }
            )
            .setFooter({ text: '🤖 ملخص يومي تلقائي' })
            .setTimestamp();

        await botChannel.send({ embeds: [embed] }).catch(() => {});
    }
}


function initializeAutoTasks(client) {
    console.log('🤖 بدء المهام التلقائية...');

    // Birthday checks
    checkBirthdays(client);

    // Auto-backup
    autoBackup();

    // Server stats update (كل 10 دقائق)
    setInterval(() => {
        client.guilds.cache.forEach(guild => {
            updateServerStats(guild).catch(() => {});
        });
    }, 10 * 60 * 1000);

    // ─── تنظيف الغرف المنتهية (كل ساعة) ───────────────────────────────────
    setInterval(() => {
        cleanupExpiredRooms(client).catch(() => {});
    }, 60 * 60 * 1000);

    // ─── التذكير اليومي + الملخص المسائي (كل 5 دقائق للتحقق من الوقت) ───
    setInterval(() => {
        remindDailyReward(client).catch(() => {});
        dailySummary(client).catch(() => {});
    }, 5 * 60 * 1000);

    // تفاعلات عشوائية
    randomInteractions.initialize(client);

    console.log('✅ [AutoTasks] جميع المهام التلقائية نشطة:');
    console.log('   🕐 تنظيف الغرف المنتهية: كل ساعة');
    console.log('   ☀️ التذكير اليومي: 9 صباحاً');
    console.log('   🌙 الملخص المسائي: 9 مساءً');
    console.log('   💾 النسخ الاحتياطي: يومياً');
}

module.exports = {
    initializeAutoTasks,
    checkBirthdays,
    autoBackup,
    cleanupInactive,
    autoRoleByLevel,
    enhancedWelcome,
    enhancedLeave,
    updateServerStats,
    cleanupExpiredRooms,
    remindDailyReward,
    dailySummary,
};
