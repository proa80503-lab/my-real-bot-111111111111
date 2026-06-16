const { Events } = require('discord.js');
const logger = require('../utils/logger');
const securityMonitor = require('../utils/security-monitor');

module.exports = {
    name: Events.GuildRoleDelete,
    async execute(role) {
        if (!role.guild) return;

        // تتبع anti-nuke: حذف رتب بشكل مريب
        const auditLogs = await role.guild.fetchAuditLogs({ limit: 1, type: 32 }).catch(() => null);
        const executor = auditLogs?.entries.first()?.executor;
        await securityMonitor.trackNukeAction(role.guild, executor, 'role_delete');

        if (executor) {
            await securityMonitor.checkAdminAbuse(role.guild, executor, `role_delete: @${role.name}`);
        }

        await logger.logRoleDelete?.(role).catch(() => { });
    },
};
