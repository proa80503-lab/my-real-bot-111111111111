'use strict';

const { Events } = require('discord.js');
const config = require('../config');
const axios = require('axios');
const db = require('../utils/database');
const levels = require('../utils/levels');
const protection = require('../utils/protection');
const securityMonitor = require('../utils/security-monitor');
const chatLearner = require('../utils/chat-learner');
const { isOwner } = require('../utils/permissions');
const randomInteractions = require('../utils/random-interactions');
const aiBrain = require('../utils/ai-brain');
const dailyChallenges = require('../utils/daily-challenges');

// ── التحليلات والأمان المتقدم ───────────────────────────────────────────────
let analytics = null;
let advSecurity = null;
let personaEngine = null;
let _achievementsCmd = null; // محمّل مرة واحدة فقط ← تحسين الأداء
try { analytics = require('../utils/analytics'); } catch { /* اختياري */ }
try { advSecurity = require('../utils/advanced-security'); } catch { /* اختياري */ }
try { personaEngine = require('../utils/persona-engine').personaEngine; } catch { /* اختياري */ }
try { _achievementsCmd = require('../commands/main/achievements-cmd'); } catch { /* اختياري */ }

// ─── أوامر الموسيقى المختصرة ───────────────────────────────────────────────
let musicCmd = null;
try {
    musicCmd = require('../commands/fun/music');
} catch {
    // ملف الموسيقى غير موجود — تجاهل بصمت
}

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

// ─── أوامر الغرف بدون برفكس ────────────────────────────────────────────────
const ROOM_COMMANDS = [
    'غرفة جديدة', 'غرف', 'غرفتي', 'حذف غرفة', 'تجديد غرفة',
    'new-room', 'rooms', 'my-room', 'delete-room', 'renew-room',
];

// ─── إعداد الرتب (تفعيل) — مطابقة كاملة ───────────────────────────
const BASIC_SETUP_TRIGGERS = [
    'تفعيل', 'اعداد', 'setup', '!setup'
];

// ─── إعداد السيرفر الكامل (تفعيل سيرفر) — مطابقة كاملة ────────────
const SERVER_SETUP_TRIGGERS = [
    'تفعيل سيرفر', 'تفعيل-سيرفر', 'اعادة تفعيل سيرفر', 'setup-server', 'reset-server', 'بناء-سيرفر'
];

// أوامر الكلانات — محمية من التعارض
// حذف كلانات / حذف كلان — تعالج قبل CLAN_TRIGGERS لتجنب التعارض
const NUKE_CLAN_TRIGGERS = [
    'حذف كلانات', 'حذف كلان',
    'إلغاء كلانات', 'إلغاء كلان',
    'nuke-clans', 'nuke_clans', 'reset-clans',
];

const CLAN_TRIGGERS = [
    'تفعيل كلان', 'تفعيل-كلان', 'setup clans', 'setup-clans',
    'كلان', 'كلانات', 'قبائل', 'clan', 'clans'
];

// ─── أوامر بول ────────────────────────────────────────────────────────────
const POLL_PREFIXES = ['بول ', 'poll ', 'استطلاع ', 'تصويت '];

// ─── أوامر rep ────────────────────────────────────────────────────────────
const REP_TRIGGERS = ['+rep', 'rep ', 'سمعة ', 'سمعة', 'صدارة سمعة'];

// XP Cooldown
const xpCooldowns = new Map();
const XP_COOLDOWN = 30000;

// تنظيف xpCooldowns كل 5 دقائق
const _xpCleanup = setInterval(() => {
    const now = Date.now();
    for (const [uid, ts] of xpCooldowns) {
        if (now - ts > XP_COOLDOWN) xpCooldowns.delete(uid);
    }
}, 5 * 60 * 1000);
_xpCleanup.unref?.();

