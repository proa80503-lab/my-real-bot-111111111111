'use strict';

/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║         🎛️  لوحة تحكم البوت الاحترافية — Dashboard Server       ║
 * ║  React (Vite) + Express API Backend                              ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */

const http = require('http');
const app = require('./src/api/server');
const botSettings = require('./utils/bot-settings');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('./src/api/routes/auth');

const PORT = process.env.PORT || 3000;
const DASHBOARD_KEY = botSettings.get('dashboardKey');
const RENDER_URL = process.env.RENDER_EXTERNAL_URL || null;
const BASE_URL = RENDER_URL || `http://localhost:${PORT}`;

function getDashboardUrl() {
    return `${BASE_URL}/?key=${DASHBOARD_KEY}`; // Token can be passed in URL for auto-login
}
module.exports.getDashboardUrl = getDashboardUrl;
module.exports.DASHBOARD_KEY = DASHBOARD_KEY;

// Keep token management for Store/Auction compatibility
const webTokens = new Map();

function generateWebToken(user) {
    let avatar;
    try {
        avatar = typeof user.displayAvatarURL === 'function'
            ? user.displayAvatarURL({ dynamic: true, size: 128 })
            : `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.webp?size=128`;
    } catch {
        avatar = `https://cdn.discordapp.com/embed/avatars/0.png`;
    }
    const token = jwt.sign({
        userId: user.id,
        username: user.username || user.globalName || 'مستخدم',
        avatar,
        role: 'user'
    }, JWT_SECRET, { expiresIn: '1h' });
    return token;
}
module.exports.generateWebToken = generateWebToken;

// Set bot client instance
module.exports.setClient = (c) => {
    app.set('client', c);
};

// Start Express Server
const server = http.createServer(app);

module.exports.start = () => {
    server.listen(PORT, '0.0.0.0', () => {
        console.log(`[Dashboard] 🌐 Server running on port ${PORT}`);
        console.log(`[Dashboard] 🔗 Internal URL: http://localhost:${PORT}`);
        if (RENDER_URL) console.log(`[Dashboard] ☁️ Public URL: ${RENDER_URL}`);
        console.log(`[Dashboard] 🔑 Secret Key: ${DASHBOARD_KEY}`);
    });
};
