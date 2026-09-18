# 🤖 بوت Discord الاحترافي الشامل

## 🚀 التشغيل السريع

```bash
npm install
node index.js
```

يستخدم البوت MongoDB فقط. أنشئ ملف `.env` وضع القيم التالية قبل التشغيل:

```env
DISCORD_TOKEN=...
OWNER_ID=...
MONGODB_URI=mongodb+srv://...
JWT_SECRET=ضع_قيمة_عشوائية_بطول_32_حرفا_على_الأقل
DASHBOARD_KEY=ضع_مفتاحا_عشوائيا_بطول_16_حرفا_على_الأقل
DASHBOARD_ORIGIN=https://example.com
```

إذا كانت لديك بيانات قديمة في `data/economy.json` شغّل الترحيل مرة واحدة:

```bash
node scripts/migrate-db.js
```

ملفات SQLite القديمة مثل `data/bot.db` ليست جزءاً من التشغيل الحالي ولا تتم قراءتها.

## 📊 الإحصائيات

- ✅ **115+ أمر** (عربي + إنجليزي)
- ✅ **19 لعبة** (كلاسيكية + كازينو + ذكاء)
- ✅ **10 أنظمة حماية**
- ✅ **6 أنظمة اقتصادية متقدمة**
- ✅ **12 أمر إداري**
- ✅ **أتمتة ذكية**
- ✅ **ميزات اجتماعية**

## 🎮 أهم الأوامر

### الاقتصاد
```
رصيد - يومي - راتب - عمل
بورصة قائمة - عقار شراء house - شركة إنشاء
```

### الألعاب
```
!poker 1000 - !roulette red 500 - !crash 500 2.5
مسابقة - رياضيات - ذاكرة - تخمين
```

### الإدارة
```
!warn @user - !purge 50 - !lock - !serverstats
```

### اجتماعي
```
!marry @user - !addfriend @user - !guild create
```

### تطور
```
!prestige - !skills - !badges
```

## 📁 الملفات الرئيسية

```
commands/
  ├── economy-advanced.js    # البورصة، المزادات، القروض، العقارات، الشركات، التأمين
  ├── casino-premium.js      # Poker, Roulette, Crash, Baccarat
  ├── admin-advanced.js      # 12 أمر إداري متقدم
  ├── fun.js                 # حظك، Ship، Facts، Meme
  ├── social.js              # Friends، Marriage، Guilds
  └── games-advanced.js      # Trivia، Math، Memory، Hangman

utils/
  ├── levels-enhanced.js     # Prestige، Skills، Badges
  ├── auto-tasks.js          # 6 مهام تلقائية
  ├── protect-advanced.js    # حماية متقدمة
  └── embed-builder.js       # نظام Embeds احترافي
```

## ⚙️ الإعدادات

الإعدادات الحساسة لا توضع داخل `config.js`، بل داخل متغيرات البيئة فقط.

## ✨ الميزات البارزة

1. **دعم ثنائي اللغة** - كل الأوامر بالعربي والإنجليزي
2. **Embeds احترافية** - 10+ قوالب جاهزة
3. **اقتصاد ديناميكي** - أسعار متحركة، تفاعل بين اللاعبين
4. **حماية شاملة** - 10 أنظمة حماية تلقائية
5. **أتمتة ذكية** - مهام تلقائية يومية
6. **نظام Prestige** - إعادة تعيين للمكافآت
7. **قبائل** - نظام Guilds/Clans متكامل

## 🎯 جاهز للإنتاج!

البوت مكتمل ومختبر. ابدأ الآن! 🚀