module.exports = {
    name: Events.MessageCreate,

    async execute(message) {
        if (message.author.bot) return;

        let content = message.content.trim();
        const prefix = config.prefix;
        const lowMsg = content.toLowerCase().trim();

        // ── تسجيل الرسالة في AI Brain (دائماً)
        if (message.guild) {
            try {
                aiBrain.recordUserMessage(
                    message.author.id,
                    message.author.displayName || message.author.username,
                    content,
                    message.guild.id
                );
            } catch { /* silent */ }

            // ── تتبع التحليلات والسلوك ────────────────────────────────────
            try {
                analytics?.trackMessage(message.author.id, message.guild.id);
                const profile = advSecurity?.getProfile(message.author.id);
                profile?.addMessage(message);

                // كشف الساعات الخاصة (إنجازات) — محمّل مرة واحدة من أعلى
                _achievementsCmd?.checkAchievements?.(message.author.id, 'night_owl', {}, message).catch(() => {});
            } catch { /* silent */ }
        }

        // ── 🔑 أوامر المالك الخاصة — #1 أو داشبورد → يرسل رابط لوحة التحكم عبر DM
        if (message.author.id === config.ownerId) {
            const ownerTriggers = ['#1', '!#1', 'داشبورد', 'dashboard', '!داشبورد', '!dashboard', 'لوحة', 'panel'];
            if (ownerTriggers.includes(lowMsg)) {
                try {
                    // جلب رابط الداشبورد الآمن
                    let dashUrl = null;
                    try {
                        const dashMod = require('../dashboard-server');
                        dashUrl = dashMod.getDashboardUrl?.();
                    } catch {}

                    const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

                    const embed = new EmbedBuilder()
                        .setColor('#5865f2')
                        .setTitle('🎛️ لوحة التحكم الاحترافية')
                        .setDescription([
                            '```',
                            '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
                            '   🤖  رابط لوحة التحكم جاهز  🤖',
                            '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
                            '```',
                            dashUrl
                                ? `> 🔗 **الرابط:** ${dashUrl}`
                                : '> ⚠️ لوحة التحكم غير مُشغَّلة حالياً',
                            '',
                            '> 🔒 الرابط يحتوي على مفتاح أمان خاص — لا تشاركه مع أحد',
                        ].join('\n'))
                        .addFields(
                            { name: '📊 الأقسام المتاحة', value: '`نظرة عامة` • `الأوامر` • `الاقتصاد` • `السيرفرات` • `السجلات` • `النظام`', inline: false },
                            { name: '🌐 البيئة', value: process.env.RENDER_EXTERNAL_URL ? '☁️ Render Cloud' : '💻 Local', inline: true },
                            { name: '⏱️ وقت التشغيل', value: (() => { const u = process.uptime(); const h = Math.floor(u/3600), m = Math.floor((u%3600)/60); return `${h}h ${m}m`; })(), inline: true },
                        )
                        .setFooter({ text: '👑 لوحة تحكم المالك الحصرية — My Real Bot' })
                        .setTimestamp();

                    const row = new ActionRowBuilder().addComponents(
                        new ButtonBuilder()
                            .setLabel('🌐 فتح لوحة التحكم')
                            .setStyle(ButtonStyle.Link)
                            .setURL(dashUrl || 'https://discord.com')
                            .setDisabled(!dashUrl),
                    );

                    // إرسال في الخاص
                    await message.author.send({ embeds: [embed], components: [row] }).catch(async () => {
                        // إذا كانت الخاصة مغلقة، نرسل في نفس القناة
                        await message.reply({ embeds: [embed], components: [row] });
                    });

                    // تأكيد مرئي في القناة (إيموجي فقط لعدم الإفصاح)
                    await message.react('✅').catch(() => {});
                } catch (e) {
                    console.error('[DashboardDM] خطأ:', e.message);
                }
                return;
            }

            // أوامر لوحة التحكم الديسكورد الداخلية (owner-dashboard)
            const discordDashTriggers = ['هيلب', 'help', '!help'];
            if (discordDashTriggers.includes(lowMsg)) {
                try {
                    const ownerDashboard = require('../commands/main/owner-dashboard');
                    await ownerDashboard.sendOwnerDashboard(message);
                } catch (e) {
                    console.error('[OwnerDashboard] خطأ:', e.message);
                }
                return;
            }
        }


        // ── حذف الكلانات (nuke) — تعالج قبل أوامر الكلان العادية لتجنب التعارض
        if (NUKE_CLAN_TRIGGERS.some(t => lowMsg === t || lowMsg.startsWith(t + ' '))) {
            try {
                const nukeClanCmd = require('../commands/social/nuke-clans');
                await nukeClanCmd.execute(message);
            } catch (e) {
                console.error('[NukeClans] خطأ:', e.message);
                message.reply('❌ خطأ في أمر حذف الكلانات: ' + e.message).catch(() => {});
            }
            return;
        }

        // ── أوامر الكلانات (تقدم على تفعيل السيرفر لمنع التعارض)
        if (CLAN_TRIGGERS.some(t => lowMsg === t || lowMsg.startsWith(t + ' '))) {
            try {
                const clansCmd = require('../commands/social/clans');
                const clanArgs = content.trim().split(/ +/).slice(1);
                // إذا كانت 'تفعيل كلان' أرسل args = ['اعداد']
                if (lowMsg.startsWith('تفعيل كلان') || lowMsg.startsWith('تفعيل-كلان')) {
                    await clansCmd.execute(message, ['setup']);
                } else {
                    await clansCmd.execute(message, clanArgs);
                }
            } catch (e) {
                console.error('[Clans] خطأ:', e.message);
                message.reply('❌ خطأ في نظام الكلانات: ' + e.message).catch(() => {});
            }
            return;
        }

        // ── إعداد الرتب الأساسية (تفعيل)
        if (BASIC_SETUP_TRIGGERS.some(t => lowMsg === t)) {
            try {
                const setupCmd = require('../commands/moderation/setup');
                await setupCmd.execute(message, []);
            } catch (e) {
                console.error('[Setup] خطأ:', e.message);
                message.reply('❌ حدث خطأ في إعداد الرتب: ' + e.message).catch(() => {});
            }
            return;
        }

        // ── تفعيل/إعادة تفعيل السيرفر الكامل
        if (SERVER_SETUP_TRIGGERS.some(t => lowMsg === t)) {
            try {
                const serverSetup = require('../commands/moderation/server-setup');
                await serverSetup.execute(message, []);
            } catch (e) {
                console.error('[ServerSetup] خطأ:', e.message);
                message.reply('❌ حدث خطأ في إعداد السيرفر: ' + e.message).catch(() => {});
            }
            return;
        }

        // ── أوامر الغرف بدون برفكس
        if (ROOM_COMMANDS.some(cmd => lowMsg === cmd || lowMsg.startsWith(cmd + ' '))) {
            try {
                const roomCreator = require('../commands/moderation/room-creator');
                const roomArgs = content.split(/ +/).slice(lowMsg.startsWith('غرفة جديدة') ? 2 : 1);
                await roomCreator.execute(message, roomArgs);
            } catch (e) {
                console.error('[RoomCreator] خطأ:', e.message);
                message.reply('❌ خطأ في نظام الغرف: ' + e.message).catch(() => { });
            }
            return;
        }

        // ── أوامر الاستطلاع (بول)
        if (POLL_PREFIXES.some(p => lowMsg.startsWith(p))) {
            try {
                const pollCmd = require('../commands/social/poll');
                const pollArgs = content.split(/ +/).slice(1);
                await pollCmd.execute(message, pollArgs);
            } catch (e) {
                console.error('[Poll] خطأ:', e.message);
            }
            return;
        }

        // ── أوامر السمعة
        if (REP_TRIGGERS.some(t => lowMsg === t || lowMsg.startsWith(t + ' ') || lowMsg.startsWith(t))) {
            if (lowMsg === 'سمعة' || (lowMsg.startsWith('سمعة') && !message.mentions.users.size)) {
                // عرض سمعة النفس — يمر للأوامر العادية
            } else if (message.mentions.users.size > 0) {
                try {
                    const repCmd = require('../commands/social/reputation');
                    const repArgs = content.split(/ +/).slice(1);
                    await repCmd.execute(message, repArgs);
                } catch (e) {
                    console.error('[Reputation] خطأ:', e.message);
                }
                return;
            }
        }

        // ── أمر التحديات
        if (lowMsg === 'تحديات' || lowMsg === 'تحدياتي' || lowMsg === 'challenges') {
            try {
                const challengesCmd = require('../commands/main/challenges');
                await challengesCmd.execute(message, []);
            } catch (e) {
                console.error('[Challenges] خطأ:', e.message);
            }
            return;
        }

        // ── أمر "قول/قل" بدون prefix
        if (lowMsg.startsWith('قول ') || lowMsg.startsWith('قل ')) {
            const sayCmd = message.client.commands.get('say');
            if (sayCmd) {
                const sayArgs = content.trim().split(/ +/).slice(1);
                return await sayCmd.execute(message, sayArgs);
            }
        }

        // ── فحص الحماية المتقدمة (الأولوية القصوى)
        if (message.guild) {
            if (await securityMonitor.checkTokenSniffing(message)) return;
            if (await securityMonitor.checkPhishing(message)) return;
            if (await protection.checkSpam(message)) return;
            if (await protection.checkBadWords(message)) return;

            if (message.member && !message.member.permissions.has('Administrator')) {
                if (await protection.checkDuplicateMessages(message)) return;
                if (await protection.checkMentionSpam(message)) return;
                if (await protection.checkEmojiSpam(message)) return;
                if (await protection.checkCaps(message)) return;
            }
        }

        // ── تحليل الأمر
        let isCommand = false;
        let commandName = '';
        let args = [];

        if (content.startsWith(prefix)) {
            args = content.slice(prefix.length).trim().split(/ +/);
            commandName = args.shift().toLowerCase();
            isCommand = true;
        } else {
            const tokens = content.split(/ +/);

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

                if (musicHandled) return;
            }

            const { command: found, wordCount } = _resolveCommand(tokens, message.client);
            if (found) {
                commandName = tokens.slice(0, wordCount).join(' ').toLowerCase();
                args = tokens.slice(wordCount);
                isCommand = true;
            }
        }

        // ── تنفيذ الأمر
        if (isCommand) {
            const command = _lookupCommand(commandName, message.client);

            if (command) {
                // فحص صلاحيات
                if (command.ownerOnly && message.author.id !== config.ownerId) {
                    return message.reply('❌ هذا الأمر للمالك فقط!').catch(() => { });
                }
                if (command.permissions && message.member &&
                    !isOwner(message.author.id) &&
                    !message.member.permissions.has(command.permissions)) {
                    return message.reply('❌ ليس لديك صلاحية لاستخدام هذا الأمر!');
                }

                try {
                    const startTime = Date.now();
                    await command.execute(message, args);

                    // ── تتبع الأمر في التحليلات ────────────────────────────
                    try {
                        analytics?.trackCommand(commandName, message.author.id, message.guild?.id);
                        const responseMs = Date.now() - startTime;
                        analytics?.trackResponseTime(responseMs);
                    } catch { /* silent */ }

                    // تحديث تحدي الرسائل
                    await dailyChallenges.updateProgress(message.author.id, 'messages', 1, message).catch(() => { });

                } catch (error) {
                    console.error(`[Command:${commandName}]`, error);
                    analytics?.trackError(error, commandName);
                    message.reply(`❌ حدث خطأ أثناء تنفيذ الأمر: ${error.message || 'خطأ غير متوقع'}`).catch(() => { });
                }
                return;
            }
        }

        // ── ما بعد الأوامر
        const isPublicChannel = message.guild
            ? (message.channel.permissionsFor(message.guild.roles.everyone)?.has('SendMessages') ?? true)
            : true;

        if (!isPublicChannel) return;

        if (!isCommand) {
            const isRestricted = protection.isPersonalChatRestricted?.(message.channel) || false;

            if (!isRestricted) {
                chatLearner.learn(message);
                const wonChallenge = await randomInteractions.checkChallenge(message);
                if (wonChallenge) return;

                // تحديث تحدي الرسائل
                await dailyChallenges.updateProgress(message.author.id, 'messages', 1, message).catch(() => { });
            }
        }

        // ── ردود مخصصة
        try {
            const customResponses = require('../commands/main/custom-responses');
            if (customResponses?.checkResponse && await customResponses.checkResponse(message)) return;
        } catch { }

        // ── كشف المنشن المباشر فقط (لا الـ Reply)
        // تم إلغاء: الرد على الـ Reply لأنه مزعج
        const isMentionedDirectly = message.mentions.has(message.client.user)
            && !message.reference; // ← المفتاح: لا نرد إذا كان الرسالة reply

        const isRestricted = protection.isPersonalChatRestricted?.(message.channel) || false;

        // ── الرد عند المنشن المباشر فقط
        if (isMentionedDirectly && !isRestricted) {
            return await _handleAIReply(message);
        }

        // ── لا ردود سياقية عشوائية (تم تعطيلها لمنع الإزعاج)
        // handleContextualReply تعمل فقط عبر randomInteractions.checkChallenge

        // ── نظام الـ XP
        if (isPublicChannel) {
            const now = Date.now();
            const lastXP = xpCooldowns.get(message.author.id) || 0;
            if (now - lastXP >= XP_COOLDOWN) {
                xpCooldowns.set(message.author.id, now);
                await levels.addXP(message.author.id, 5, message);
            }
        }
    },
};

