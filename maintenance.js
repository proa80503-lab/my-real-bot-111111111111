#!/usr/bin/env node
/**
 * ╔══════════════════════════════════════════════════════════╗
 * ║          🔧 أداة الصيانة والتحديث التلقائي              ║
 * ║              Bot Maintenance & Auto-Fix Tool             ║
 * ║                    v2.0.0 — 2026                        ║
 * ╚══════════════════════════════════════════════════════════╝
 *
 * الاستخدام:  node maintenance.js
 * الوصف:      يفحص البوت بالكامل ويصلح المشاكل الشائعة تلقائياً
 */

'use strict';

const fs = require('fs');
const path = require('path');

// ── ألوان الطرفية ──────────────────────────────────────────
const C = {
    reset: '\x1b[0m',
    bold: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
    white: '\x1b[37m',
    gray: '\x1b[90m',
};

const ROOT = path.join(__dirname);
const DATA = path.join(ROOT, 'data');
const DB_PATH = path.join(DATA, 'database.json');

let totalFixed = 0;
let totalErrors = 0;
let totalWarnings = 0;
const report = [];

// ── أدوات الطباعة ──────────────────────────────────────────
function log(icon, color, label, msg) {
    console.log(`${color}${C.bold}${icon} [${label}]${C.reset} ${msg}`);
}
const OK = (m) => { log('✅', C.green, 'تم', m); totalFixed++; };
const WARN = (m) => { log('⚠️ ', C.yellow, 'تحذير', m); totalWarnings++; report.push(`⚠️ ${m}`); };
const ERR = (m) => { log('❌', C.red, 'خطأ', m); totalErrors++; report.push(`❌ ${m}`); };
const INFO = (m) => log('ℹ️ ', C.cyan, 'معلومة', m);
const HEAD = (m) => console.log(`\n${C.bold}${C.blue}═══ ${m} ═══${C.reset}`);

// ════════════════════════════════════════════════════════════
// 1. فحص الملفات الأساسية
// ════════════════════════════════════════════════════════════
function checkCoreFiles() {
    HEAD('فحص الملفات الأساسية');

    const required = [
        'index.js',
        'config.js',
        'package.json',
        'utils/database.js',
        'utils/levels.js',
        'utils/embed-builder.js',
        'events/messageCreate.js',
        'events/interactionCreate.js',
        'events/ready.js',
        'commands/economy/company.js',
        'commands/economy/daily.js',
        'commands/economy/work.js',
        'commands/economy/rob.js',
        'commands/economy/deposit.js',
        'commands/economy/withdraw.js',
        'commands/moderation/setup.js',
        'commands/main/help.js',
    ];

    for (const rel of required) {
        const full = path.join(ROOT, rel);
        if (fs.existsSync(full)) {
            OK(`موجود: ${rel}`);
        } else {
            ERR(`مفقود: ${rel}`);
        }
    }
}

// ════════════════════════════════════════════════════════════
// 2. فحص package.json والمكتبات
// ════════════════════════════════════════════════════════════
function checkDependencies() {
    HEAD('فحص المكتبات');

    const pkgPath = path.join(ROOT, 'package.json');
    if (!fs.existsSync(pkgPath)) return ERR('package.json غير موجود!');

    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    const deps = Object.keys(pkg.dependencies || {});
    const nodeModules = path.join(ROOT, 'node_modules');

    const required = ['discord.js', 'axios'];
    for (const dep of required) {
        const depPath = path.join(nodeModules, dep);
        if (!fs.existsSync(depPath)) {
            ERR(`مكتبة مفقودة: ${dep} — شغّل: npm install ${dep}`);
        } else {
            OK(`مكتبة موجودة: ${dep}`);
        }
    }

    // نسخة discord.js
    try {
        const djsPkg = JSON.parse(fs.readFileSync(path.join(nodeModules, 'discord.js', 'package.json'), 'utf8'));
        const version = djsPkg.version;
        const major = parseInt(version.split('.')[0]);
        if (major < 14) {
            WARN(`نسخة discord.js قديمة (${version}) — يُنصح بالتحديث لـ v14+`);
        } else {
            OK(`discord.js v${version} ✓`);
        }
    } catch (e) { /* ignore */ }
}

