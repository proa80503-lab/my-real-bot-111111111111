'use strict';

const { handleMessageXP } = require('../services/xp.service');

module.exports = async function xpMiddleware(message) {
    await handleMessageXP(message);
    return true;
};
