const { Events } = require('discord.js');
const logger = require('../utils/logger');

module.exports = {
    name: Events.VoiceStateUpdate,
    async execute(oldState, newState) {
        await logger.logVoiceState(oldState, newState);
    },
};
