'use strict';

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * startup-cleanup.js — تنظيف ملفات التخزين القديمة
 * ─────────────────────────────────────────────────────────────────────────────
 * هذا الملف يُزيل ملفات JSON القديمة التي انتقلت إلى MongoDB
 * لا يمسّ: bot.db (SQLite), logs/
 * يُشغَّل مرة واحدة عند بدء التشغيل
 * ─────────────────────────────────────────────────────────────────────────────
 */

const fs   = require('fs');
const path = require('path');

// الملفات القديمة التي تم ترحيلها إلى MongoDB
const LEGACY_FILES = [
    'data/status.json',           // → bot-settings (botStatus)
    'data/bot-settings.json',     // → BotSetting (MongoDB)
    'data/economy.json.bak',      // نسخ احتياطية قديمة
    'data/economy.json.migrated.bak',
    'data/database.json',         // قاعدة بيانات JSON قديمة
    'data/maintenance.json',      // → bot-settings
    'data/analytics.json',        // → MongoDB أو في الذاكرة
];

// ملفات تُبقى (مستخدمة أو حساسة)
const KEEP_FILES = [
    'data/bot.db',        // SQLite — احتمال استخدام
    'data/bot.db-shm',
    'data/bot.db-wal',
    'data/chat-memory.json',      // مستخدم من ai-brain (تحقق أولاً)
    'data/ai-brain.json',         // مستخدم من ai-brain (تحقق أولاً)
    'data/clans.json',            // تحقق
    'data/daily-challenges.json', // تحقق
    'data/responses.json',        // تحقق
    'data/economy.json',          // تحقق — قد يكون مرجعاً احتياطياً
];

const ROOT = path.join(__dirname, '..');

function cleanupLegacyFiles() {
    let cleaned = 0;
    let skipped = 0;

    for (const relPath of LEGACY_FILES) {
        const fullPath = path.join(ROOT, relPath);
        try {
            if (fs.existsSync(fullPath)) {
                fs.unlinkSync(fullPath);
                console.log(`[Cleanup] ✅ حذف ملف قديم: ${relPath}`);
                cleaned++;
            }
        } catch (err) {
            console.warn(`[Cleanup] ⚠️ لم يتم حذف ${relPath}:`, err.message);
            skipped++;
        }
    }

    if (cleaned > 0 || skipped > 0) {
        console.log(`[Cleanup] 🗑️ تنظيف: حُذف ${cleaned} ملف | تخطّى ${skipped}`);
    }
}

/**
 * تحقق ما إذا كانت ملفات JSON القديمة لا تزال مستخدمة في الكود
 * (تقرير للـ console فقط)
 */
function auditLegacyUsage() {
    const checks = [
        { file: 'data/chat-memory.json',    usedIn: 'utils/ai-brain.js أو utils/chat-learner.js' },
        { file: 'data/ai-brain.json',       usedIn: 'utils/ai-brain.js' },
        { file: 'data/clans.json',          usedIn: 'utils/clan-manager.js' },
        { file: 'data/economy.json',        usedIn: 'مرجع احتياطي' },
    ];

    for (const check of checks) {
        const fullPath = path.join(ROOT, check.file);
        if (fs.existsSync(fullPath)) {
            const stat = fs.statSync(fullPath);
            const sizeMB = (stat.size / 1024 / 1024).toFixed(2);
            console.log(`[StorageAudit] 📁 ${check.file} (${sizeMB} MB) — مستخدم في: ${check.usedIn}`);
        }
    }
}

module.exports = { cleanupLegacyFiles, auditLegacyUsage };
