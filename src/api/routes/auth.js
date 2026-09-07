const express = require('express');
const jwt = require('jsonwebtoken');
const botSettings = require('../../../utils/bot-settings');
const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_jwt_key_fallback';

router.post('/login', (req, res) => {
    const { key } = req.body;
    const DASHBOARD_KEY = botSettings.get('dashboardKey');

    if (key === DASHBOARD_KEY) {
        const token = jwt.sign({ admin: true }, JWT_SECRET, { expiresIn: '24h' });
        res.json({ success: true, token });
    } else {
        res.status(401).json({ success: false, error: 'Invalid key' });
    }
});

// Middleware to verify token for other routes
const verifyToken = (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) return res.status(403).json({ success: false, error: 'No token provided' });

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) return res.status(401).json({ success: false, error: 'Unauthorized' });
        req.user = decoded;
        next();
    });
};

module.exports = router;
module.exports.verifyToken = verifyToken;
