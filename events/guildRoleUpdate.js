const { Events } = require('discord.js');
const logger = require('../utils/logger');

module.exports = {
    name: Events.GuildRoleUpdate,
    async execute(oldRole, newRole) {
        await logger.logRoleUpdate(oldRole, newRole);
    },
};
