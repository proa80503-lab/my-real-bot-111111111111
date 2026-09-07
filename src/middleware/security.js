'use strict';

const protection = require('../../utils/protection');
const securityMonitor = require('../../utils/security-monitor');

module.exports = async function securityMiddleware(message) {
    if (!message.guild) return true;

    // فحص الحماية المتقدمة (الأولوية القصوى)
    if (await securityMonitor.checkTokenSniffing(message)) return false;
    if (await securityMonitor.checkPhishing(message)) return false;
    if (await protection.checkSpam(message)) return false;
    if (await protection.checkBadWords(message)) return false;

    if (message.member && !message.member.permissions.has('Administrator')) {
        if (await protection.checkDuplicateMessages(message)) return false;
        if (await protection.checkMentionSpam(message)) return false;
        if (await protection.checkEmojiSpam(message)) return false;
        if (await protection.checkCaps(message)) return false;
    }

    return true; // Continue to next middleware
};
