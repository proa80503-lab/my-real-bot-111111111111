const { Events } = require('discord.js');
const logger = require('../utils/logger');
const securityMonitor = require('../utils/security-monitor');

module.exports = {
    name: Events.GuildRoleCreate,
    async execute(role) {
        if (!role.guild) return;

        // تتبع anti-nuke: إنشاء رتب بشكل مريب
        const auditLogs = await role.guild.fetchAuditLogs({ limit: 1, type: 30 }).catch(() => null);
        const executor = auditLogs?.entries.first()?.executor;
        await securityMonitor.trackNukeAction(role.guild, executor, 'role_create');

        if (executor) {
            await securityMonitor.checkAdminAbuse(role.guild, executor, `role_create: @${role.name}`);
        }

        await logger.logRoleCreate?.(role).catch(() => { });
    },
};
