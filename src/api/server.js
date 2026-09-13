'use strict';

/**
 * API Server — Express App
 * Routes:
 *   /api/auth/*              ← Auth (login, OAuth, me)
 *   /api/bot-owner/*         ← Bot Owner only
 *   /api/server/:guildId/*   ← Server Owner only (per-guild isolation)
 *   /api/public/*            ← Public (Store, Auction, Status)
 *   /api/stats               ← Legacy Bot Owner stats (backward compat)
 *   /api/control             ← Legacy Bot Owner control (backward compat)
 *   /auth/discord            ← Discord OAuth redirect
 *   /auth/discord/callback   ← Discord OAuth callback
 */

const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();

app.use(cors({
    origin: (origin, cb) => cb(null, true),
    credentials: true,
}));
app.use(express.json());

// ─── Load Routers ──────────────────────────────────────────────────────────────
const authRouter       = require('./routes/auth');
const botOwnerRouter   = require('./routes/bot-owner');
const serverOwnerRouter = require('./routes/server-owner');
const publicRouter     = require('./routes/public');

// ─── Legacy routers (backward compat — still Bot Owner protected) ──────────────
const legacyStatsRouter   = require('./routes/stats');
const legacyControlRouter = require('./routes/control');

// ─── Mount Routes ──────────────────────────────────────────────────────────────
app.use('/api/auth', authRouter);

// Discord OAuth redirects (not under /api so browser can follow redirect)
app.get('/auth/discord', (req, res) => res.redirect('/api/auth/discord'));
app.get('/auth/discord/callback', (req, res, next) => {
    req.url = '/discord/callback';
    authRouter(req, res, next);
});

app.use('/api/bot-owner', botOwnerRouter);
app.use('/api/server/:guildId', serverOwnerRouter);
app.use('/api/public', publicRouter);

// Legacy (backward compat)
app.use('/api/stats', legacyStatsRouter);
app.use('/api/control', legacyControlRouter);

// ─── Health Check ──────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
    const client = app.get('client');
    if (!client || !client.isReady()) return res.status(503).send('Bot Not Ready');
    res.status(200).send('OK');
});

// ─── Serve Vite Frontend ───────────────────────────────────────────────────────
const distPath = path.join(__dirname, '../../dashboard-ui/dist');
app.use(express.static(distPath));

// SPA Fallback — React Router يتولى الـ routing في الـ client side
app.use((req, res) => {
    // لا نرجع HTML لـ API requests
    if (req.path.startsWith('/api/') || req.path.startsWith('/auth/')) {
        return res.status(404).json({ success: false, error: 'Not found' });
    }
    res.sendFile(path.join(distPath, 'index.html'));
});

module.exports = app;
