const { Events } = require('discord.js');
const logger = require('../utils/logger');

module.exports = {
    name: Events.MessageUpdate,
    async execute(oldMessage, newMessage) {
        await logger.logMessageUpdate(oldMessage, newMessage);
    },
};
