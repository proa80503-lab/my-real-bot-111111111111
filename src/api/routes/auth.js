'use strict';

/**
 * ════════════════════════════════════════════════════════
 *  auth.js — نظام المصادقة الجديد
 *  ─ Bot Owner: يسجّل بمفتاح سري
 *  ─ Server Owner: يسجّل عبر Discord OAuth2
 * ════════════════════════════════════════════════════════
 */

const express = require('express');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const botSettings = require('../../../utils/bot-settings');
const db = require('../../database/db');
const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex');
const BOT_OWNER_ID = process.env.OWNER_ID;

// Discord OAuth2
const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID || '';
const DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET || '';

// استخدم رابط رندر التلقائي إذا كان البوت مرفوعاً على منصة Render
const RENDER_URL = process.env.RENDER_EXTERNAL_URL;
const DISCORD_REDIRECT_URI = process.env.DISCORD_REDIRECT_URI || (RENDER_URL ? `${RENDER_URL}/auth/discord/callback` : 'http://localhost:3000/auth/discord/callback');

const DISCORD_API = 'https://discord.com/api/v10';

// ─── Sign JWT ─────────────────────────────────────────────────────────────────
function signToken(payload) {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });
}

// ─── Verify Middleware ─────────────────────────────────────────────────────────
const verifyToken = (req, res, next) => {
    const auth = req.headers['authorization'];
    const token = auth?.startsWith('Bearer ') ? auth.slice(7) : null;
    if (!token) return res.status(403).json({ success: false, error: 'No token' });

    try {
        req.user = jwt.verify(token, JWT_SECRET);
        next();
    } catch {
        res.status(401).json({ success: false, error: 'Unauthorized' });
    }
};

// ─── Bot Owner Middleware ──────────────────────────────────────────────────────
const requireBotOwner = (req, res, next) => {
    verifyToken(req, res, () => {
        if (req.user?.role !== 'bot_owner') {
            return res.status(403).json({ success: false, error: 'Bot Owner only' });
        }
        next();
    });
};

// ─── Server Owner Middleware ───────────────────────────────────────────────────
const requireServerOwner = (req, res, next) => {
    verifyToken(req, res, async () => {
        const guildId = req.params.guildId;
        if (!guildId) return res.status(400).json({ success: false, error: 'Guild ID required' });

        // Bot Owner يستطيع أن يكون Server Owner أيضاً
        if (req.user?.role === 'bot_owner') {
            return next();
        }

        if (req.user?.role !== 'server_owner') {
            return res.status(403).json({ success: false, error: 'Server Owner only' });
        }

        // تحقق من أن المستخدم هو فعلاً مالك هذا السيرفر بالذات
        const client = req.app.get('client');
        if (!client) return res.status(503).json({ success: false, error: 'Bot offline' });

        try {
            const guild = await client.guilds.fetch(guildId).catch(() => null);
            if (!guild) return res.status(404).json({ success: false, error: 'Guild not found' });

            if (guild.ownerId !== req.user.userId) {
                return res.status(403).json({ success: false, error: 'You are not the owner of this guild' });
            }
            req.guild = guild;
            next();
        } catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    });
};

// ──────────────────────────────────────────────────────────────────────────────
// 1. Bot Owner Login (مفتاح سري)
// ──────────────────────────────────────────────────────────────────────────────
router.post('/bot-owner/login', (req, res) => {
    const { key } = req.body;
    const DASHBOARD_KEY = botSettings.get('dashboardKey');

    if (!key || key !== DASHBOARD_KEY) {
        return res.status(401).json({ success: false, error: 'Invalid key' });
    }

    const token = signToken({ role: 'bot_owner', userId: BOT_OWNER_ID });
    res.json({ success: true, token, role: 'bot_owner' });
});

// Legacy login — للتوافق مع الداشبورد القديم
router.post('/login', (req, res) => {
    const { key } = req.body;
    const DASHBOARD_KEY = botSettings.get('dashboardKey');

    if (!key || key !== DASHBOARD_KEY) {
        return res.status(401).json({ success: false, error: 'Invalid key' });
    }

    const token = signToken({ role: 'bot_owner', userId: BOT_OWNER_ID, admin: true });
    res.json({ success: true, token, role: 'bot_owner' });
});

