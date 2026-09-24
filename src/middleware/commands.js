'use strict';

const config = require('../../config');
const { isOwner } = require('../../utils/permissions');
const dailyChallenges = require('../../utils/daily-challenges');

let analytics = null;
try { analytics = require('../../utils/analytics'); } catch { }

const MUSIC_CMDS_MULTI = ['تكرار قائمة', 'ايش يشتغل'];
const MUSIC_CMDS = [
    'ش', 'شغّل', 'play',
    'وقف', 'stop', 'اطلع',
    'بوز', 'توقف', 'pause',
    'كمّل', 'كمل', 'resume',
    'تخطي', 'سكيب', 'skip', 'ياي',
    'طابور', 'قائمة', 'queue',
    'صوت', 'vol',
    'تكرار', 'loop',
    'الحين', 'np',
];

const ROOM_COMMANDS = [
    'غرفة جديدة', 'غرف', 'غرفتي', 'حذف غرفة', 'تجديد غرفة',
    'new-room', 'rooms', 'my-room', 'delete-room', 'renew-room',
];

const BASIC_SETUP_TRIGGERS = ['اعداد', 'setup', '!setup'];
// ملاحظة: 'تفعيل' بدون إضافة تنتقل لـ server-setup عبر aliases
const SERVER_SETUP_TRIGGERS = [
    'تفعيل سيرفر', 'تفعيل-سيرفر', 'اعداد سيرفر',
    'setup-server', 'reset-server', 'بناء-سيرفر',
];
const RESET_TRIGGERS = [
    'اعادة تفعيل', 'إعادة تفعيل',
    'اعادةتفعيل', 'إعادةتفعيل',
    'اعادة-تفعيل', 'إعادة-تفعيل',
    'reset'
];
const NUKE_CLAN_TRIGGERS = ['حذف كلانات', 'حذف كلان', 'إلغاء كلانات', 'إلغاء كلان', 'nuke-clans', 'nuke_clans', 'reset-clans'];
const CLAN_TRIGGERS = ['تفعيل كلان', 'تفعيل-كلان', 'setup clans', 'setup-clans', 'كلان', 'كلانات', 'قبائل', 'clan', 'clans'];
const POLL_PREFIXES = ['بول ', 'poll ', 'استطلاع ', 'تصويت '];
const REP_TRIGGERS = ['+rep', 'rep ', 'سمعة ', 'سمعة', 'صدارة سمعة'];

function _lookupCommand(name, client) {
    return client.commands.get(name) ||
        client.commands.get(client.aliases.get(name)) ||
        null;
}

function _resolveCommand(tokens, client) {
    for (let wordCount = Math.min(tokens.length, 4); wordCount >= 1; wordCount--) {
        const key = tokens.slice(0, wordCount).join(' ').toLowerCase();
        const cmd = _lookupCommand(key, client);
        if (cmd) return { command: cmd, wordCount };
    }
    return { command: null, wordCount: 0 };
}

