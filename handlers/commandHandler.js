'use strict';

const fs = require('fs');
const path = require('path');
const { Collection } = require('discord.js');

/**
 * يحمّل جميع ملفات الأوامر بشكل تعاودي من مجلد commands/.
 * كل ملف أمر يجب أن يُصدِّر { name, execute } كحد أدنى.
 * الأليَاسات (aliases) تُسجَّل في client.aliases بشكل منفصل.
 *
 * @param {import('discord.js').Client} client
 */
module.exports = (client) => {
    client.commands = new Collection();
    client.aliases = new Collection(); // ← Map: alias → اسم الأمر الرئيسي

    const commandsPath = path.join(__dirname, '../commands');

    // التأكد من وجود مجلدات الأوامر
    const categories = ['fun', 'moderation', 'economy', 'social', 'games', 'main'];
    for (const cat of categories) {
        const dir = path.join(commandsPath, cat);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    }

    let loaded = 0;
    let failed = 0;

    _loadFromDir(commandsPath, commandsPath, client, () => { loaded++; }, () => { failed++ });

    console.log(`[CommandHandler] ✅ تم تحميل ${loaded} أمر${failed > 0 ? ` | ⚠️ فشل ${failed}` : ''}`);
};

/**
 * تحميل تعاودي للأوامر من مجلد معين.
 * يتجاوز الملفات في المجلد الجذري (commandsPath مباشرةً)،
 * ويُحمِّل فقط ما هو داخل المجلدات الفرعية (categories).
 */
function _loadFromDir(dir, rootPath, client, onSuccess, onFail) {
    let entries;
    try {
        entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch (e) {
        console.error(`[CommandHandler] لا يمكن قراءة المجلد: ${dir}`, e.message);
        return;
    }

    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
            _loadFromDir(fullPath, rootPath, client, onSuccess, onFail);
            continue;
        }

        // تجاهل الملفات في المجلد الجذري (ليست أوامر)
        if (dir === rootPath) continue;
        if (!entry.name.endsWith('.js')) continue;

        try {
            const command = require(fullPath);

            // التحقق من صحة الأمر
            if (typeof command.name !== 'string' || typeof command.execute !== 'function') {
                console.warn(`[CommandHandler] ⚠️ تم تجاهل ${entry.name} — يجب أن يُصدّر { name, execute }`);
                onFail();
                continue;
            }

            const cmdName = command.name.toLowerCase();

            // تسجيل الأمر الرئيسي
            client.commands.set(cmdName, command);

            // تسجيل كل اسم مستعار في client.aliases
            if (Array.isArray(command.aliases)) {
                for (const alias of command.aliases) {
                    if (typeof alias !== 'string') continue;
                    const aliasLower = alias.toLowerCase();

                    // تحقق: هل الاسم المستعار مُسجَّل كأمر رئيسي؟
                    if (client.commands.has(aliasLower)) {
                        console.warn(`[CommandHandler] ⚠️ تعارض alias: "${aliasLower}" في ${entry.name} (يتعارض مع أمر آخر)`);
                        continue;
                    }
                    // تحقق: هل مُسجَّل بالفعل كـ alias لأمر آخر؟
                    if (client.aliases.has(aliasLower)) {
                        console.warn(`[CommandHandler] ⚠️ تعارض alias: "${aliasLower}" في ${entry.name} (مسجَّل مسبقاً لـ: ${client.aliases.get(aliasLower)})`);
                        continue;
                    }
                    client.aliases.set(aliasLower, cmdName);
                }
            }

            onSuccess();
        } catch (err) {
            console.error(`[CommandHandler] ❌ فشل تحميل ${entry.name}:`, err.message);
            onFail();
        }
    }
}
