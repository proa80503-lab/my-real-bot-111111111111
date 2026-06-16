const { Events } = require('discord.js');
const logger = require('../utils/logger');
const securityMonitor = require('../utils/security-monitor');

module.exports = {
    name: Events.GuildMemberUpdate,
    async execute(oldMember, newMember) {
        // تسجيل تعديلات العضو (رولات، اسم مستعار)
        await logger.logMemberUpdate(oldMember, newMember);

        // تسجيل Timeout إذا تغيّر
        if (oldMember.communicationDisabledUntil !== newMember.communicationDisabledUntil) {
            await logger.logTimeout(oldMember, newMember);
        }

        // كشف Permission Escalation: منح رتب خطيرة
        const addedRoles = newMember.roles.cache.filter(r => !oldMember.roles.cache.has(r.id));
        if (addedRoles.size > 0) {
            const auditLogs = await newMember.guild.fetchAuditLogs({ limit: 1, type: 25 }).catch(() => null);
            const executor = auditLogs?.entries.first()?.executor;

            for (const [, role] of addedRoles) {
                await securityMonitor.checkPermissionEscalation(newMember.guild, role, executor);
            }
        }
    },
};
