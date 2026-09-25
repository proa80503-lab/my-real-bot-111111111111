'use strict';

const { Events } = require('discord.js');
const logger = require('../utils/logger');

module.exports = {
    name: Events.GuildEmojiCreate,
    async execute(emoji) {
        await logger.logEmojiCreate(emoji);
    },
};
