const { Events } = require('discord.js');
const logger = require('../utils/logger');
const securityMonitor = require('../utils/security-monitor');

module.exports = {
    name: Events.ChannelDelete,
    async execute(channel) {
        if (!channel.guild) return;

        // تتبع anti-nuke: حذف قنوات بشكل مريب
        const auditLogs = await channel.guild.fetchAuditLogs({ limit: 1, type: 12 }).catch(() => null);
        const executor = auditLogs?.entries.first()?.executor;
        await securityMonitor.trackNukeAction(channel.guild, executor, 'channel_delete');

        if (executor) {
            await securityMonitor.checkAdminAbuse(channel.guild, executor, `channel_delete: #${channel.name}`);
        }

        await logger.logChannelDelete?.(channel).catch(() => { });
    },
};
