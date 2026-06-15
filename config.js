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

    // ─── أيتمز المتجر ─────────────────────────────────────────────
    shopItems: {
        // أدوات عمل
        pickaxe: { name: 'معول', price: 1000, description: 'زيادة أرباح العمل 20%', emoji: '⛏️', duration: 7 },
        fishing_rod: { name: 'صنارة صيد', price: 1500, description: 'صيد أسماك ثمينة', emoji: '🎣', duration: 7 },
        laptop: { name: 'لابتوب', price: 5000, description: 'زيادة أرباح العمل 50%', emoji: '💻', duration: 14 },

        // حماية
        shield: { name: 'درع', price: 2000, description: 'حماية من السرقة', emoji: '🛡️', duration: 7 },
        armor: { name: 'درع قوي', price: 5000, description: 'حماية كاملة', emoji: '🛡️', duration: 30 },

        // بوستات
        xp_boost_small: { name: 'بوست XP صغير', price: 3000, description: 'XP x2 (يوم)', emoji: '⚡', duration: 1 },
        xp_boost_large: { name: 'بوست XP كبير', price: 10000, description: 'XP x5 (أسبوع)', emoji: '⚡', duration: 7 },
        coin_boost: { name: 'بوست عملة', price: 5000, description: 'أرباح x2 (يومين)', emoji: '💰', duration: 2 },

        // تيمات وألوان
        vip_badge: { name: 'شارة VIP', price: 10000, description: 'شارة VIP خاصة', emoji: '👑', duration: 30 },
        profileColor: { name: 'لون البروفايل', price: 3000, description: 'اختر لون بروفايلك', emoji: '🎨', duration: 30 },
        custom_title: { name: 'لقب مخصص', price: 15000, description: 'اختر لقبك', emoji: '📛', duration: 30 },

        // حيوانات
        cat: { name: 'قطة', price: 5000, description: 'دخل يومي +50', emoji: '🐱', duration: 999 },
        dog: { name: 'كلب', price: 6000, description: 'دخل يومي +60', emoji: '🐕', duration: 999 },

        // سيارات ومنازل
        car: { name: 'سيارة', price: 20000, description: 'سيارة فخمة', emoji: '🚗', duration: 999 },
        house: { name: 'منزل', price: 50000, description: 'منزل جميل', emoji: '🏠', duration: 999 },

        // أيتمز خاصة
        lottery_ticket: { name: 'تذكرة يانصيب', price: 500, description: 'فرصة للفوز!', emoji: '🎫', duration: 1 },
        gift_box: { name: 'صندوق', price: 1000, description: '100-5000 عشوائي', emoji: '🎁', duration: 1 },
        lucky_charm: { name: 'تميمة حظ', price: 12000, description: 'حظ +25%', emoji: '🍀', duration: 7 }
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