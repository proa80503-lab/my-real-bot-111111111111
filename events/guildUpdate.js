'use strict';

const { Events } = require('discord.js');
const logger = require('../utils/logger');

module.exports = {
    name: Events.GuildUpdate,
    async execute(oldGuild, newGuild) {
        await logger.logGuildUpdate(oldGuild, newGuild);
    },
};
