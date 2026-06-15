const { Events, AuditLogEvent } = require('discord.js');
const logger = require('../utils/logger');

module.exports = {
    name: Events.GuildMemberRemove,
    async execute(member) {
        try {
            // ننتظر ثانية للـ Audit Log
            await new Promise(r => setTimeout(r, 1500));

            // نتحقق إذا كانت المغادرة بسبب طرد (Kick)
            const auditLogs = await member.guild.fetchAuditLogs({
                type: AuditLogEvent.MemberKick,
                limit: 5
            });

            const kickLog = auditLogs.entries.find(entry => {
                const isRecent = (Date.now() - entry.createdTimestamp) < 10000;
                return isRecent && entry.targetId === member.id;
            });

            if (kickLog) {
                // كانت طرداً — نسجله كطرد
                await logger.logKick(member, kickLog.executor);
            } else {
                // مغادرة طوعية
                await logger.logMemberLeave(member);
            }
        } catch (error) {
            // في حالة فشل جلب الـ Audit Log نسجل كمغادرة عادية
            await logger.logMemberLeave(member).catch(() => { });
        }
    },
};
