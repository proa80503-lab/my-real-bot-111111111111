'use strict';

const { Events } = require('discord.js');
const pipeline = require('../src/middleware/pipeline');

// التسجيل يتم مرة واحدة (Singleton Pattern)
const securityMiddleware = require('../src/middleware/security');
const ownerMiddleware = require('../src/middleware/owner');
const commandsMiddleware = require('../src/middleware/commands');
const aiMiddleware = require('../src/middleware/ai');
const xpMiddleware = require('../src/middleware/xp');

// بناء سلسلة الـ Middlewares
pipeline
    .use(securityMiddleware)
    .use(ownerMiddleware)
    .use(commandsMiddleware)
    .use(aiMiddleware)
    .use(xpMiddleware);

module.exports = {
    name: Events.MessageCreate,
    
    async execute(message) {
        if (message.author.bot) return;

        // تمرير الرسالة عبر الـ Pipeline
        await pipeline.execute(message);
    },
};
