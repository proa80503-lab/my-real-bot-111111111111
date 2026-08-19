const fs = require('fs');
const path = require('path');

const CLANS_FILE = path.join(__dirname, '../data/clans.json');

// نظام إدارة الكلانات
class ClanManager {
    constructor() {
        this.clans = this.loadClans();
    }

    loadClans() {
        try {
            if (!fs.existsSync(CLANS_FILE)) {
                const dir = path.dirname(CLANS_FILE);
                if (!fs.existsSync(dir)) {
                    fs.mkdirSync(dir, { recursive: true });
                }
                const defaultData = {};
                fs.writeFileSync(CLANS_FILE, JSON.stringify(defaultData, null, 2));
                return defaultData;
            }
            const data = fs.readFileSync(CLANS_FILE, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            console.error('خطأ في تحميل clans.json:', error);
            return {};
        }
    }

    saveClans() {
        try {
            fs.writeFileSync(CLANS_FILE, JSON.stringify(this.clans, null, 2));
        } catch (error) {
            console.error('خطأ في حفظ clans.json:', error);
        }
    }

    // تهيئة السيرفر
    initGuild(guildId) {
        if (!this.clans[guildId]) {
            this.clans[guildId] = {
                clans: {},
                members: {},
                channelId: null,
                roles: {
                    leader: null,
                    deputy: null,
                    officer: null,
                    member: null
                },
                nextClanId: 1
            };
            this.saveClans();
        } else {
            // إصلاح بنية البيانات إذا كانت ناقصة
            let repaired = false;
            if (!this.clans[guildId].clans) {
                this.clans[guildId].clans = {};
                repaired = true;
            }
            if (!this.clans[guildId].members) {
                this.clans[guildId].members = {};
                repaired = true;
            }
            if (!this.clans[guildId].nextClanId) {
                const ids = Object.keys(this.clans[guildId].clans)
                    .map(k => parseInt(k.replace('clan_', '')) || 0);
                this.clans[guildId].nextClanId = (ids.length ? Math.max(...ids) : 0) + 1;
                repaired = true;
            }
            if (repaired) this.saveClans();
        }
        return this.clans[guildId];
    }

    // التحقق من وجود الاسم
    nameExists(guildId, name) {
        const guildData = this.clans[guildId];
        if (!guildData) return false;
        return Object.values(guildData.clans).some(c => c.name === name);
    }

    // إنشاء كلان
    createClan(guildId, userId, name, tag) {
        const guildData = this.initGuild(guildId);

        // التحقق من الاسم
        if (this.nameExists(guildId, name)) {
            return { success: false, error: 'يوجد كلان آخر بنفس الاسم! اختر اسماً مميزاً.' };
        }

        // التحقق من أن المستخدم ليس في كلان
        if (guildData.members[userId]) {
            return { success: false, error: 'أنت بالفعل في كلان!' };
        }

        const clanId = `clan_${guildData.nextClanId++}`;

        guildData.clans[clanId] = {
            id: clanId,
            name: name,
            tag: tag || null,
            leaderId: userId,
            roles: {     // استبدال roleId بـ roles object
                leader: null,
                deputy: null,
                officer: null,
                member: null
            },
            categoryId: null,   // معرف التصنيف
            textChannelId: null, // معرف الشات الكتابي
            adminChannelId: null, // معرف روم التحكم
            voiceChannelId: null, // معرف الروم الصوتي
            deputies: [],
            officers: [],
            members: [],
            createdAt: Date.now(),
            description: 'كلان جديد',
            stats: {
                totalMembers: 1,
                level: 1
            }
        };

        guildData.members[userId] = clanId;
        this.saveClans();

        return { success: true, clanId: clanId, clan: guildData.clans[clanId] };
    }

    // الحصول على كلان المستخدم
    getUserClan(guildId, userId) {
        const guildData = this.clans[guildId];
        if (!guildData || !guildData.clans || !guildData.members) return null;

        let clanId = guildData.members[userId];

        // ── إصلاح: إذا القائد غير مسجل في members لكنه فعلياً قائد لكلان ──
        if (!clanId) {
            const leaderClan = Object.values(guildData.clans).find(c => c.leaderId === userId);
            if (leaderClan) {
                // تسجيله تلقائياً وإصلاح البيانات
                guildData.members[userId] = leaderClan.id;
                this.saveClans();
                return leaderClan;
            }
            return null;
        }

        // التحقق من أن الكلان ما زال موجوداً
        if (!guildData.clans[clanId]) {
            // تنظيف البيانات التالفة (Orphaned Record)
            delete guildData.members[userId];
            this.saveClans();
            return null;
        }

        return guildData.clans[clanId];
    }

    // الحصول على كلان بالـ ID
    getClan(guildId, clanId) {
        const guildData = this.clans[guildId];
        if (!guildData) return null;
        return guildData.clans[clanId];
    }

    // الحصول على رتبة المستخدم في الكلان
    getMemberRank(guildId, userId) {
        const clan = this.getUserClan(guildId, userId);
        if (!clan) return null;

        if (clan.leaderId === userId) return 'leader';
        if (clan.deputies.includes(userId)) return 'deputy';
        if (clan.officers.includes(userId)) return 'officer';
        if (clan.members.includes(userId)) return 'member';

        return null;
    }

    // التحقق من الصلاحية
    hasPermission(guildId, userId, permission) {
        const rank = this.getMemberRank(guildId, userId);
        if (!rank) return false;

        const permissions = {
            leader: ['*'],
            deputy: ['invite', 'kick', 'promote_officer', 'demote', 'accept'],
            officer: ['invite', 'accept'],
            member: ['view', 'chat']
        };

        const userPerms = permissions[rank] || [];
        return userPerms.includes('*') || userPerms.includes(permission);
    }

    // دعوة عضو
    inviteMember(guildId, clanId, inviterId, targetId) {
        const guildData = this.clans[guildId];
        if (!guildData) return { success: false, error: 'خطأ في السيرفر' };

        // التحقق من الصلاحيات
        if (!this.hasPermission(guildId, inviterId, 'invite')) {
            return { success: false, error: 'ليس لديك صلاحية دعوة أعضاء!' };
        }

        // التحقق من أن الهدف ليس في كلان
        if (guildData.members[targetId]) {
            return { success: false, error: 'هذا العضو بالفعل في كلان!' };
        }

        return { success: true };
    }

    // إضافة عضو
    addMember(guildId, clanId, userId, rank = 'member') {
        const guildData = this.clans[guildId];
        if (!guildData) return { success: false, error: 'خطأ في السيرفر' };

        const clan = guildData.clans[clanId];
        if (!clan) return { success: false, error: 'الكلان غير موجود!' };

        // التحقق من أن العضو ليس في كلان
        if (guildData.members[userId]) {
            return { success: false, error: 'العضو بالفعل في كلان!' };
        }

        // إضافة للرتبة المناسبة
        if (rank === 'deputy') {
            clan.deputies.push(userId);
        } else if (rank === 'officer') {
            clan.officers.push(userId);
        } else {
            clan.members.push(userId);
        }

        guildData.members[userId] = clanId;
        clan.stats.totalMembers++;
        this.saveClans();

        return { success: true };
    }

    // طرد عضو
    kickMember(guildId, clanId, kickerId, targetId) {
        const guildData = this.clans[guildId];
        if (!guildData) return { success: false, error: 'خطأ في السيرفر' };

        // التحقق من الصلاحيات
        if (!this.hasPermission(guildId, kickerId, 'kick')) {
            return { success: false, error: 'ليس لديك صلاحية طرد أعضاء!' };
        }

        const clan = guildData.clans[clanId];
        if (!clan) return { success: false, error: 'الكلان غير موجود!' };

        // لا يمكن طرد القائد
        if (clan.leaderId === targetId) {
            return { success: false, error: 'لا يمكن طرد القائد!' };
        }

        // حذف من الرتبة
        clan.deputies = clan.deputies.filter(id => id !== targetId);
        clan.officers = clan.officers.filter(id => id !== targetId);
        clan.members = clan.members.filter(id => id !== targetId);

        delete guildData.members[targetId];
        clan.stats.totalMembers--;
        this.saveClans();

        return { success: true };
    }

    // ترقية عضو
    promoteMember(guildId, clanId, promoterId, targetId, newRank) {
        const guildData = this.clans[guildId];
        if (!guildData) return { success: false, error: 'خطأ في السيرفر' };

        const clan = guildData.clans[clanId];
        if (!clan) return { success: false, error: 'الكلان غير موجود!' };

        const currentRank = this.getMemberRank(guildId, targetId);
        if (!currentRank) return { success: false, error: 'العضو ليس في الكلان!' };

        // حذف من الرتبة الحالية
        clan.deputies = clan.deputies.filter(id => id !== targetId);
        clan.officers = clan.officers.filter(id => id !== targetId);
        clan.members = clan.members.filter(id => id !== targetId);

        // إضافة للرتبة الجديدة
        if (newRank === 'deputy') {
            clan.deputies.push(targetId);
        } else if (newRank === 'officer') {
            clan.officers.push(targetId);
        } else {
            clan.members.push(targetId);
        }

        this.saveClans();
        return { success: true };
    }

    // حل الكلان
    dissolveClan(guildId, clanId, userId) {
        const guildData = this.clans[guildId];
        if (!guildData) return { success: false, error: 'خطأ في السيرفر' };

        const clan = guildData.clans[clanId];
        if (!clan) return { success: false, error: 'الكلان غير موجود!' };

        // فقط القائد يمكنه حل الكلان
        if (clan.leaderId !== userId) {
            return { success: false, error: 'فقط القائد يمكنه حل الكلان!' };
        }

        // حذف جميع الأعضاء
        const allMembers = [clan.leaderId, ...clan.deputies, ...clan.officers, ...clan.members];
        allMembers.forEach(memberId => {
            delete guildData.members[memberId];
        });

        delete guildData.clans[clanId];
        this.saveClans();

        return { success: true, members: allMembers };
    }

    // تحديث معرفات الموارد (رول، قنوات)
    updateClanAssets(guildId, clanId, assets) {
        const guildData = this.clans[guildId];
        if (!guildData) return false;

        const clan = guildData.clans[clanId];
        if (!clan) return false;

        if (assets.roles !== undefined) clan.roles = { ...clan.roles, ...assets.roles }; // دمج الرتب
        if (assets.categoryId !== undefined) clan.categoryId = assets.categoryId;
        if (assets.textChannelId !== undefined) clan.textChannelId = assets.textChannelId;
        if (assets.adminChannelId !== undefined) clan.adminChannelId = assets.adminChannelId;
        if (assets.voiceChannelId !== undefined) clan.voiceChannelId = assets.voiceChannelId;

        this.saveClans();
        return true;
    }

    // الحصول على جميع كلانات السيرفر
    getAllClans(guildId) {
        const guildData = this.clans[guildId];
        if (!guildData || !guildData.clans) return [];
        return Object.values(guildData.clans);
    }
    // مسح بيانات السيرفر بالكامل (Nuke)
    clearGuild(guildId) {
        if (this.clans[guildId]) {
            delete this.clans[guildId];
            this.saveClans();
            return true;
        }
        return false;
    }
}

module.exports = new ClanManager();
