'use strict';

require('dotenv').config();

/**
 * قراءة المتغيرات الحساسة من .env فقط (لا تضع التوكن هنا أبداً)
 * @module config
 */

// التحقق من المتغيرات الضرورية عند بدء التشغيل
const REQUIRED_ENV = ['DISCORD_TOKEN', 'OWNER_ID'];
for (const key of REQUIRED_ENV) {
    if (!process.env[key]) {
        console.error(`[Config] ❌ المتغير البيئي "${key}" غير موجود في ملف .env`);
        process.exit(1);
    }
}

module.exports = {
    // ─── بيانات البوت الحساسة (من .env) ─────────────────────────
    token: process.env.DISCORD_TOKEN,
    ownerId: process.env.OWNER_ID,
    geminiApiKey: process.env.GEMINI_API_KEY || '',
    youtubeApiKey: process.env.YOUTUBE_API_KEY || '',
    hfToken: process.env.HF_TOKEN || '',
    nvidiaApiKey: process.env.NVIDIA_API_KEY || '',

    // ─── إعدادات عامة ─────────────────────────────────────────────
    prefix: '!',

    // ─── إعدادات الاقتصاد ─────────────────────────────────────────
    currency: '💰',
    dailyAmount: 500,
    startBalance: 1000,

    // ─── حدود الاقتصاد (مهمة لمنع الثغرات) ────────────────────────
    maxLoan: 50000,              // حد أقصى للقرض
    maxInvestment: 1000000,      // حد أقصى للاستثمار الواحد
    maxBankBalance: 10000000,    // حد أقصى للبنك
    maxWalletBalance: 5000000,   // حد أقصى للمحفظة
    maxDailyAmount: 10000,       // حد أقصى ليومي (مع الـ streak)
    moneybagCooldown: 3600000,   // كولداون كيس المال: ساعة واحدة
    cooldownResetCooldown: 86400000, // كولداون إعادة الكولداون: 24 ساعة

    // نظام Daily Streak
    streakBonus: 50,             // مكافأة إضافية لكل يوم في المتتالية (خُفِّضت)
    maxStreakBonus: 500,          // أقصى مكافأة من Streak (خُفِّضت)

    // نظام المستويات
    xpPerMoney: 1,               // كل 100 💰 = 1 XP
    xpPerGame: 5,                // XP لكل لعبة
    xpPerWin: 10,                // XP إضافي للفوز
    levelUpReward: 500,          // مكافأة كل مستوى
    bigLevelReward: 2000,        // مكافأة كل 10 مستويات

    // ─── أسماء القنوات والرتب (يُعيَّن يدوياً لكل سيرفر عبر setup) ─
    bankChannelName: '💰┃البنك',
    jailRoleName: '🔒┃سجين',
    muteRoleName: '🔇┃مكتوم',
    logChannelName: '📝┃السجلات',
    gamesChannelName: '🎮┃الألعاب',
    punishmentsChannelName: '⚖️┃العقوبات',

    // ─── نظام الاستثمار ──────────────────────────────────────────
    investmentRate: 0.02,        // 2% ربح يومي (خُفِّضت من 5%)
    investmentMinAmount: 1000,
    investmentMaxDays: 30,       // الحد الأقصى لأيام جمع الأرباح دفعة واحدة

    // ─── نظام الراتب والعمل ──────────────────────────────────────
    weeklyPayAmount: 2000,
    workAmount: 300,             // مكافأة العمل
    workCooldown: 3600000,       // ساعة واحدة

    // ─── إعدادات الرسائل التلقائية ──────────────────────────────
    autoMessagesEnabled: true,   // تفعيل/تعطيل الرسائل التلقائية (يمكن تغييره من الداشبورد)
    randomEventInterval: 20,     // كل 20 دقيقة (بدلاً من 3)
    challengeInterval: 45,       // كل 45 دقيقة (بدلاً من 12)
    moodMessageInterval: 180,    // كل 3 ساعات (بدلاً من 55 دقيقة)
    greetingInterval: 240,       // كل 4 ساعات (بدلاً من 60 دقيقة)

    // ─── أيتمز المتجر (الأصول الواقعية) ──────────────────────────
    shopItems: {
        // أجهزة وإلكترونيات
        smartphone: { name: 'هاتف ذكي', price: 5000, description: 'هاتف ذكي بآخر إصدار', emoji: '📱', duration: 999, image: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?q=80&w=800' },
        laptop: { name: 'لابتوب ألعاب', price: 15000, description: 'لابتوب بمواصفات خارقة', emoji: '💻', duration: 999, image: 'https://images.unsplash.com/photo-1603302576837-37561b2e2302?q=80&w=800' },
        
        // مركبات
        sport_car: { name: 'سيارة رياضية', price: 250000, description: 'سيارة سريعة جداً', emoji: '🏎️', duration: 999, image: 'https://images.unsplash.com/photo-1605559424843-9e4c228bf1c2?q=80&w=800' },
        yacht: { name: 'يخت فاخر', price: 1500000, description: 'يخت فخم للرحلات البحرية', emoji: '🛥️', duration: 999, image: 'https://images.unsplash.com/photo-1567899378494-47b22a2ae96a?q=80&w=800' },
        private_jet: { name: 'طائرة خاصة', price: 15000000, description: 'طائرة خاصة للتنقل الفاخر', emoji: '✈️', duration: 999, image: 'https://images.unsplash.com/photo-1540962351504-03099e0a754b?q=80&w=800' },

        // عقارات
        villa: { name: 'فيلا فاخرة', price: 2000000, description: 'فيلا مع مسبح خاص', emoji: '🏡', duration: 999, image: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?q=80&w=800' },
        mansion: { name: 'قصر فخم', price: 5000000, description: 'قصر ضخم لك ولعائلتك', emoji: '🏰', duration: 999, image: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?q=80&w=800' },
        private_island: { name: 'جزيرة خاصة', price: 50000000, description: 'جزيرتك الخاصة وسط المحيط', emoji: '🏝️', duration: 999, image: 'https://images.unsplash.com/photo-1559128010-7c1ad6e1b6a5?q=80&w=800' },

        // أدوات وحماية
        shield: { name: 'درع معدني', price: 5000, description: 'حماية من السرقة لـ 24 ساعة', emoji: '🛡️', duration: 1, image: 'https://images.unsplash.com/photo-1588600878108-578307a3cc9d?q=80&w=800' },
        moneybag: { name: 'كيس المال', price: 1000, description: 'يحتوي على مبلغ عشوائي', emoji: '💰', duration: 1, image: 'https://images.unsplash.com/photo-1579621970588-a35d0e7ab9b6?q=80&w=800' },
        vip_badge: { name: 'شارة VIP', price: 50000, description: 'شارة VIP الخاصة بالمليارديرات', emoji: '👑', duration: 30, image: 'https://images.unsplash.com/photo-1604147706283-d7119b5b822c?q=80&w=800' },
        rob_immunity: { name: 'حصانة دائمة', price: 100000, description: 'لا أحد يستطيع سرقتك أبداً', emoji: '⚔️', duration: 999, image: 'https://images.unsplash.com/photo-1614030424734-7a329d93e8e2?q=80&w=800' },
        
        // ترقيات
        bankextend: { name: 'توسعة البنك', price: 20000, description: 'زيادة سعة البنك بمقدار 50,000', emoji: '🏦', duration: 999, image: 'https://images.unsplash.com/photo-1501167786227-4cba60f6d58f?q=80&w=800' },
        vault: { name: 'خزنة شخصية', price: 50000, description: 'خزنة لا يمكن سرقتها', emoji: '🔐', duration: 999, image: 'https://images.unsplash.com/photo-1582139329536-e7284fece509?q=80&w=800' },
        xp_boost_large: { name: 'مضاعف الخبرة (أسبوع)', price: 15000, description: 'مضاعف للخبرة لمدة 7 أيام', emoji: '⚡', duration: 7, image: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?q=80&w=800' }
    },

    // ─── ألوان البروفايل المتاحة ─────────────────────────────────
    availableColors: {
        red: { name: 'أحمر ناري', hex: '#FF0000', emoji: '🔴' },
        blue: { name: 'أزرق سماوي', hex: '#0099FF', emoji: '🔵' },
        green: { name: 'أخضر زمردي', hex: '#00FF00', emoji: '🟢' },
        gold: { name: 'ذهبي فاخر', hex: '#FFD700', emoji: '🟡' },
        purple: { name: 'بنفسجي ملكي', hex: '#9B59B6', emoji: '🟣' },
        pink: { name: 'وردي', hex: '#FF69B4', emoji: '🌸' },
        orange: { name: 'برتقالي', hex: '#FF8C00', emoji: '🟠' },
        cyan: { name: 'سماوي فاتح', hex: '#00FFFF', emoji: '💠' },
        black: { name: 'أسود أنيق', hex: '#000000', emoji: '⚫' },
        white: { name: 'أبيض ناصع', hex: '#FFFFFF', emoji: '⚪' }
    },

    // ─── إعدادات المنشن الوهمي (Ghost Ping) ─────────────────────
    ghostPingEnabled: false,          // معطّل بشكل افتراضي (يشغّله المالك من الداشبورد)
    ghostPingInterval: 21600000,      // كل 6 ساعات (بدلاً من 10 دقائق)
};