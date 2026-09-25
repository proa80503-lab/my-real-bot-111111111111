'use strict';

const { Events } = require('discord.js');
const logger = require('../utils/logger');

module.exports = {
    name: Events.InviteCreate,
    async execute(invite) {
        await logger.logInviteCreate(invite);
    },
};
