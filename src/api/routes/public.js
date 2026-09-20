'use strict';

/**
 * public.js — Routes عامة لا تحتاج تسجيل دخول (جزئياً)
 * Store, Auction, Bot Status
 */

const express = require('express');
const config = require('../../../config');
const db = require('../../../src/database/db');
const { verifyToken } = require('./auth');
const router = express.Router();

// ─── عرض صورة الترحيب المرفوعة محلياً (من MongoDB) ──────────────────────────
router.get('/welcome-image/:guildId', async (req, res) => {
    try {
        const base64Str = await db.getWelcomeImageBase64(req.params.guildId);
        if (!base64Str) {
            return res.status(404).send('Image not found');
        }
        
        const match = base64Str.match(/^data:image\/(\w+);base64,/);
        const mimeType = match ? `image/${match[1]}` : 'image/png';
        const base64Data = base64Str.replace(/^data:image\/\w+;base64,/, '');
        
        const imgBuffer = Buffer.from(base64Data, 'base64');
        res.writeHead(200, {
            'Content-Type': mimeType,
            'Content-Length': imgBuffer.length
        });
        res.end(imgBuffer);
    } catch (err) {
        console.error('[Public/WelcomeImage]', err);
        res.status(500).send('Internal Server Error');
    }
});

// ─── قفل العمليات لمنع التدبيل ────────────────────────────────────────────────
const activePurchases = new Set();

// ─── نظام المزاد النشط (في الذاكرة) ──────────────────────────────────────────
const activeAuctions = new Map(); // auctionId → auction object

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

// ─── Helper: تحقق من امتلاك غرض في الـ inventory (يدعم Array وObject) ──────
function hasInventoryItem(userData, itemId) {
    const inv = userData.inventory;
    if (Array.isArray(inv)) {
        return inv.some(item => (item.itemId || item.id) === itemId);
    }
    if (inv && typeof inv === 'object') {
        return Boolean(inv[itemId]);
    }
    return false;
}