// ════════════════════════════════════════════════════════════
// 3. فحص قاعدة البيانات وإصلاحها
// ════════════════════════════════════════════════════════════
function checkAndFixDatabase() {
    HEAD('فحص قاعدة البيانات');

    // إنشاء مجلد data إذا لم يكن موجوداً
    if (!fs.existsSync(DATA)) {
        fs.mkdirSync(DATA, { recursive: true });
        OK('تم إنشاء مجلد data/');
    }

    // إنشاء قاعدة البيانات إذا لم تكن موجودة
    if (!fs.existsSync(DB_PATH)) {
        const emptyDb = { users: {}, guilds: {} };
        fs.writeFileSync(DB_PATH, JSON.stringify(emptyDb, null, 2));
        OK('تم إنشاء database.json فارغة');
        return;
    }

    // قراءة وفحص قاعدة البيانات
    let db;
    try {
        const raw = fs.readFileSync(DB_PATH, 'utf8');
        db = JSON.parse(raw);
    } catch (e) {
        ERR(`قاعدة البيانات تالفة: ${e.message}`);

        // محاولة استرداد من النسخة الاحتياطية
        const backups = fs.readdirSync(DATA).filter(f => f.startsWith('backup-')).sort().reverse();
        if (backups.length > 0) {
            try {
                db = JSON.parse(fs.readFileSync(path.join(DATA, backups[0]), 'utf8'));
                fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
                OK(`تم الاسترداد من النسخة الاحتياطية: ${backups[0]}`);
            } catch (e2) {
                ERR('فشل الاسترداد من النسخة الاحتياطية');
                return;
            }
        } else {
            db = { users: {}, guilds: {} };
            fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
            WARN('تم إنشاء قاعدة بيانات جديدة (البيانات القديمة مفقودة)');
        }
    }

    if (!db.users) { db.users = {}; WARN('مفتاح users مفقود — تم إضافته'); }
    if (!db.guilds) { db.guilds = {}; WARN('مفتاح guilds مفقود — تم إضافته'); }

    const config = require(path.join(ROOT, 'config.js'));
    let repaired = 0;
    let cooldownsReset = 0;
    const now = Date.now();

    // فحص وإصلاح بيانات كل مستخدم
    for (const [uid, user] of Object.entries(db.users)) {
        let changed = false;

        // الحقول الأساسية
        const defaults = {
            balance: 0,
            bank: 0,
            xp: 0,
            level: 1,
            transactions: [],
        };
        for (const [key, def] of Object.entries(defaults)) {
            if (user[key] === undefined || user[key] === null || isNaN(user[key])) {
                user[key] = Array.isArray(def) ? [] : def;
                changed = true;
            }
        }

        // إصلاح القيم السالبة
        if (user.balance < 0) { user.balance = 0; changed = true; }
        if (user.bank < 0) { user.bank = 0; changed = true; }
        if (user.xp < 0) { user.xp = 0; changed = true; }
        if (user.level < 1) { user.level = 1; changed = true; }

        // إصلاح transactions غير array
        if (!Array.isArray(user.transactions)) {
            user.transactions = [];
            changed = true;
        }
        // الاحتفاظ بآخر 50 معاملة فقط
        if (user.transactions.length > 50) {
            user.transactions = user.transactions.slice(-50);
            changed = true;
        }

        // تنظيف cooldowns المنتهية (lastWork, lastRob, lastDaily, lastWeekly)
        const cooldownKeys = ['lastWork', 'lastRob', 'lastDaily', 'lastWeekly'];
        for (const key of cooldownKeys) {
            if (user[key] && (now - user[key]) > 7 * 24 * 60 * 60 * 1000) {
                delete user[key];
                changed = true;
                cooldownsReset++;
            }
        }

        // إصلاح بيانات الشركة
        if (user.company) {
            if (!Array.isArray(user.company.employees)) { user.company.employees = []; changed = true; }
            if (!Array.isArray(user.company.pendingApps)) { user.company.pendingApps = []; changed = true; }
            if (typeof user.company.profit !== 'number') { user.company.profit = 0; changed = true; }
            if (typeof user.company.hiringOpen !== 'boolean') { user.company.hiringOpen = false; changed = true; }
            if (!user.company.createdAt) { user.company.createdAt = now; changed = true; }
        }

        if (changed) repaired++;
        db.users[uid] = user;
    }

    // حفظ النتائج
    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));

    INFO(`إجمالي المستخدمين: ${Object.keys(db.users).length}`);
    INFO(`إجمالي السيرفرات: ${Object.keys(db.guilds).length}`);

    if (repaired > 0) OK(`تم إصلاح بيانات ${repaired} مستخدم`);
    else OK('جميع بيانات المستخدمين سليمة');

    if (cooldownsReset > 0) OK(`تم تنظيف ${cooldownsReset} cooldown منتهٍ`);

    // نسخة احتياطية تلقائية
    const backupPath = path.join(DATA, `backup-maintenance-${Date.now()}.json`);
    fs.copyFileSync(DB_PATH, backupPath);
    OK(`تم إنشاء نسخة احتياطية: ${path.basename(backupPath)}`);

    // حذف النسخ الاحتياطية القديمة (أكثر من 7 أيام)
    const allBackups = fs.readdirSync(DATA).filter(f => f.startsWith('backup-'));
    let deletedOld = 0;
    for (const bk of allBackups) {
        const ts = parseInt(bk.split('-').pop().replace('.json', ''));
        if (!isNaN(ts) && now - ts > 7 * 24 * 60 * 60 * 1000) {
            fs.unlinkSync(path.join(DATA, bk));
            deletedOld++;
        }
    }
    if (deletedOld > 0) OK(`تم حذف ${deletedOld} نسخة احتياطية قديمة`);
}

