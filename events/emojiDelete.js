'use strict';

const { Events } = require('discord.js');
const logger = require('../utils/logger');

module.exports = {
    name: Events.GuildEmojiDelete,
    async execute(emoji) {
        await logger.logEmojiDelete(emoji);
    },
};
