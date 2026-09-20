const express = require('express');
const { verifyToken } = require('./auth');
const dConf = require('../../../utils/dashboard-config');
const botSettings = require('../../../src/database/bot-settings-db');
const db = require('../../../src/database/db');
const router = express.Router();

// Apply auth middleware to all control routes
router.use(verifyToken);

router.post('/response', (req, res) => {
    const { trigger, response, exactMatch } = req.body;
    if (!trigger || !response) return res.status(400).json({ success: false, error: 'بيانات ناقصة' });
    dConf.addAutoResponse(trigger, response, !!exactMatch);
    res.json({ success: true });
});

router.post('/settings', (req, res) => {
    const body = req.body;
    if (body.autoMessagesEnabled !== undefined) botSettings.set('autoMessagesEnabled', !!body.autoMessagesEnabled);
    if (body.ghostPingEnabled !== undefined) {
        const gp = require('../../../utils/ghost-ping');
        if (body.ghostPingEnabled) gp.enable();
        else gp.disable();
    }
    if (body.randomEventInterval !== undefined) botSettings.set('randomEventInterval', Number(body.randomEventInterval));
    if (body.challengeInterval !== undefined) botSettings.set('challengeInterval', Number(body.challengeInterval));
    if (body.moodMessageInterval !== undefined) botSettings.set('moodMessageInterval', Number(body.moodMessageInterval));
    if (body.aiRandomReplyFrequency !== undefined) botSettings.set('aiRandomReplyFrequency', Number(body.aiRandomReplyFrequency));
    
    res.json({ success: true });
});

router.post('/economy_manage', (req, res) => {
    const { userId, amount, action } = req.body;
    if (!userId || amount === undefined || !action) return res.status(400).json({ success: false, error: 'بيانات ناقصة' });

    const amt = Number(amount);
    if (isNaN(amt) || amt < 0) return res.status(400).json({ success: false, error: 'مبلغ غير صالح' });

    const uData = db.getUserData(userId);
    if (action === 'add') uData.balance = (uData.balance || 0) + amt;
    else if (action === 'remove') uData.balance = Math.max(0, (uData.balance || 0) - amt);
    else if (action === 'set') uData.balance = amt;

    db.setUserData(userId, uData);
    res.json({ success: true });
});

router.post('/command', (req, res) => {
    const { command, action } = req.body;
    if (!command || !action) return res.status(400).json({ success: false, error: 'بيانات ناقصة' });

    if (action === 'disable') botSettings.disableCommand(command);
    else if (action === 'enable') botSettings.enableCommand(command);

    res.json({ success: true });
});

router.post('/moderation', async (req, res) => {
    const { guildId, userId, reason, action } = req.body;
    if (!guildId || !userId || !action) return res.status(400).json({ success: false, error: 'بيانات ناقصة' });

    const client = req.app.get('client');
    if (!client) return res.status(500).json({ success: false, error: 'Bot offline' });

    try {
        const guild = await client.guilds.fetch(guildId);
        if (!guild) return res.status(404).json({ success: false, error: 'السيرفر غير موجود' });

        if (action === 'warn') {
            const uData = db.getUserData(userId);
            uData.warnings = (uData.warnings || 0) + 1;
            db.setUserData(userId, uData);
        } else if (action === 'kick') {
            const member = await guild.members.fetch(userId);
            if (member) await member.kick(reason || 'من لوحة التحكم');
        } else if (action === 'ban') {
            await guild.members.ban(userId, { reason: reason || 'من لوحة التحكم' });
        } else if (action === 'unban') {
            await guild.members.unban(userId, reason || 'من لوحة التحكم');
        }

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

router.post('/restart', (req, res) => {
    res.json({ success: true, message: 'Restarting...' });
    setTimeout(() => process.exit(1), 1000);
});

router.post('/announce', async (req, res) => {
    const { channelId, message } = req.body;
    if (!channelId || !message) return res.status(400).json({ success: false, error: 'بيانات ناقصة' });

    const client = req.app.get('client');
    if (!client) return res.status(500).json({ success: false, error: 'Bot offline' });

    try {
        const channel = await client.channels.fetch(channelId);
        if (!channel || !channel.isTextBased()) return res.status(400).json({ success: false, error: 'روم غير صالح' });
        await channel.send(message);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

module.exports = router;