// ─── مساعد: بحث عن الأمر ────────────────────────────────────────────────────
function _resolveCommand(tokens, client) {
    for (let wordCount = Math.min(tokens.length, 4); wordCount >= 1; wordCount--) {
        const key = tokens.slice(0, wordCount).join(' ').toLowerCase();
        const cmd = _lookupCommand(key, client);
        if (cmd) return { command: cmd, wordCount };
    }
    return { command: null, wordCount: 0 };
}

function _lookupCommand(name, client) {
    return client.commands.get(name) ||
        client.commands.get(client.aliases.get(name)) ||
        null;
}

// ─── AI context cache ────────────────────────────────────────────────────────
const _aiCtx = new Map();
setInterval(() => _aiCtx.clear(), 15 * 60 * 1000).unref?.();

function _addCtx(channelId, role, text) {
    if (!_aiCtx.has(channelId)) _aiCtx.set(channelId, []);
    const arr = _aiCtx.get(channelId);
    arr.push({ role, text: text.substring(0, 200) });
    if (arr.length > 10) arr.shift();
}

// ─── Rate Limit ──────────────────────────────────────────────────────────────
const _aiUserCooldown = new Map();
const AI_USER_CD = 8_000; // 8 ثوانٍ بين كل رد

function _checkAIRateLimit(userId) {
    const now = Date.now();
    const lastCall = _aiUserCooldown.get(userId);
    if (lastCall && (now - lastCall < AI_USER_CD)) {
        return { allowed: false, waitSeconds: Math.ceil((AI_USER_CD - (now - lastCall)) / 1000) };
    }
    return { allowed: true };
}

