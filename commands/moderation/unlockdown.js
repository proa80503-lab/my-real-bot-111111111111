'use strict';

const { PermissionFlagsBits } = require('discord.js');
const securityMonitor = require('../../utils/security-monitor');

module.exports = {
    name: 'فك-الإغلاق',
    aliases: ['unlock-server', 'unlockdown', 'فك_الاغلاق'],
    description: 'رفع وضع الإغلاق الكامل عن السيرفر',
    permissions: PermissionFlagsBits.Administrator,

    async execute(message) {
        if (!message.guild) return;
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return message.reply('❌ هذا الأمر يحتاج صلاحية Administrator!');
        }

        const status = securityMonitor.getSystemStatus();
        if (!status.lockdownMode) {
            return message.reply('✅ السيرفر مو في وضع الإغلاق أصلاً!');
        }

        const msg = await message.reply('⏳ يتم رفع الإغلاق عن جميع القنوات...');
        await securityMonitor.disableLockdown(message.guild, message.author);
        await msg.edit('✅ **تم رفع الإغلاق بنجاح!** جميع القنوات عادت لوضعها الطبيعي.');
    }
};
