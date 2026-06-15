const { Events } = require('discord.js');
const logger = require('../utils/logger');

module.exports = {
    name: Events.GuildBanRemove,
    async execute(ban) {
        await logger.logUnban(ban);
    },
};