// ─── الرد الذكي عند المنشن المباشر فقط ──────────────────────────────────
async function _handleAIReply(message) {
    const rateCheck = _checkAIRateLimit(message.author.id);
    if (!rateCheck.allowed) {
        return message.reply(`⏳ انتظر ${rateCheck.waitSeconds} ثانية...`)
            .then(m => setTimeout(() => m.delete().catch(() => { }), 3000));
    }

    const userText = message.content.replace(/<@!?\d+>/g, '').trim();
    if (!userText) {
        const quickReplies = [
            'منشنيتني وماسألتني شيء؟ 😒',
            'هلا! شيش تريد؟ 👀',
            'تعال كلمني، أنا هنا 🤖',
        ];
        return message.reply(quickReplies[Math.floor(Math.random() * quickReplies.length)]);
    }

    // تحديث تحدي الدردشة مع البوت
    await dailyChallenges.updateProgress(message.author.id, 'ai_chat', 1, message).catch(() => { });

    // البحث في قاعدة المعرفة أولاً
    const knowledgeAnswer = aiBrain.lookupKnowledge(userText);
    if (knowledgeAnswer && Math.random() > 0.3) {
        _addCtx(message.channel.id, 'user', userText);
        _addCtx(message.channel.id, 'bot', knowledgeAnswer);
        return message.reply(knowledgeAnswer);
    }

    await message.channel.sendTyping().catch(() => { });

    const hfToken = config.hfToken;
    if (!hfToken || hfToken === 'your_huggingface_token_here' || hfToken.length < 10) {
        const localReply = aiBrain.buildLocalReply(userText, message.author.id);
        if (localReply) {
            _addCtx(message.channel.id, 'user', userText);
            _addCtx(message.channel.id, 'bot', localReply);
            return message.reply(localReply);
        }
        const fallbacks = [
            'وصلتني الرسالة — بفكر فيها 🧠',
            'مو متأكد من الجواب الصح هسه 🤔',
            'سؤال ذكي، بحتاج وقت أفكر 💭',
        ];
        return message.reply(fallbacks[Math.floor(Math.random() * fallbacks.length)]);
    }

    const ctx = _aiCtx.get(message.channel.id) || [];

    // ── استخدام محرك الشخصية المتقدم إذا كان متاحاً ─────────────────────────
    let systemPrompt;
    if (personaEngine) {
        const profile = aiBrain.getUserProfile(message.author.id);
        systemPrompt = personaEngine.buildAdvancedPrompt({
            botName: message.client.user.username,
            guildName: message.guild?.name || 'السيرفر',
            userId: message.author.id,
            channelId: message.channel.id,
            userProfile: profile,
            extraContext: ctx.length > 0 ? `\n[سياق المحادثة]:\n${ctx.map(e => `${e.role}: ${e.text}`).join('\n')}` : ''
        });
    } else {
        systemPrompt = aiBrain.buildSystemPrompt(
            message.client.user.username,
            message.guild?.name || 'السيرفر',
            message.author.id,
            ctx
        );
    }

    _aiUserCooldown.set(message.author.id, Date.now());

    try {
        const response = await axios.post(
            'https://api-inference.huggingface.co/v1/chat/completions',
            {
                model: 'Qwen/Qwen2.5-7B-Instruct',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userText }
                ],
                max_tokens: 300,
                temperature: 0.85,
                top_p: 0.95,
            },
            {
                headers: {
                    'Authorization': `Bearer ${hfToken}`,
                    'Content-Type': 'application/json',
                },
                timeout: 30000,
            }
        );

        let answer = response.data?.choices?.[0]?.message?.content?.trim() || '';
        answer = answer.replace(/<\|im_end\|>|<\|im_start\|>|assistant|system|user/g, '').trim();

        if (answer) {
            _addCtx(message.channel.id, 'user', userText);
            _addCtx(message.channel.id, 'bot', answer);
            return message.reply(answer);
        }

        const localReply = aiBrain.buildLocalReply(userText, message.author.id);
        return message.reply(localReply || 'هسه ما جاني رد — جرب مرة ثانية 😅');

    } catch (err) {
        console.error('[AI Reply Error]', err.response?.data || err.message);
        if (err.response?.status === 503) {
            return message.reply('☕ الذكاء الاصطناعي مشغول، انتظر دقيقة وجرب!');
        }
        const localReply = aiBrain.buildLocalReply(userText, message.author.id);
        return message.reply(localReply || 'تعطلت هسة 😩 جرب بعدين');
    }
}
