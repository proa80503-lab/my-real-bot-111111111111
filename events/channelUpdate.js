const { Events } = require('discord.js');
const logger = require('../utils/logger');

module.exports = {
    name: Events.ChannelUpdate,
    async execute(oldChannel, newChannel) {
        await logger.logChannelUpdate(oldChannel, newChannel);
    },
};