module.exports = async function commandsMiddleware(message) {
    const content = message.content.trim();
    const lowMsg = content.toLowerCase().trim();
    const prefix = config.prefix;

    // ── حذف الكلانات
    if (NUKE_CLAN_TRIGGERS.some(t => lowMsg === t || lowMsg.startsWith(t + ' '))) {
        try {
            const nukeClanCmd = require('../../commands/social/nuke-clans');
            await nukeClanCmd.execute(message);
        } catch (e) { console.error('[NukeClans]', e.message); }
        return false;
    }

    // ── أوامر الكلانات
    if (CLAN_TRIGGERS.some(t => lowMsg === t || lowMsg.startsWith(t + ' '))) {
        try {
            const clansCmd = require('../../commands/social/clans');
            const clanArgs = content.trim().split(/ +/).slice(1);
            if (lowMsg.startsWith('تفعيل كلان') || lowMsg.startsWith('تفعيل-كلان')) {
                await clansCmd.execute(message, ['setup']);
            } else {
                await clansCmd.execute(message, clanArgs);
            }
        } catch (e) { console.error('[Clans]', e.message); }
        return false;
    }

    // ✅ إعادة تفعيل (Reset) — يجب أن يُفحص قبل كل شيء آخر
    if (RESET_TRIGGERS.some(t => lowMsg === t || lowMsg.startsWith(t + ' '))) {
        try {
            const serverSetup = require('../../commands/moderation/server-setup');
            await serverSetup.execute(message, [], { isReset: true });
        } catch (e) { console.error('[ResetServer]', e.message); }
        return false;
    }

    // ── تفعيل سيرفر
    if (SERVER_SETUP_TRIGGERS.some(t => lowMsg === t || lowMsg.startsWith(t + ' '))) {
        try {
            const serverSetup = require('../../commands/moderation/server-setup');
            await serverSetup.execute(message, []);
        } catch (e) { console.error('[ServerSetup]', e.message); }
        return false;
    }

    // ── إعداد الرتب
    if (BASIC_SETUP_TRIGGERS.some(t => lowMsg === t)) {
        try {
            const setupCmd = require('../../commands/moderation/setup');
            await setupCmd.execute(message, []);
        } catch (e) { console.error('[Setup]', e.message); }
        return false;
    }

    // ── غرف
    if (ROOM_COMMANDS.some(cmd => lowMsg === cmd || lowMsg.startsWith(cmd + ' '))) {
        try {
            const roomCreator = require('../../commands/moderation/room-creator');
            const roomArgs = content.split(/ +/).slice(lowMsg.startsWith('غرفة جديدة') ? 2 : 1);
            await roomCreator.execute(message, roomArgs);
        } catch (e) { console.error('[RoomCreator]', e.message); }
        return false;
    }

    // ── استطلاع
    if (POLL_PREFIXES.some(p => lowMsg.startsWith(p))) {
        try {
            const pollCmd = require('../../commands/social/poll');
            const pollArgs = content.split(/ +/).slice(1);
            await pollCmd.execute(message, pollArgs);
        } catch (e) { console.error('[Poll]', e.message); }
        return false;
    }

    // ── سمعة
    if (REP_TRIGGERS.some(t => lowMsg === t || lowMsg.startsWith(t + ' ') || lowMsg.startsWith(t))) {
        if (lowMsg === 'سمعة' || (lowMsg.startsWith('سمعة') && !message.mentions.users.size)) {
            // pass
        } else if (message.mentions.users.size > 0) {
            try {
                const repCmd = require('../../commands/social/reputation');
                const repArgs = content.split(/ +/).slice(1);
                await repCmd.execute(message, repArgs);
            } catch (e) { console.error('[Reputation]', e.message); }
            return false;
        }
    }

    // ── تحديات
    if (lowMsg === 'تحديات' || lowMsg === 'تحدياتي' || lowMsg === 'challenges') {
        try {
            const challengesCmd = require('../../commands/main/challenges');
            await challengesCmd.execute(message, []);
        } catch (e) { console.error('[Challenges]', e.message); }
        return false;
    }

    // ── قول
    if (lowMsg.startsWith('قول ') || lowMsg.startsWith('قل ')) {
        const sayCmd = message.client.commands.get('say');
        if (sayCmd) {
            const sayArgs = content.trim().split(/ +/).slice(1);
            await sayCmd.execute(message, sayArgs);
            return false;
        }
    }

    let isCommand = false;
    let commandName = '';
    let args = [];

    if (content.startsWith(prefix)) {
        args = content.slice(prefix.length).trim().split(/ +/);
        commandName = args.shift().toLowerCase();
        isCommand = true;
    } else {
        const tokens = content.split(/ +/);
        
        let musicCmd = null;
        try { musicCmd = require('../../commands/fun/music'); } catch {}

        if (musicCmd) {
            let musicHandled = false;
            const cmdToken = tokens[0].toLowerCase();
            for (const mc of MUSIC_CMDS_MULTI) {
                if (lowMsg.startsWith(mc)) {
                    const musicArgs = content.slice(mc.length).trim().split(/ +/);
                    await musicCmd.execute(message, musicArgs);
                    musicHandled = true;
                    break;
                }
            }
            if (!musicHandled && MUSIC_CMDS.includes(cmdToken)) {
                const musicArgs = tokens.slice(1);
                await musicCmd.execute(message, musicArgs);
                musicHandled = true;
            }
            if (musicHandled) return false;
        }

        const { command: found, wordCount } = _resolveCommand(tokens, message.client);
        if (found) {
            commandName = tokens.slice(0, wordCount).join(' ').toLowerCase();
            args = tokens.slice(wordCount);
            isCommand = true;
        }
    }

    if (isCommand) {
        const command = _lookupCommand(commandName, message.client);
        if (command) {
            const botSettings = require('../../utils/bot-settings');
            if (botSettings.isCommandDisabled(command.name)) {
                if (message.author.id !== config.ownerId) {
                    message.reply('⛔ هذا الأمر معطل حالياً من قِبل الإدارة.').catch(() => {});
                    return false;
                }
            }

            if (command.ownerOnly && message.author.id !== config.ownerId) {
                message.reply('❌ هذا الأمر للمالك فقط!').catch(() => { });
                return false;
            }

            if (command.permissions && message.member &&
                !isOwner(message.author.id) &&
                !message.member.permissions.has(command.permissions)) {
                message.reply('❌ ليس لديك صلاحية لاستخدام هذا الأمر!');
                return false;
            }

            try {
                const startTime = Date.now();
                await command.execute(message, args);
                
                try {
                    analytics?.trackCommand(commandName, message.author.id, message.guild?.id);
                    const responseMs = Date.now() - startTime;
                    analytics?.trackResponseTime(responseMs);
                } catch {}

                await dailyChallenges.updateProgress(message.author.id, 'messages', 1, message).catch(() => { });
            } catch (error) {
                console.error(`[Command:${commandName}]`, error);
                analytics?.trackError(error, commandName);
                message.reply(`❌ حدث خطأ أثناء تنفيذ الأمر: ${error.message || 'خطأ غير متوقع'}`).catch(() => { });
            }
            return false; // Handled as command, don't pass to AI/XP etc if not needed? Wait, XP shouldn't be blocked.
            // Actually, in the old file, `if (isCommand) { ... return; }`. So yes, command stops the chain.
        }
    }

    return true; // Continue if not a command
};
