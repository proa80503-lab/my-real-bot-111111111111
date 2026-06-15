const { Events } = require('discord.js');
const welcome = require('../utils/welcome');
const protection = require('../utils/protection');
const logger = require('../utils/logger');
const securityMonitor = require('../utils/security-monitor');

module.exports = {
    name: Events.GuildMemberAdd,
    async execute(member) {
        // 1. فحص البوتات الجديدة
        if (member.user.bot) {
            await securityMonitor.checkSuspiciousBot(member);
            return; // البوتات لا تحتاج ترحيب
        }

        // 2. فحص عمر الحساب (anti-raid)
        const kicked = await protection.checkAccountAge(member);
        if (kicked) return;

        // 3. فحص الـ Anti-Raid العام
        await protection.checkRaid(member);

        // 4. ترحيب
        await welcome.sendWelcome(member);

        // 5. تسجيل
        await logger.logMemberJoin(member);
    },
};