// ════════════════════════════════════════════════════════════
// 4. فحص ملفات الأوامر (Syntax Check)
// ════════════════════════════════════════════════════════════
function checkCommands() {
    HEAD('فحص ملفات الأوامر');

    const commandDirs = [
        'commands/economy',
        'commands/games',
        'commands/main',
        'commands/moderation',
        'commands/fun',
        'commands/social',
    ];

    let totalCommands = 0;
    let brokenCommands = 0;

    for (const dir of commandDirs) {
        const fullDir = path.join(ROOT, dir);
        if (!fs.existsSync(fullDir)) {
            WARN(`مجلد غير موجود: ${dir}`);
            continue;
        }

        const files = fs.readdirSync(fullDir).filter(f => f.endsWith('.js'));
        for (const file of files) {
            const filePath = path.join(fullDir, file);
            totalCommands++;
            try {
                const mod = require(filePath);

                // فحص الهيكل الأساسي
                if (!mod.name) {
                    WARN(`${dir}/${file} — لا يحتوي على اسم (name)`);
                }
                if (!mod.execute || typeof mod.execute !== 'function') {
                    WARN(`${dir}/${file} — لا يحتوي على دالة execute`);
                }
            } catch (e) {
                ERR(`${dir}/${file} — خطأ في التحميل: ${e.message}`);
                brokenCommands++;
            }
        }
    }

    INFO(`إجمالي ملفات الأوامر: ${totalCommands}`);
    if (brokenCommands === 0) {
        OK(`جميع الأوامر (${totalCommands}) تُحمّل بنجاح`);
    } else {
        ERR(`${brokenCommands} ملف يحتوي على أخطاء`);
    }
}

