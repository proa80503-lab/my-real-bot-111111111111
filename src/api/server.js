const express = require('express');
const cors = require('cors');
const path = require('path');
const dConf = require('../../utils/dashboard-config');

const app = express();
app.use(cors());
app.use(express.json());

// Load routers
const authRouter = require('./routes/auth');
const statsRouter = require('./routes/stats');
const controlRouter = require('./routes/control');

app.use('/api/auth', authRouter);
app.use('/api/stats', statsRouter);
app.use('/api/control', controlRouter);

// ─── Health Check Endpoint for Render ─────────────────────────────────────────
app.get('/health', (req, res) => {
    const client = app.get('client');
    if (!client || !client.isReady()) {
        return res.status(503).send('Bot Not Ready');
    }
    res.status(200).send('OK');
});

// Serve Vite frontend in production
app.use(express.static(path.join(__dirname, '../../../dashboard-ui/dist')));
app.use((req, res) => {
    res.sendFile(path.join(__dirname, '../../../dashboard-ui/dist/index.html'));
});

module.exports = app;
