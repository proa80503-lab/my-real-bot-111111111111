const { Events } = require('discord.js');
const logger = require('../utils/logger');
const securityMonitor = require('../utils/security-monitor');

module.exports = {
    name: Events.ChannelCreate,
    async execute(channel) {
        if (!channel.guild) return;

        // تتبع anti-nuke: إنشاء قنوات بشكل مريب
        const auditLogs = await channel.guild.fetchAuditLogs({ limit: 1, type: 10 }).catch(() => null);
        const executor = auditLogs?.entries.first()?.executor;
        await securityMonitor.trackNukeAction(channel.guild, executor, 'channel_create');

        if (executor) {
            await securityMonitor.checkAdminAbuse(channel.guild, executor, `channel_create: #${channel.name}`);
        }

        await logger.logChannelCreate?.(channel).catch(() => { });
    },
};