// ════════════════════════════════════════════════════════════
// 5. فحص ملفات الأحداث (Events)
// ════════════════════════════════════════════════════════════
function checkEvents() {
    HEAD('فحص ملفات الأحداث');

    const eventsDir = path.join(ROOT, 'events');
    if (!fs.existsSync(eventsDir)) {
        ERR('مجلد events غير موجود!');
        return;
    }

    const files = fs.readdirSync(eventsDir).filter(f => f.endsWith('.js'));
    for (const file of files) {
        const filePath = path.join(eventsDir, file);
        try {
            const mod = require(filePath);
            if (!mod.name) WARN(`events/${file} — لا يحتوي على name`);
            if (!mod.execute) WARN(`events/${file} — لا يحتوي على execute`);
            else OK(`events/${file} ✓`);
        } catch (e) {
            ERR(`events/${file} — خطأ: ${e.message}`);
        }
    }
}

// ════════════════════════════════════════════════════════════
// 6. فحص ملفات الـ Utils
// ════════════════════════════════════════════════════════════
function checkUtils() {
    HEAD('فحص ملفات المساعدة (Utils)');

    const utilsDir = path.join(ROOT, 'utils');
    if (!fs.existsSync(utilsDir)) {
        ERR('مجلد utils غير موجود!');
        return;
    }

    const files = fs.readdirSync(utilsDir).filter(f => f.endsWith('.js'));
    for (const file of files) {
        const filePath = path.join(utilsDir, file);
        try {
            require(filePath);
            OK(`utils/${file} ✓`);
        } catch (e) {
            ERR(`utils/${file} — خطأ: ${e.message}`);
        }
    }
}

// ════════════════════════════════════════════════════════════
// 7. فحص الإعدادات (config.js)
// ════════════════════════════════════════════════════════════
function checkConfig() {
    HEAD('فحص الإعدادات (config.js)');

    let config;
    try {
        config = require(path.join(ROOT, 'config.js'));
    } catch (e) {
        ERR(`خطأ في config.js: ${e.message}`);
        return;
    }

    const required = ['token', 'prefix', 'ownerId', 'currency'];
    for (const key of required) {
        if (!config[key]) {
            ERR(`config.js — مفتاح مفقود أو فارغ: ${key}`);
        } else {
            OK(`config.${key} ✓`);
        }
    }

    // فحص صحة token
    if (config.token && config.token.length < 50) {
        WARN('config.token — يبدو قصيراً جداً، تأكد من صحته');
    }
}

// ════════════════════════════════════════════════════════════
// 8. إصلاح مجلد data
// ════════════════════════════════════════════════════════════
function fixDataFolder() {
    HEAD('فحص مجلد البيانات');

    const required = [DATA];
    for (const dir of required) {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
            OK(`تم إنشاء: ${path.relative(ROOT, dir)}`);
        } else {
            OK(`موجود: ${path.relative(ROOT, dir)}`);
        }
    }

    // فحص status.json
    const statusPath = path.join(DATA, 'status.json');
    if (!fs.existsSync(statusPath)) {
        const defaultStatus = { type: 'WATCHING', text: 'اكتب !help للمساعدة', status: 'online' };
        fs.writeFileSync(statusPath, JSON.stringify(defaultStatus, null, 2));
        OK('تم إنشاء status.json بالإعدادات الافتراضية');
    } else {
        OK('status.json موجود ✓');
    }
}

// ════════════════════════════════════════════════════════════
// 9. إعادة تعيين cooldowns المستخدم (اختياري)
// ════════════════════════════════════════════════════════════
function resetAllCooldowns() {
    HEAD('إعادة تعيين الـ Cooldowns');

    if (!fs.existsSync(DB_PATH)) {
        WARN('قاعدة البيانات غير موجودة');
        return;
    }

    const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
    let count = 0;

    for (const [uid, user] of Object.entries(db.users)) {
        const keys = ['lastWork', 'lastRob', 'lastDaily', 'lastWeekly'];
        for (const key of keys) {
            if (user[key]) {
                delete user[key];
                count++;
            }
        }
        db.users[uid] = user;
    }

    if (count > 0) {
        fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
        OK(`تم إعادة تعيين ${count} cooldown لجميع المستخدمين`);
    } else {
        INFO('لا توجد cooldowns لإعادة تعيينها');
    }
}

