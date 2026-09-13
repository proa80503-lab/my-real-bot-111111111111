'use strict';

/**
 * public.js — Routes عامة لا تحتاج تسجيل دخول
 * Store, Auction, Bot Status
 */

const express = require('express');
const config = require('../../../config');
const router = express.Router();

// ──────────────────────────────────────────────────────────────────────────────
// المتجر — عرض الأصناف
// ──────────────────────────────────────────────────────────────────────────────
router.get('/store', (req, res) => {
    const items = Object.entries(config.shopItems || {}).map(([id, item]) => ({
        id,
        name: item.name,
        price: item.price,
        description: item.description,
        emoji: item.emoji,
        duration: item.duration,
        image: item.image || null,
        category: getCategoryFromId(id),
    }));

    res.json({ success: true, items });
});

function getCategoryFromId(id) {
    if (['smartphone','laptop'].includes(id)) return 'electronics';
    if (['sport_car','yacht','private_jet'].includes(id)) return 'vehicles';
    if (['villa','mansion','private_island'].includes(id)) return 'realestate';
    if (['shield','vip_badge','rob_immunity'].includes(id)) return 'tools';
    if (['bankextend','vault','xp_boost_large'].includes(id)) return 'upgrades';
    return 'other';
}

// ──────────────────────────────────────────────────────────────────────────────
// المزاد
// ──────────────────────────────────────────────────────────────────────────────
router.get('/auction', (req, res) => {
    // المزاد حالياً يعتمد على Discord bot — هنا نعيد بيانات المزادات الموجودة في DB
    // يمكن توسيعه مستقبلاً
    res.json({
        success: true,
        auctions: [],
        message: 'Auction data is managed through Discord bot commands',
    });
});

// ──────────────────────────────────────────────────────────────────────────────
// حالة البوت (عام)
// ──────────────────────────────────────────────────────────────────────────────
router.get('/status', (req, res) => {
    const client = req.app.get('client');
    res.json({
        success: true,
        online: client?.isReady() ?? false,
        ping: client?.ws?.ping ?? 0,
        guilds: client?.guilds?.cache?.size ?? 0,
    });
});

module.exports = router;
