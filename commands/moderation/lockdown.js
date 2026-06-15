'use strict';

const { PermissionFlagsBits } = require('discord.js');
const securityMonitor = require('../../utils/security-monitor');

module.exports = {
    name: 'إغلاق-السيرفر',
    aliases: ['lockdown', 'lockserver', 'اغلاق_السيرفر'],
    description: 'تفعيل وضع الإغلاق الكامل — يقفل جميع القنوات فوراً',
    permissions: PermissionFlagsBits.Administrator,

    async execute(message, args) {
        if (!message.guild) return;
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return message.reply('❌ هذا الأمر يحتاج صلاحية Administrator!');
        }

        const status = securityMonitor.getSystemStatus();
        if (status.lockdownMode) {
            return message.reply('⚠️ السيرفر بالفعل في وضع الإغلاق! استخدم `!فك-الإغلاق` للرفع.');
        }

        const reason = args.join(' ') || 'إغلاق يدوي من الإدارة';
        const msg = await message.reply(`🔒 **تفعيل وضع الإغلاق...** | السبب: ${reason}`);
        const count = await securityMonitor.enableLockdown(message.guild, reason);
        await msg.edit(`🔒 **السيرفر مقفل!** تم قفل ${count} قناة. استخدم \`!فك-الإغلاق\` للرجوع.`);
    }
};