// ──────────────────────────────────────────────────────────────────────────────
// 2. Discord OAuth2 — Server Owner Login
// ──────────────────────────────────────────────────────────────────────────────
router.get('/discord', (req, res) => {
    if (!DISCORD_CLIENT_ID) {
        return res.status(500).json({ success: false, error: 'Discord OAuth not configured. Set DISCORD_CLIENT_ID in .env' });
    }
    const params = new URLSearchParams({
        client_id: DISCORD_CLIENT_ID,
        redirect_uri: DISCORD_REDIRECT_URI,
        response_type: 'code',
        scope: 'identify guilds',
    });
    res.redirect(`https://discord.com/oauth2/authorize?${params}`);
});

router.get('/discord/callback', async (req, res) => {
    const { code, error } = req.query;

    if (error || !code) {
        return res.redirect('/?error=discord_denied');
    }

    try {
        // Exchange code for access token
        const tokenRes = await fetch(`${DISCORD_API}/oauth2/token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                client_id: DISCORD_CLIENT_ID,
                client_secret: DISCORD_CLIENT_SECRET,
                grant_type: 'authorization_code',
                code,
                redirect_uri: DISCORD_REDIRECT_URI,
            }),
        });
        const tokenData = await tokenRes.json();
        if (!tokenData.access_token) throw new Error('No access token from Discord');

        // Get user info
        const userRes = await fetch(`${DISCORD_API}/users/@me`, {
            headers: { Authorization: `Bearer ${tokenData.access_token}` },
        });
        const discordUser = await userRes.json();
        if (!discordUser.id) throw new Error('Failed to get Discord user');

        // We don't need to fetch the user's guilds from Discord API anymore.
        // We will just check the bot's cache in the /me endpoint to see which guilds they own.

        // Check if Bot Owner is logging in via OAuth (still gets bot_owner role)
        const isBotOwner = discordUser.id === BOT_OWNER_ID;
        const role = isBotOwner ? 'bot_owner' : 'server_owner';

        const avatar = discordUser.avatar
            ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.webp?size=128`
            : `https://cdn.discordapp.com/embed/avatars/${discordUser.discriminator % 5}.png`;

        const jwtPayload = {
            role,
            userId: discordUser.id,
            username: discordUser.global_name || discordUser.username,
            avatar,
        };

        const jwtToken = signToken(jwtPayload);

        // Redirect to frontend with token
        res.redirect(`/?token=${jwtToken}&role=${role}`);
    } catch (err) {
        console.error('[Auth] Discord OAuth error:', err.message);
        res.redirect(`/?error=${encodeURIComponent(err.message)}`);
    }
});

// ──────────────────────────────────────────────────────────────────────────────
// 3. Verify Token endpoint
// ──────────────────────────────────────────────────────────────────────────────
router.get('/me', verifyToken, async (req, res) => {
    const user = req.user;
    const client = req.app.get('client');
    let ownedGuilds = [];

    if (user.role === 'bot_owner' && client) {
        // Bot Owner يرى كل السيرفرات التي البوت فيها
        ownedGuilds = client.guilds.cache.map(g => ({
            id: g.id,
            name: g.name,
            icon: g.iconURL({ dynamic: true }) || null,
            memberCount: g.memberCount,
            isOwner: g.ownerId === user.userId,
        }));
    } else if (user.role === 'server_owner' && client) {
        // Server Owner يرى فقط السيرفرات التي يملكها والبوت موجود فيها
        for (const g of client.guilds.cache.values()) {
            if (g.ownerId === user.userId) {
                ownedGuilds.push({
                    id: g.id,
                    name: g.name,
                    icon: g.iconURL({ dynamic: true }) || null,
                    memberCount: g.memberCount,
                    isOwner: true,
                });
            }
        }
    }

    res.json({
        success: true,
        user: {
            userId: user.userId,
            username: user.username,
            avatar: user.avatar,
            role: user.role,
        },
        guilds: ownedGuilds,
    });
});

// ──────────────────────────────────────────────────────────────────────────────
// 4. Logout
// ──────────────────────────────────────────────────────────────────────────────
router.post('/logout', (req, res) => {
    res.json({ success: true });
});

module.exports = router;
module.exports.verifyToken = verifyToken;
module.exports.requireBotOwner = requireBotOwner;
module.exports.requireServerOwner = requireServerOwner;
module.exports.JWT_SECRET = JWT_SECRET;
