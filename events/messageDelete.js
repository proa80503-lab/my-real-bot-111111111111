const { Events } = require('discord.js');
const logger = require('../utils/logger');

module.exports = {
    name: Events.MessageDelete,
    async execute(message) {
        await logger.logMessageDelete(message);
    },
};
