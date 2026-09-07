'use strict';

const protection = require('../../utils/protection');
const chatLearner = require('../../utils/chat-learner');
const dailyChallenges = require('../../utils/daily-challenges');
const { handleAIReply, recordUserMessage } = require('../services/ai.service');

let globalMessageCounter = 0;

module.exports = async function aiMiddleware(message) {
    const isPublicChannel = message.guild
        ? (message.channel.permissionsFor(message.guild.roles.everyone)?.has('SendMessages') ?? true)
        : true;

    if (!isPublicChannel) return true;

    const isRestricted = protection.isPersonalChatRestricted?.(message.channel) || false;

    // سجل المحادثة
    if (message.guild) {
        try {
            recordUserMessage(
                message.author.id,
                message.author.displayName || message.author.username,
                message.content.trim(),
                message.guild.id
            );
        } catch { /* silent */ }
    }

    if (!isRestricted) {
        chatLearner.learn(message);
        
        await dailyChallenges.updateProgress(message.author.id, 'messages', 1, message).catch(() => { });

        // نظام الرد العشوائي بالذكاء الاصطناعي كل N رسالة
        globalMessageCounter++;
        const freq = (() => {
            try { return require('../../utils/bot-settings').get('aiRandomReplyFrequency') || 10; } catch { return 10; }
        })();
        const aiEnabled = (() => {
            try { return require('../../utils/bot-settings').get('aiRandomReplyEnabled') !== false; } catch { return true; }
        })();
        if (aiEnabled && globalMessageCounter >= freq) {
            globalMessageCounter = 0;
            if (Math.random() > 0.3) {
                setTimeout(() => handleAIReply(message, true).catch(() => {}), 2000);
            }
        }
    }

    // الردود المخصصة من الكود
    try {
        const customResponses = require('../../commands/main/custom-responses');
        if (customResponses?.checkResponse && await customResponses.checkResponse(message)) return false;
    } catch { }

    // الردود من الداشبورد
    try {
        const dConf = require('../../utils/dashboard-config');
        const autoResps = dConf.getAutoResponses();
        const lowMsg = message.content.toLowerCase().trim();
        for (const ar of autoResps) {
            const triggerStr = ar.trigger.toLowerCase();
            if (ar.exactMatch && lowMsg === triggerStr) {
                await message.reply(ar.response);
                return false;
            } else if (!ar.exactMatch && lowMsg.includes(triggerStr)) {
                await message.reply(ar.response);
                return false;
            }
        }
    } catch (e) { console.error('[DashboardAutoRes]', e.message); }

    // المنشن المباشر
    const isMentionedDirectly = message.mentions.has(message.client.user) && !message.reference;
    if (isMentionedDirectly && !isRestricted) {
        await handleAIReply(message);
        return false;
    }

    return true; // Continue
};