// ──────────────────────────────────────────────────────────────────────────────
// المتجر — الشراء المباشر عبر الويب (مُصلح بالكامل)
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

        if (balance < item.price) {
            return res.status(400).json({
                success: false,
                error: `❌ رصيدك (${balance.toLocaleString()} 💰) لا يكفي! تحتاج ${item.price.toLocaleString()} 💰 لشراء ${item.emoji} ${item.name}`
            });
        }

        const isPermanent = item.duration >= 999;

        // ── فحص امتلاك الغرض بالفعل (مُصلح: يدعم Array وObject) ──────────────
        if (isPermanent && itemId !== 'bankextend' && hasInventoryItem(userData, itemId)) {
            return res.status(400).json({ success: false, error: `⚠️ أنت تملك ${item.emoji} ${item.name} بالفعل في حقيبتك!` });
        }

        if (itemId === 'bankextend' && (userData.bankExtensions || 0) >= 10) {
            return res.status(400).json({ success: false, error: '⚠️ لقد وصلت للحد الأقصى لتوسعة البنك (10 مرات)!' });
        }

        // ── الخصم الذري ─────────────────────────────────────────────────────
        const removed = db.removeMoney(userId, item.price);
        if (!removed) {
            return res.status(400).json({ success: false, error: '❌ فشل الخصم، تأكد من رصيدك.' });
        }

        db.addTransaction(userId, 'shop_buy', item.price, `Web Buy: ${item.name}`);

        // ── تحضير التحديثات ──────────────────────────────────────────────────
        const freshUserData = db.getUserData(userId);
        const updates = {};
        let customNote = `✅ تمت إضافة ${item.emoji} ${item.name} لحقيبتك بنجاح!`;

        // تحديث الـ Inventory بشكل صحيح (دائماً Array)
        let inv = Array.isArray(freshUserData.inventory) ? [...freshUserData.inventory] : [];

        if (itemId !== 'bankextend' && itemId !== 'moneybag') {
            const existingIdx = inv.findIndex(i => (i.itemId || i.id) === itemId);
            const newEntry = {
                itemId,
                quantity: 1,
                purchasedAt: now,
                expiresAt: isPermanent ? null : now + (item.duration * 24 * 60 * 60 * 1000)
            };
            if (existingIdx >= 0 && !isPermanent) {
                inv[existingIdx] = newEntry; // تجديد الغرض
            } else if (existingIdx < 0) {
                inv.push(newEntry);
            }
            updates.inventory = inv;
        }

        // تأثيرات خاصة لكل غرض
        if (itemId === 'shield') {
            updates.robShieldUntil = now + (24 * 60 * 60 * 1000);
        }
        if (itemId === 'vip_badge') {
            updates.vipBadge = true;
        }
        if (itemId === 'rob_immunity') {
            updates.robImmunity = true;
        }
        if (itemId === 'xp_boost_large') {
            updates.xpBoostUntil = now + (7 * 24 * 60 * 60 * 1000);
        }
        if (itemId === 'vault') {
            updates.vaultCap = (freshUserData.vaultCap || 0) + 100000;
        }

        if (itemId === 'bankextend') {
            const currentExt = (freshUserData.bankExtensions || 0) + 1;
            updates.bankCap = (freshUserData.bankCap || 0) + 50000;
            updates.bankExtensions = currentExt;
            customNote = `🏦 تم توسعة سعة البنك إلى المستوى ${currentExt}/10 (+50,000 💰)`;
        }

        if (itemId === 'moneybag') {
            const cash = Math.floor(Math.random() * 3300) + 200;
            db.addMoney(userId, cash);
            customNote = `💰 فتحت الكيس وحصلت على ${cash.toLocaleString()} 💰!`;
        }

        if (Object.keys(updates).length > 0) {
            db.updateFields(userId, updates);
        }

        const finalBalance = db.getUserData(userId).balance || 0;

        return res.json({
            success: true,
            message: customNote,
            newBalance: finalBalance,
            item: { id: itemId, name: item.name, emoji: item.emoji }
        });

    } catch (err) {
        console.error('[Web Store Error]', err);
        return res.status(500).json({ success: false, error: 'حدث خطأ في السيرفر' });
    } finally {
        activePurchases.delete(userId);
    }
});

// ──────────────────────────────────────────────────────────────────────────────
// المزاد — عرض المزادات النشطة
// ──────────────────────────────────────────────────────────────────────────────
router.get('/auction', verifyToken, (req, res) => {
    const userId = req.user.userId;
    const userData = db.getUserData(userId);
    const now = Date.now();

    // حذف المزادات المنتهية
    for (const [id, a] of activeAuctions.entries()) {
        if (a.endsAt < now) activeAuctions.delete(id);
    }

    const auctions = Array.from(activeAuctions.values()).map(a => ({
        id: a.id,
        sellerId: a.sellerId,
        sellerName: a.sellerName,
        itemId: a.itemId,
        itemName: a.itemName,
        itemEmoji: a.itemEmoji,
        itemImage: (config.shopItems[a.itemId] || {}).image || null,
        startingPrice: a.startingPrice,
        currentPrice: a.currentPrice,
        highestBidderId: a.highestBidderId,
        highestBidderName: a.highestBidderName,
        endsAt: a.endsAt,
        timeLeft: Math.max(0, a.endsAt - now),
        isMyAuction: a.sellerId === userId,
        isLeading: a.highestBidderId === userId,
        bids: a.bids || [],
    }));

    res.json({
        success: true,
        auctions,
        userBalance: userData.balance || 0,
        totalActive: auctions.length,
        userInventory: Array.isArray(userData.inventory) ? userData.inventory : [],
    });
});

