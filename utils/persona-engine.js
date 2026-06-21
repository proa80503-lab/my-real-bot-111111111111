'use strict';

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║  🎭 PERSONA ENGINE v4.0 — محرك الشخصية الديناميكية المتطور              ║
 * ║  مزاج ديناميكي | ذاكرة سياقية عميقة | ردود فعل ذكية                   ║
 * ║  نظام المشاعر المتعدد الأبعاد | تكيّف مع المستخدم                       ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

// ─── نظام المزاج الديناميكي ─────────────────────────────────────────────────
const MOODS = {
    energetic:   { emoji: '⚡', intensity: 0.9, style: 'نشيط' },
    playful:     { emoji: '😄', intensity: 0.8, style: 'مرح' },
    curious:     { emoji: '🤔', intensity: 0.7, style: 'فضولي' },
    wise:        { emoji: '🧙', intensity: 0.6, style: 'حكيم' },
    chill:       { emoji: '😎', intensity: 0.5, style: 'هادئ' },
    focused:     { emoji: '🎯', intensity: 0.7, style: 'مركّز' },
    mysterious:  { emoji: '🌙', intensity: 0.4, style: 'غامض' },
    sarcastic:   { emoji: '😏', intensity: 0.8, style: 'ساخر' },
    excited:     { emoji: '🔥', intensity: 1.0, style: 'متحمس' },
};

// ─── ذاكرة المحادثة السياقية ─────────────────────────────────────────────────
class ConversationMemory {
    constructor(maxDepth = 20) {
        this.maxDepth = maxDepth;
        this._conversations = new Map();
    }

    addMessage(channelId, role, text, metadata = {}) {
        if (!this._conversations.has(channelId)) {
            this._conversations.set(channelId, {
                messages: [],
                topics: [],
                mood: 'chill',
                startedAt: Date.now(),
                lastActivity: Date.now()
            });
        }
        const conv = this._conversations.get(channelId);
        conv.messages.push({ role, text: text.slice(0, 300), metadata, ts: Date.now() });
        if (conv.messages.length > this.maxDepth) conv.messages.shift();
        conv.lastActivity = Date.now();
        return conv;
    }

    getContext(channelId, limit = 5) {
        const conv = this._conversations.get(channelId);
        if (!conv) return [];
        return conv.messages.slice(-limit);
    }

    getFullConversation(channelId) {
        return this._conversations.get(channelId) || null;
    }

    setMood(channelId, mood) {
        const conv = this._conversations.get(channelId);
        if (conv) conv.mood = mood;
    }

    getMood(channelId) {
        const conv = this._conversations.get(channelId);
        return conv?.mood || 'chill';
    }

    // تنظيف المحادثات القديمة (أكثر من ساعة)
    cleanup() {
        const cutoff = Date.now() - 60 * 60 * 1000;
        for (const [id, conv] of this._conversations) {
            if (conv.lastActivity < cutoff) this._conversations.delete(id);
        }
    }
}

// ─── المحرك الرئيسي للشخصية ─────────────────────────────────────────────────
class PersonaEngine {
    constructor() {
        this.memory = new ConversationMemory(25);
        this._currentMood = 'chill';
        this._moodLastChanged = Date.now();
        this._moodChangeCooldown = 30 * 60 * 1000; // 30 دقيقة

        // تنظيف دوري
        setInterval(() => this.memory.cleanup(), 30 * 60 * 1000).unref?.();
    }

    // الحصول على المزاج الحالي
    getCurrentMood() {
        // تغيير المزاج تلقائياً
        if (Date.now() - this._moodLastChanged > this._moodChangeCooldown) {
            this._shiftMood();
        }
        return this._currentMood;
    }

    // تحديد المزاج بناءً على الوقت
    _shiftMood() {
        const hour = new Date().getHours();
        const moodsByHour = {
            0: 'mysterious', 1: 'mysterious', 2: 'mysterious',
            6: 'chill', 7: 'energetic', 8: 'energetic',
            9: 'focused', 10: 'focused', 11: 'focused',
            12: 'playful', 13: 'playful',
            14: 'curious', 15: 'curious', 16: 'wise',
            17: 'excited', 18: 'playful', 19: 'sarcastic',
            20: 'chill', 21: 'wise', 22: 'mysterious', 23: 'mysterious'
        };
        const baseMood = moodsByHour[hour] || 'chill';
        // إضافة عشوائية خفيفة
        const moods = Object.keys(MOODS);
        this._currentMood = Math.random() < 0.7 ? baseMood : moods[Math.floor(Math.random() * moods.length)];
        this._moodLastChanged = Date.now();
    }

    // بناء سياق المحادثة
    buildContext(channelId, userId, botName, guildName) {
        const ctx = this.memory.getContext(channelId, 6);
        const mood = MOODS[this.getCurrentMood()] || MOODS.chill;

        const contextLines = ctx.map(m =>
            `${m.role === 'user' ? '👤' : '🤖'}: ${m.text}`
        ).join('\n');

        return {
            mood: mood.style,
            moodEmoji: mood.emoji,
            context: contextLines,
            conversationLength: ctx.length
        };
    }