// ════════════════════════════════════════════════════════════
// التقرير النهائي
// ════════════════════════════════════════════════════════════
function printSummary() {
    console.log(`\n${C.bold}${'═'.repeat(55)}${C.reset}`);
    console.log(`${C.bold}${C.white}                 📋 تقرير الصيانة النهائي${C.reset}`);
    console.log(`${C.bold}${'═'.repeat(55)}${C.reset}\n`);

    console.log(`  ${C.green}${C.bold}✅ إجمالي الإصلاحات:${C.reset}  ${totalFixed}`);
    console.log(`  ${C.yellow}${C.bold}⚠️  إجمالي التحذيرات:${C.reset} ${totalWarnings}`);
    console.log(`  ${C.red}${C.bold}❌ إجمالي الأخطاء:${C.reset}   ${totalErrors}`);

    if (report.length > 0) {
        console.log(`\n${C.bold}${C.yellow}📌 تفاصيل تحتاج انتباهك:${C.reset}`);
        for (const r of report) {
            console.log(`  ${r}`);
        }
    }

    console.log('');
    if (totalErrors === 0 && totalWarnings === 0) {
        console.log(`${C.green}${C.bold}🎉 البوت في حالة ممتازة! لا توجد مشاكل.${C.reset}`);
    } else if (totalErrors === 0) {
        console.log(`${C.yellow}${C.bold}⚠️  البوت يعمل بشكل جيد مع بعض التحذيرات.${C.reset}`);
    } else {
        console.log(`${C.red}${C.bold}❌ يوجد أخطاء تحتاج إصلاح قبل تشغيل البوت.${C.reset}`);
    }

    console.log(`\n${C.gray}  شغّل البوت: node index.js${C.reset}`);
    console.log(`${C.gray}  أعد الصيانة: node maintenance.js${C.reset}\n`);
}

// ════════════════════════════════════════════════════════════
// نقطة البداية الرئيسية
// ════════════════════════════════════════════════════════════
async function main() {
    console.clear();
    console.log(`\n${C.bold}${C.cyan}`);
    console.log('  ╔══════════════════════════════════════════════════╗');
    console.log('  ║     🔧 أداة الصيانة والتحديث التلقائي للبوت     ║');
    console.log('  ║              Bot Maintenance Tool v2.0           ║');
    console.log(`  ║         ${new Date().toLocaleDateString('ar-SA')} — ${new Date().toLocaleTimeString('ar-SA')}              ║`);
    console.log('  ╚══════════════════════════════════════════════════╝');
    console.log(`${C.reset}\n`);

    // تحقق من التشغيل من المجلد الصحيح
    if (!fs.existsSync(path.join(ROOT, 'index.js'))) {
        console.log(`${C.red}${C.bold}❌ يرجى تشغيل الأداة من مجلد البوت!${C.reset}`);
        console.log(`${C.gray}   cd "مجلد البوت" && node maintenance.js${C.reset}\n`);
        process.exit(1);
    }

    // تشغيل جميع الفحوصات
    fixDataFolder();
    checkConfig();
    checkCoreFiles();
    checkDependencies();
    checkAndFixDatabase();

    // فحص الأوامر والأحداث (مع تجاهل أخطاء الـ require المتداخلة)
    // ملاحظة: هذه الفحوصات قد تسبب تحميل مزدوج لبعض الموديولات
    try { checkEvents(); } catch (e) { ERR(`فحص الأحداث: ${e.message}`); }
    try { checkUtils(); } catch (e) { ERR(`فحص المساعدة: ${e.message}`); }
    try { checkCommands(); } catch (e) { ERR(`فحص الأوامر: ${e.message}`); }

    // إعادة تعيين الـ Cooldowns المنتهية (اختياري — افتراضياً لا)
    // resetAllCooldowns();

    printSummary();
}

// تشغيل
main().catch(err => {
    console.error(`\n${C.red}${C.bold}💥 خطأ حرج في الأداة: ${err.message}${C.reset}`);
    console.error(err.stack);
    process.exit(1);
});