// ──────────────────────────────────────────────────────────────────────────────
// المزاد — إنشاء مزاد جديد
// ──────────────────────────────────────────────────────────────────────────────
router.post('/auction/create', verifyToken, (req, res) => {
    const { itemId, startingPrice, durationMinutes } = req.body;
    const userId = req.user.userId;

    if (!itemId || !startingPrice) {
        return res.status(400).json({ success: false, error: 'بيانات ناقصة' });
    }

    const item = config.shopItems[itemId];
    if (!item) {
        return res.status(400).json({ success: false, error: 'غرض غير موجود في المتجر' });
    }

    const userData = db.getUserData(userId);
    if (!hasInventoryItem(userData, itemId)) {
        return res.status(400).json({ success: false, error: `❌ لا تملك ${item.emoji} ${item.name} في حقيبتك!` });
    }

    const price = Number(startingPrice);
    if (isNaN(price) || price < 100) {
        return res.status(400).json({ success: false, error: 'السعر الابتدائي يجب أن يكون 100 💰 على الأقل' });
    }

    const duration = Math.min(Math.max(Number(durationMinutes) || 60, 5), 1440);
    const auctionId = `${userId}_${Date.now()}`;
    const now = Date.now();

    // إزالة الغرض من حقيبة البائع
    const inv = Array.isArray(userData.inventory)
        ? userData.inventory.filter(i => (i.itemId || i.id) !== itemId)
        : [];
    db.updateFields(userId, { inventory: inv });

    const auction = {
        id: auctionId,
        sellerId: userId,
        sellerName: req.user.username || 'مجهول',
        itemId,
        itemName: item.name,
        itemEmoji: item.emoji,
        startingPrice: price,
        currentPrice: price,
        highestBidderId: null,
        highestBidderName: null,
        endsAt: now + (duration * 60 * 1000),
        createdAt: now,
        bids: [],
    };

    activeAuctions.set(auctionId, auction);

    // جدولة إنهاء المزاد تلقائياً
    setTimeout(() => {
        const a = activeAuctions.get(auctionId);
        if (!a) return;

        if (a.highestBidderId) {
            // أعطِ الغرض للفائز
            const winnerData = db.getUserData(a.highestBidderId);
            const winnerInv = Array.isArray(winnerData.inventory) ? [...winnerData.inventory] : [];
            winnerInv.push({ itemId: a.itemId, quantity: 1, purchasedAt: Date.now(), expiresAt: null });
            db.updateFields(a.highestBidderId, { inventory: winnerInv });
            // أعطِ المال للبائع
            db.addMoney(a.sellerId, a.currentPrice);
            db.addTransaction(a.sellerId, 'auction_sold', a.currentPrice, `Sold: ${a.itemName}`);
            db.addTransaction(a.highestBidderId, 'auction_won', a.currentPrice, `Won: ${a.itemName}`);
        } else {
            // أعد الغرض للبائع إذا لم يُزايد أحد
            const sellerData = db.getUserData(a.sellerId);
            const sellerInv = Array.isArray(sellerData.inventory) ? [...sellerData.inventory] : [];
            sellerInv.push({ itemId: a.itemId, quantity: 1, purchasedAt: Date.now(), expiresAt: null });
            db.updateFields(a.sellerId, { inventory: sellerInv });
        }

        activeAuctions.delete(auctionId);
        console.log(`[Auction] ✅ انتهى المزاد ${auctionId} | الفائز: ${a.highestBidderName || 'لا أحد'}`);
    }, duration * 60 * 1000);

    res.json({
        success: true,
        auctionId,
        message: `✅ تم إنشاء المزاد! ينتهي بعد ${duration} دقيقة`
    });
});