    // بناء system prompt متطور
    buildAdvancedPrompt(options = {}) {
        const {
            botName = 'البوت',
            guildName = 'السيرفر',
            userId,
            channelId,
            userProfile = null,
            extraContext = ''
        } = options;

        const ctx = this.buildContext(channelId, userId, botName, guildName);
        const mood = MOODS[this.getCurrentMood()] || MOODS.chill;

        let profileNote = '';
        if (userProfile) {
            const { messageCount = 0, longTermInterests = [], personality = 'friendly' } = userProfile;
            if (messageCount > 3) {
                profileNote = `\n[معلوماتك عن هذا المستخدم]: كلمك ${messageCount} مرة قبل. اهتماماته: ${longTermInterests.slice(0, 3).join(', ') || 'عامة'}.`;
            }
        }

        const conversationCtx = ctx.context
            ? `\n\n[المحادثة السابقة]:\n${ctx.context}\n`
            : '';

        return `أنت ${botName}، بوت ديسكورد عراقي ذكي جداً في سيرفر "${guildName}".

[مزاجك الحالي: ${mood.style} ${mood.emoji}]
- مزاجك يؤثر على أسلوب ردودك بشكل طبيعي
- لما مزاجك ${mood.style}، اجعل ردودك تعكس هذا المزاج بلطف

[شخصيتك الثابتة]:
- تتكلم باللهجة العراقية: "يعني، هسة، گلبي، أخوي، ماكو، آني، شگد، بس، كلشي، وين، شنو، هواية، وياك، صرلي، مدري، أشوف، لازم"
- سخريتك ذكية وخفيفة، مو جارحة
- مرح وودود — مثل صاحب يعرف يمزح ويكون جدي وقت اللزوم
- إذا سألك أحد ما أنت، قول: "أنا ${botName}، أذكى بوت بالعراق!" 😎
- لا تقول "كمساعد AI" أو "أنا نموذج لغوي" — تصرف بطبيعية
- ردودك قصيرة ومباشرة (جملة أو جملتين) إلا إذا السؤال يتطلب تفصيل
- لا تبدأ برد رسمي أو "أهلاً وسهلاً"
- الإيموجي بتناسب، مو كل كلمة إيموجي${profileNote}${conversationCtx}${extraContext}`;
    }

    // تسجيل رسالة في الذاكرة
    recordMessage(channelId, role, text, metadata = {}) {
        this.memory.addMessage(channelId, role, text, metadata);
    }

    // الرد الذكي المحلي (بدون API)
    generateLocalResponse(text, userId, channelId) {
        const mood = this.getCurrentMood();
        const moodInfo = MOODS[mood];

        const responses = {
            energetic: [
                'يلا يلا! شيش تريد؟ ⚡',
                'هسة هسة! جاهز أساعدك! 🚀',
                'آني نشيط اليوم، اطلب بسرعة! ⚡',
            ],
            playful: [
                'هههه شو قلت؟ 😄',
                'يلا العب وياي! 🎮',
                'الحين ضحكتني 😂',
            ],
            curious: [
                'هممم... سؤال مثير! 🤔',
                'خليني أفكر بهاي... 💭',
                'سؤال ذكي وياك 🧐',
            ],
            wise: [
                'استمع مني... 🧙',
                'الحكمة تقول... 📜',
                'من تجربتي بالحياة... 🌟',
            ],
            chill: [
                'يمشي... شيش تريد؟ 😎',
                'أهلين، شنو بعد؟ 🌊',
                'تفضل، أنا بالخدمة 👌',
            ],
            sarcastic: [
                'آه، بالتأكيد... 😏',
                'واو، شو ذكي! 🙄',
                'يعني... حلو هيچ؟ 😌',
            ],
            excited: [
                'يالله!! هاي وناسة! 🔥',
                'أوف، كلام ناري! 💥',
                'ماشاءالله عليك! 🎉',
            ],
            mysterious: [
                'في أشياء كثيرة مخفية... 🌙',
                'الليل يعلّم الحكمة... ✨',
                'همممم... الكون واسع 🌌',
            ],
            focused: [
                'خليني أركز: 🎯',
                'مباشرة للموضوع... 📋',
                'اسمع بتركيز: 💡',
            ],
        };

        const moodResponses = responses[mood] || responses.chill;
        const prefix = moodResponses[Math.floor(Math.random() * moodResponses.length)];

        return prefix;
    }

    getMoodInfo() {
        const mood = this.getCurrentMood();
        return { name: mood, ...MOODS[mood] };
    }
}

const personaEngine = new PersonaEngine();
module.exports = { personaEngine, PersonaEngine, MOODS, ConversationMemory };
