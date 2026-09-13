'use strict';

/**
 * public.js — Routes عامة لا تحتاج تسجيل دخول (جزئياً)
 * Store, Auction, Bot Status
 */

const express = require('express');
const config = require('../../../config');
const db = require('../../../utils/database');
const { verifyToken } = require('./auth');
const router = express.Router();

// ─── قفل العمليات لمنع التدبيل ────────────────────────────────────────────────
const activePurchases = new Set();

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
// المتجر — الشراء المباشر عبر الويب
// ──────────────────────────────────────────────────────────────────────────────
router.post('/store/buy', verifyToken, async (req, res) => {
    const { itemId } = req.body;
    const userId = req.user.userId;

    if (!itemId || !config.shopItems[itemId]) {
        return res.status(400).json({ success: false, error: '❌ الغرض غير متوفر.' });
    }

    if (activePurchases.has(userId)) {
        return res.status(429).json({ success: false, error: '⏳ جاري المعالجة، الرجاء الانتظار...' });
    }

    const item = config.shopItems[itemId];
    activePurchases.add(userId);

    try {
        const now = Date.now();
        const userData = db.getUserData(userId);
        const balance = userData.balance || 0;
        const inv = userData.inventory || {};

        if (balance < item.price) {
            return res.status(400).json({ success: false, error: `❌ رصيدك (${balance.toLocaleString()}) لا يكفي لشراء ${item.name}!` });
        }

        const isPermanent = item.duration >= 999;
        if (isPermanent && inv[itemId] && itemId !== 'bankextend') {
            return res.status(400).json({ success: false, error: `⚠️ أنت تملك ${item.name} بالفعل!` });
        }

        if (itemId === 'bankextend' && (userData.bankExtensions || 0) >= 10) {
            return res.status(400).json({ success: false, error: '⚠️ لقد وصلت للحد الأقصى لتوسعة البنك!' });
        }

        // الخصم الذري
        const removed = db.removeMoney(userId, item.price);
        if (!removed) {
            return res.status(400).json({ success: false, error: '❌ فشل الخصم، تأكد من رصيدك.' });
        }

        db.addTransaction(userId, 'shop_buy', item.price, `Web Buy: ${item.name}`);

        const updates = { inventory: { ...inv } };
        let customNote = '✅ تمت الإضافة لحقيبتك بنجاح!';

        if (itemId !== 'bankextend') {
            updates.inventory[itemId] = {
                quantity: 1,
                purchasedAt: now,
                expiresAt: isPermanent ? null : now + (item.duration * 24 * 60 * 60 * 1000)
            };
        }

        if (itemId === 'shield') updates.robShieldUntil = now + (24 * 60 * 60 * 1000);
        if (itemId === 'vip_badge') updates.vipBadge = true;
        if (itemId === 'rob_immunity') updates.robImmunity = true;
        if (itemId === 'xp_boost_large') updates.xpBoostUntil = now + (7 * 24 * 60 * 60 * 1000);
        if (itemId === 'vault') updates.vaultCap = (userData.vaultCap || 0) + 100000;
        
        if (itemId === 'bankextend') {
            const currentExt = (userData.bankExtensions || 0) + 1;
            updates.bankCap = (userData.bankCap || 0) + 50000;
            updates.bankExtensions = currentExt;
            customNote = `🏦 تم توسعة سعة البنك (المستوى: ${currentExt}/10)`;
        }
        
        if (itemId === 'moneybag') {
            const cash = Math.floor(Math.random() * 3300) + 200;
            db.addMoney(userId, cash);
            delete updates.inventory[itemId];
            customNote = `💰 فتحت الكيس وحصلت على ${cash.toLocaleString()}!`;
        }

        db.updateFields(userId, updates);

        return res.json({
            success: true,
            message: customNote,
            newBalance: (db.getUserData(userId).balance || 0)
        });

    } catch (err) {
        console.error('[Web Store Error]', err);
        return res.status(500).json({ success: false, error: 'حدث خطأ في السيرفر' });
    } finally {
        activePurchases.delete(userId);
    }
});

// ──────────────────────────────────────────────────────────────────────────────
// المزاد
// ──────────────────────────────────────────────────────────────────────────────
router.get('/auction', (req, res) => {
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