// ──────────────────────────────────────────────────────────────────────────────
// المزاد — المزايدة
// ──────────────────────────────────────────────────────────────────────────────
router.post('/auction/bid', verifyToken, (req, res) => {
    const { auctionId, amount } = req.body;
    const userId = req.user.userId;

    const auction = activeAuctions.get(auctionId);
    if (!auction) {
        return res.status(404).json({ success: false, error: '❌ المزاد غير موجود أو انتهى!' });
    }

    if (auction.endsAt < Date.now()) {
        activeAuctions.delete(auctionId);
        return res.status(400).json({ success: false, error: '⌛ انتهى وقت المزاد!' });
    }

    if (auction.sellerId === userId) {
        return res.status(400).json({ success: false, error: '❌ لا يمكنك المزايدة على غرضك!' });
    }

    const bidAmount = Number(amount);
    if (isNaN(bidAmount) || bidAmount <= auction.currentPrice) {
        return res.status(400).json({
            success: false,
            error: `❌ المزايدة يجب أن تكون أكثر من ${auction.currentPrice.toLocaleString()} 💰`
        });
    }

    const userData = db.getUserData(userId);
    if ((userData.balance || 0) < bidAmount) {
        return res.status(400).json({
            success: false,
            error: `❌ رصيدك لا يكفي! لديك ${(userData.balance || 0).toLocaleString()} 💰`
        });
    }

    // إعادة رصيد المزايد السابق إذا كان شخصاً مختلفاً
    if (auction.highestBidderId && auction.highestBidderId !== userId) {
        db.addMoney(auction.highestBidderId, auction.currentPrice);
        db.addTransaction(auction.highestBidderId, 'auction_outbid', auction.currentPrice, `Outbid on: ${auction.itemName}`);
    } else if (auction.highestBidderId === userId) {
        // نفس المزايد يرفع مزايدته — استرجاع المزايدة القديمة أولاً
        db.addMoney(userId, auction.currentPrice);
    }

    // خصم الرصيد الجديد
    db.removeMoney(userId, bidAmount);

    auction.currentPrice = bidAmount;
    auction.highestBidderId = userId;
    auction.highestBidderName = req.user.username || 'مجهول';
    auction.bids.unshift({
        userId,
        username: req.user.username || 'مجهول',
        amount: bidAmount,
        time: Date.now(),
    });
    if (auction.bids.length > 20) auction.bids = auction.bids.slice(0, 20);

    res.json({
        success: true,
        message: `✅ تم تقديم مزايدتك بـ ${bidAmount.toLocaleString()} 💰`,
        currentPrice: auction.currentPrice,
        timeLeft: Math.max(0, auction.endsAt - Date.now()),
        newBalance: db.getUserData(userId).balance || 0,
    });
});

// ──────────────────────────────────────────────────────────────────────────────
// المزاد — إلغاء مزاد (البائع فقط)
// ──────────────────────────────────────────────────────────────────────────────
router.delete('/auction/:id', verifyToken, (req, res) => {
    const { id } = req.params;
    const userId = req.user.userId;
    const auction = activeAuctions.get(id);

    if (!auction) return res.status(404).json({ success: false, error: 'المزاد غير موجود' });
    if (auction.sellerId !== userId) return res.status(403).json({ success: false, error: 'ليس مزادك' });

    // إعادة الرصيد للمزايد الأخير إن وجد
    if (auction.highestBidderId) {
        db.addMoney(auction.highestBidderId, auction.currentPrice);
        db.addTransaction(auction.highestBidderId, 'auction_cancelled', auction.currentPrice, `Auction cancelled: ${auction.itemName}`);
    }

    // إعادة الغرض للبائع
    const sellerData = db.getUserData(userId);
    const sellerInv = Array.isArray(sellerData.inventory) ? [...sellerData.inventory] : [];
    sellerInv.push({ itemId: auction.itemId, quantity: 1, purchasedAt: Date.now(), expiresAt: null });
    db.updateFields(userId, { inventory: sellerInv });

    activeAuctions.delete(id);
    res.json({ success: true, message: `✅ تم إلغاء المزاد وإعادة ${auction.itemEmoji} ${auction.itemName} لحقيبتك` });
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
module.exports.activeAuctions = activeAuctions;
