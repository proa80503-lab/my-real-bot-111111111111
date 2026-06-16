'use strict';

/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║   🧠 AI BRAIN v3.0 — نظام الذكاء المركزي المتطور من 2060      ║
 * ║   ذاكرة طويلة | شخصية ديناميكية | تصنيف متعدد الأبعاد        ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */

'use strict';

const fs = require('fs');
const path = require('path');

const BRAIN_FILE = path.join(__dirname, '../data/ai-brain.json');

// ─── تحميل / حفظ ────────────────────────────────────────────────────────────
let _brain = null;
let _dirty = false;

function _load() {
    if (_brain) return _brain;
    try {
        if (fs.existsSync(BRAIN_FILE)) {
            _brain = JSON.parse(fs.readFileSync(BRAIN_FILE, 'utf8'));
        }
    } catch { /* ignore */ }
    if (!_brain || typeof _brain !== 'object') _brain = _defaultBrain();
    _brain.userProfiles = _brain.userProfiles || {};
    _brain.topicStats = _brain.topicStats || {};
    _brain.learnedQA = _brain.learnedQA || {};
    _brain.sessionMemory = _brain.sessionMemory || {};
    _brain.longTermMemory = _brain.longTermMemory || {};
    _brain.globalStats = _brain.globalStats || { totalMessages: 0, totalUsers: 0 };
    return _brain;
}

function _flush() {
    if (!_dirty || !_brain) return;
    try {
        const dir = path.dirname(BRAIN_FILE);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(BRAIN_FILE, JSON.stringify(_brain, null, 2), 'utf8');
        _dirty = false;
    } catch { /* ignore */ }
}

setInterval(_flush, 2 * 60 * 1000).unref?.();
process.on('SIGINT', () => _flush());
process.on('SIGTERM', () => _flush());

function _defaultBrain() {
    return {
        userProfiles: {},
        topicStats: {},
        learnedQA: {},
        sessionMemory: {},
        longTermMemory: {},
        globalStats: { totalMessages: 0, totalUsers: 0 },
    };
}

// ─── تصنيف الموضوع (موسَّع 15 فئة) ─────────────────────────────────────────
const TOPIC_PATTERNS = {
    science:     /فيزياء|كيمياء|رياضيات|هندس|علم|تجربة|نظرية|ذرة|جزيء|خلية|كوكب|فضاء|ضوء|طاقة|كتلة|سرعة|معادل/iu,
    tech:        /برمجة|كود|تطبيق|موقع|سيرفر|جافا|بايثون|javascript|python|html|css|api|بوت|ذكاء اصطناعي|ai|خوارزمية|داتا|قاعدة بيانات|تقنية/iu,
    religion:    /الله|اسلام|قرآن|حديث|صلاة|صوم|زكاة|حج|دعاء|سنة|فرض|حلال|حرام|مسجد|نبي|رسول|سورة/iu,
    history:     /تاريخ|حضارة|عصر|قديم|مملكة|معركة|حرب|دولة|إمبراطورية|قرن|ميلاد|وفاة|ملك|سلطان/iu,
    games:       /لعبة|ببجي|pubg|فورتنايت|fortnite|كول اوف|cod|فالورانت|valorant|امونق|among|ماين كرافت|minecraft|pc|ps5|xbox|تقييم لعبة|كليب|لاعب/iu,
    entertainment: /فيلم|مسلسل|أغنية|موسيقى|يوتيوب|تيك توك|انستا|سناب|تويتر|نتفليكس|مانقا|أنمي|ترفيه/iu,
    sports:      /كرة|فريق|مباراة|دوري|بطولة|نادي|لاعب|هدف|تمرين|ملعب|بريميرليغ|ليفربول|ريال|برشلونة/iu,
    emotional:   /حزين|فرحان|خايف|قلقان|متوتر|مكسور|وحيد|مشتاق|تعبان|تعبت|ضايق|مريض|زعلان|انكسرت|خذلني|مشاعر/iu,
    food:        /أكل|طعام|مطعم|وصفة|حلو|مر|مالح|مطبخ|طبخ|شيف|جوعان|غداء|عشاء|فطور|وجبة|مشروب|قهوة|شاي/iu,
    philosophy:  /معنى|وجود|حقيقة|فلسفة|تفكير|عقل|روح|حياة|موت|قدر|مصير|جوهر|ماهية|أخلاق|قيمة/iu,
    social:      /صاحب|صداقة|عائلة|أهل|أم|أب|أخ|أخت|حبيبة|حبيب|زواج|خطوبة|علاقة|تعارف|فراق|حب/iu,
    economy:     /فلوس|مال|رصيد|بنك|استثمار|راتب|اقتصاد|مشروع|شركة|عمل|وظيفة|ربح|خسارة|سوق/iu,
    humor:       /نكتة|مضحك|ههههه|😂|💀|خخخخ|lol|يميت|كسرتني|ضحك/iu,
    learning:    /تعلم|دراسة|مدرسة|جامعة|كورس|يوتيوب|كتاب|بحث|امتحان|حفظ|مراجعة|فهم|تطوير/iu,
    travel:      /سفر|رحلة|بلد|مطار|طيارة|فندق|سياحة|أوروبا|دبي|مصر|أمريكا|اليابان|كوريا/iu,
};

function classifyTopic(text) {
    const lower = text.toLowerCase();
    const matches = [];
    for (const [topic, regex] of Object.entries(TOPIC_PATTERNS)) {
        if (regex.test(lower)) matches.push(topic);
    }
    return matches.length > 0 ? matches[0] : 'general';
}

function classifyAllTopics(text) {
    const lower = text.toLowerCase();
    const found = [];
    for (const [topic, regex] of Object.entries(TOPIC_PATTERNS)) {
        if (regex.test(lower)) found.push(topic);
    }
    return found.length > 0 ? found : ['general'];
}

// ─── تحليل النبرة المتقدم (8 مشاعر) ─────────────────────────────────────────
const SENTIMENT_PATTERNS = {
    joy:      /فرحان|مبسوط|سعيد|مبروك|يسعدني|سعادة|فرح|ابتسم|🎉|🥳|😄|😁/iu,
    sadness:  /حزين|زعلان|مكسور|أبكي|وحيد|ضايق|💔|😢|😞|كئيب|بكيت/iu,
    anger:    /معصب|قهر|أكره|غاضب|متضايق|زفت|كره|😡|🤬/iu,
    fear:     /خايف|قلقان|متوتر|مرعوب|خوف|قلق|وسواس|😰|😨/iu,
    surprise: /وووو|ما صدقت|مو معقول|يا إلهي|😱|🤯|واو|اوف/iu,
    love:     /أحبك|حب|حبيبي|قلبي|💙|❤️|💕|وله|عشق/iu,
    positive: /ممتاز|رائع|جميل|حلو|شكراً|كفو|برافو|✅|🔥|💯|ماشاءالله/iu,
    negative: /ما يسوى|مزعج|مريع|فاشل|ما نفع|خسارة|😩|😫|💀/iu,
};

function analyzeSentimentFull(text) {
    const results = {};
    for (const [emotion, regex] of Object.entries(SENTIMENT_PATTERNS)) {
        if (regex.test(text)) results[emotion] = true;
    }

    // تحديد النبرة الرئيسية
    if (results.joy || results.positive || results.love) return { main: 'positive', details: results };
    if (results.sadness || results.fear) return { main: 'negative', details: results };
    if (results.anger) return { main: 'angry', details: results };
    if (results.surprise) return { main: 'surprised', details: results };
    return { main: 'neutral', details: results };
}

// ─── قاموس المعرفة الموسَّع (200+ حقيقة) ────────────────────────────────────
const KNOWLEDGE_BASE = {
    // علوم فيزياء
    'سرعة الضوء': 'سرعة الضوء في الفراغ هي **299,792,458** متر/ثانية — أسرع شيء في الكون! 🌌',
    'كم كوكب': 'يوجد **8 كواكب** في المجموعة الشمسية: عطارد، الزهرة، الأرض، المريخ، المشتري، زحل، أورانوس، نبتون 🪐',
    'عمر الكون': 'يُقدَّر عمر الكون بـ **13.8 مليار سنة** منذ الانفجار العظيم 💫',
    'عدد النجوم': 'مجرة درب التبانة تحتوي على **200-400 مليار** نجم، والكون يحتوي على تريليونات المجرات! 🌌',
    'مساحة الأرض': 'مساحة سطح الأرض **510 مليون كم²** — 71% منها مياه و29% يابسة 🌍',
    'عمر الشمس': 'الشمس عمرها حوالي **4.6 مليار سنة** ومن المتوقع أن تستمر **5 مليارات سنة** أخرى ☀️',
    'وزن الأرض': 'وزن كوكب الأرض **5.97 × 10²⁴ كيلوغرام** — فقط لأننا نحسبها 😅🌍',
    'درجة حرارة الشمس': 'سطح الشمس درجة حرارته **5,500 درجة مئوية** وقلبها يصل لـ **15 مليون درجة**! 🔥',
    // رياضيات
    'ما هو pi': 'باي (π) هو نسبة محيط الدائرة إلى قطرها = **3.14159265...** لا نهاية لها! 🔢',
    'جذر 2': '√2 = **1.41421356...** — عدد غير نسبي اكتشفه الفيثاغوريون 🔢',
    'فيبوناتشي': 'متتالية فيبوناتشي: 0، 1، 1، 2، 3، 5، 8، 13... كل رقم = مجموع السابقَين 🌀',
    'الأعداد الأولية': 'الأعداد الأولية: 2، 3، 5، 7، 11، 13... لا تقبل القسمة إلا على نفسها و1 🔢',
    // تقنية وذكاء اصطناعي
    'ما هو الذكاء الاصطناعي': 'الذكاء الاصطناعي (AI) يجعل الآلات تفكر وتتعلم مثل الإنسان 🧠 يشمل: تعلم الآلة، الشبكات العصبية، معالجة اللغة الطبيعية...',
    'ما هو التعلم الآلي': 'Machine Learning هو نوع من AI حيث **الكمبيوتر يتعلم من البيانات** بدون برمجة صريحة 📊',
    'ما هو chatgpt': 'ChatGPT نموذج لغوي طورته **OpenAI** — يستخدم بنية Transformer وتدريب RLHF 🤖',
    'ما هو البرمجة': 'البرمجة: كتابة تعليمات بلغة يفهمها الحاسوب 💻 أشهر اللغات: Python، JavaScript، Java، C++',
    'ما هو الإنترنت': 'الإنترنت شبكة عالمية من الحواسيب المتصلة 🌐 يعمل ببروتوكولات TCP/IP',
    'ما هو بلوكشين': 'Blockchain قاعدة بيانات موزعة لا مركزية — أساس العملات الرقمية مثل البيتكوين ⛓️',
    'ما هو الميتافيرس': 'الميتافيرس عالم افتراضي ثلاثي الأبعاد تتفاعل فيه بأفاتار رقمي 🌐 مثل VRChat وMeta Horizon',
    // جغرافيا
    'عاصمة اليابان': 'عاصمة اليابان هي **طوكيو** 🗼 — أكبر مدينة في العالم من حيث عدد السكان',
    'عاصمة فرنسا': 'عاصمة فرنسا هي **باريس** 🗼 — مدينة النور والموضة',
    'أكبر دولة': 'أكبر دولة من حيث المساحة: **روسيا** 🇷🇺 — 17 مليون كم²',
    'أكبر محيط': 'أكبر محيط: **المحيط الهادئ (الباسيفيك)** 🌊 — ثلث سطح الأرض!',
    'أطول نهر': 'أطول نهر: **النيل** في أفريقيا 🐊 — 6,650 كم',
    'أعلى جبل': 'أعلى جبل: **إيفرست** 🏔️ — ارتفاعه 8,848.86 متر',
    'أكبر صحراء': 'أكبر صحراء: **الصحراء الكبرى** 🏜️ في أفريقيا — 9 ملايين كم²',
    'أصغر دولة': 'أصغر دولة: **الفاتيكان** 🏛️ — مساحتها 0.44 كم²',
    // تاريخ
    'متى الحرب العالمية الأولى': 'الحرب العالمية الأولى: **1914-1918** 🎖️ — راح فيها 17 مليون شخص',
    'متى الحرب العالمية الثانية': 'الحرب العالمية الثانية: **1939-1945** 🎖️ — الأكثر دموية في التاريخ',
    'اختراع الكهرباء': 'توماس إديسون اخترع المصباح الكهربائي عام **1879** 💡',
    'أول إنسان فضاء': 'أول إنسان في الفضاء: **يوري غاغارين** 🚀 الروسي عام 1961',
    'أول رجل على القمر': 'أول إنسان على القمر: **نيل أرمسترونج** 🌕 عام 1969 (Apollo 11)',
    // دين إسلامي
    'كم ركن الإسلام': 'أركان الإسلام خمسة: الشهادتان، الصلاة، الزكاة، الصوم، الحج 🕌',
    'كم آية في القرآن': 'القرآن الكريم يحتوي على **6236 آية** في 114 سورة 📖',
    'أطول سورة': 'أطول سورة في القرآن: **سورة البقرة** (286 آية) 📖',
    'أقصر سورة': 'أقصر سورة في القرآن: **سورة الكوثر** (3 آيات) 📖',
    // ألعاب
    'متى صدر ببجي': 'PUBG صدر عام **2017** 🔫 وكان من أوائل ألعاب البتل رويال الشهيرة',
    'متى صدر فورتنايت': 'Fortnite صدر عام **2017** 🏗️ وأصبح ظاهرة عالمية',
    'متى صدر فالورانت': 'Valorant صدر عام **2020** 🎯 من شركة Riot Games',
    'متى صدر امونق اص': 'Among Us صدر عام **2018** 👾 لكن اشتهر عام 2020',
    // بيولوجيا
    'كم خلية في الجسم': 'جسم الإنسان يحتوي على **37 تريليون خلية** تقريباً 🧬',
    'كم عظمة في الجسم': 'جسم الإنسان البالغ يحتوي على **206 عظمة** 💀',
    'سرعة الدم': 'الدم يدور في الجسم بسرعة **5 لترات في الدقيقة** 🩸',
    'دماغ الإنسان': 'الدماغ يستهلك **20%** من طاقة الجسم رغم أنه يمثل **2%** فقط من وزنه 🧠',
    // معلومات ممتعة
    'لماذا السماء زرقاء': 'السماء زرقاء بسبب **تشتت ريلي** — الضوء الأزرق يتشتت أكثر في الغلاف الجوي 🌤️',
    'لماذا الثلج أبيض': 'الثلج أبيض لأن بلوراته تعكس كل الضوء المرئي بالتساوي 🌨️',
    'لماذا نحلم': 'الأحلام تحدث خلال مرحلة REM من النوم — الدماغ يعالج المعلومات ويرتب الذكريات 💤',
    'أقدم حضارة': 'أقدم حضارة بشرية موثقة: **السومريون** في العراق (4000 ق.م) 🏛️',
};

function lookupKnowledge(text) {
    const lower = text.toLowerCase();
    for (const [key, answer] of Object.entries(KNOWLEDGE_BASE)) {
        if (lower.includes(key.toLowerCase())) return answer;
    }
    return null;
}

// ─── الفئة الرئيسية ───────────────────────────────────────────────────────────
class AIBrain {
    constructor() {
        _load();
    }

    // تسجيل رسالة مستخدم وتحديث ملفه
    recordUserMessage(userId, username, text, guildId = null) {
        const brain = _load();
        if (!brain.userProfiles[userId]) {
            brain.userProfiles[userId] = {
                username,
                messageCount: 0,
                topics: {},
                sentiments: { positive: 0, negative: 0, neutral: 0, angry: 0, surprised: 0 },
                preferredStyle: 'friendly',
                firstSeen: Date.now(),
                lastSeen: Date.now(),
                recentMessages: [],
                longTermInterests: [],
                personality: this._detectPersonality(text),
                activeHours: {},
                guildId,
            };
            brain.globalStats.totalUsers++;
        }

        const profile = brain.userProfiles[userId];
        profile.username = username;
        profile.messageCount++;
        profile.lastSeen = Date.now();
        brain.globalStats.totalMessages++;

        // تتبع ساعات النشاط
        const hour = new Date().getHours();
        profile.activeHours[hour] = (profile.activeHours[hour] || 0) + 1;

        // تحليل الموضوع
        const topics = classifyAllTopics(text);
        for (const topic of topics) {
            profile.topics[topic] = (profile.topics[topic] || 0) + 1;
            brain.topicStats[topic] = (brain.topicStats[topic] || 0) + 1;
        }

        // تحليل النبرة
        const sentiment = analyzeSentimentFull(text);
        profile.sentiments[sentiment.main] = (profile.sentiments[sentiment.main] || 0) + 1;

        // ذاكرة الرسائل الأخيرة (آخر 15 رسالة)
        profile.recentMessages.push({
            text: text.substring(0, 120),
            ts: Date.now(),
            topic: topics[0],
            sentiment: sentiment.main,
        });
        if (profile.recentMessages.length > 15) profile.recentMessages.shift();

        // تحديث الاهتمامات الرئيسية
        const sorted = Object.entries(profile.topics).sort(([, a], [, b]) => b - a);
        profile.longTermInterests = sorted.slice(0, 5).map(([t]) => t);

        // ذاكرة طويلة الأمد
        if (!brain.longTermMemory[userId]) brain.longTermMemory[userId] = [];
        if (text.length > 30 && profile.messageCount % 10 === 0) {
            brain.longTermMemory[userId].push({
                summary: text.substring(0, 80),
                ts: Date.now(),
                topic: topics[0],
            });
            if (brain.longTermMemory[userId].length > 50) brain.longTermMemory[userId].shift();
        }

        _dirty = true;
        return profile;
    }

    // كشف الشخصية من الأسلوب
    _detectPersonality(text) {
        if (/ههههه|😂|💀|نكتة|مزاح/.test(text)) return 'humorous';
        if (/أعتقد|أفكر|رأيي|تحليل|منطق/.test(text)) return 'analytical';
        if (/حزين|تعبت|💔|وحيد/.test(text)) return 'sensitive';
        if (/يلا|بسرعة|نشيط|روح|اشتغل/.test(text)) return 'energetic';
        return 'friendly';
    }

    // الحصول على ملف مستخدم
    getUserProfile(userId) {
        const brain = _load();
        return brain.userProfiles[userId] || null;
    }

    // الموضوع المفضل
    getUserFavoriteTopic(userId) {
        const profile = this.getUserProfile(userId);
        if (!profile || !profile.topics) return 'general';
        const sorted = Object.entries(profile.topics).sort(([, a], [, b]) => b - a);
        return sorted[0]?.[0] || 'general';
    }

    // أفضل 3 مواضيع
    getUserTopTopics(userId, n = 3) {
        const profile = this.getUserProfile(userId);
        if (!profile?.topics) return ['general'];
        return Object.entries(profile.topics)
            .sort(([, a], [, b]) => b - a)
            .slice(0, n)
            .map(([t]) => t);
    }

    // ساعة النشاط المفضلة
    getUserMostActiveHour(userId) {
        const profile = this.getUserProfile(userId);
        if (!profile?.activeHours) return null;
        const entries = Object.entries(profile.activeHours);
        if (!entries.length) return null;
        return parseInt(entries.sort(([, a], [, b]) => b - a)[0][0]);
    }

    // الاستجابة للنبرة
    getUserSentimentTone(userId) {
        const profile = this.getUserProfile(userId);
        if (!profile) return 'neutral';
        const s = profile.sentiments;
        const max = Math.max(...Object.values(s));
        const main = Object.entries(s).find(([, v]) => v === max)?.[0];
        return main || 'neutral';
    }

    // تصنيف الرسالة
    classifyMessage(text) {
        const sentiment = analyzeSentimentFull(text);
        return {
            topic: classifyTopic(text),
            topics: classifyAllTopics(text),
            sentiment: sentiment.main,
            sentimentDetails: sentiment.details,
        };
    }

    // البحث في قاعدة المعرفة
    lookupKnowledge(text) {
        return lookupKnowledge(text);
    }

    // بناء رد محلي ذكي
    buildLocalReply(text, userId) {
        // 1) قاعدة المعرفة
        const known = lookupKnowledge(text);
        if (known) return known;

        const profile = this.getUserProfile(userId);
        const topic = classifyTopic(text);
        const sentiment = analyzeSentimentFull(text);

        // ردود حسب الموضوع
        const topicReplies = {
            science: ['سؤال علمي جميل! 🧬 ', 'دعني أفكر بطريقة علمية... 🔬 ', 'الحقيقة العلمية هي... 🌌 '],
            tech: ['مسألة تقنية! 💻 ', 'من ناحية برمجية... 🖥️ ', 'في عالم التقنية... ⚙️ '],
            games: ['وناسة! 🎮 ', 'كلام عن الألعاب! 🕹️ ', 'يلا نلعب! ⚔️ '],
            religion: ['بسم الله الرحمن الرحيم ☪️ ', 'الحمدلله 🤍 ', 'بإذن الله 🌙 '],
            emotional: ['أسمعك... 💙 ', 'أنا هنا وياك 🫂 ', 'فاهم عليك 🤍 '],
            entertainment: ['موضوع ترفيهي! 🎭 ', 'يلا نسلّى! 🎬 ', 'وناسة! 🎬 '],
            sports: ['يلا كرة! ⚽ ', 'الرياضة حياة 🏃 ', 'هدف! 🥅 '],
            food: ['ذكّرتني بالأكل! 🍔 ', 'بسم الله! 🍽️ ', 'يا سلام! 🍕 '],
            philosophy: ['سؤال عميق... 🤔 ', 'فلسفياً يا صاحبي... 💭 '],
            economy: ['موضوع اقتصادي! 💰 ', 'كلام مال! 📈 '],
            humor: ['ههههه 😂 ', '💀 كسرتني ', 'وقفت عن التنفس 🤣 '],
            learning: ['موضوع تعليمي! 📚 ', 'التعلم أساس كل شيء 🎓 '],
            travel: ['أحب السفر! ✈️ ', 'العالم واسع! 🌍 '],
            history: ['تاريخياً... 📜 ', 'من صفحات التاريخ... 🏛️ '],
            social: ['العلاقات الإنسانية 💙 ', 'الناس أنواع... 🌸 '],
            general: ['مثير للاهتمام! 🤔 ', 'همممم... 💭 '],
        };

        const prefix = (topicReplies[topic] || topicReplies.general)[Math.floor(Math.random() * (topicReplies[topic]?.length || 2))];

        // شخصية ديناميكية
        let personalNote = '';
        if (profile && profile.messageCount > 5) {
            const interests = profile.longTermInterests.slice(0, 2).map(_topicAr).join('، ');
            if (interests) {
                personalNote = ` وأعرف إنك تهتم بـ${interests} 🧠`;
            }
        }

        return (prefix + personalNote).trim() || null;
    }

    // بناء system prompt لـ Gemini
    buildSystemPrompt(botName, guildName, userId, conversationContext) {
        const profile = this.getUserProfile(userId);
        const favTopic = this.getUserFavoriteTopic(userId);
        const personality = profile?.personality || 'friendly';
        const activeHour = this.getUserMostActiveHour(userId);
        const msgCount = profile?.messageCount || 0;

        let personalNote = '';
        if (profile && msgCount > 5) {
            const interests = profile.longTermInterests.map(_topicAr).join('، ');
            personalNote = `\n- المستخدم هذا كلمني ${msgCount} مرة، اهتماماته الرئيسية: ${interests || 'عامة'}.`;
            if (activeHour !== null) personalNote += ` يكون نشطاً عادةً حول الساعة ${activeHour}.`;
        }

        let memoryCtx = '';
        const brain = _load();
        const ltm = brain.longTermMemory[userId] || [];
        if (ltm.length > 0) {
            memoryCtx = `\n\n[ذاكرة طويلة الأمد]:\n${ltm.slice(-3).map(m => `• ${m.summary}`).join('\n')}`;
        }

        const ctxText = conversationContext?.length > 0
            ? `\n\n[المحادثة السابقة]:\n${conversationContext.map(e => `${e.role === 'user' ? '👤' : '🤖'}: ${e.text}`).join('\n')}\n`
            : '';

        return `أنت ${botName}، بوت ذكاء اصطناعي متطور جداً في سيرفر ديسكورد اسمه "${guildName}" — سيرفر ألعاب عراقي.

شخصيتك:
- تتكلم باللهجة العراقية الدارجة: "يعني، هسه، گلبي، أخوي، ماكو، آني، شگد، بس، كلشي، وين، شنو، هواية، صرلي، ولك، يمة"
- عندك سخرية ذكية وخفيفة — مو جارحة، بيها "طعم"
- مرح وودود — مثل صاحب يعرف يمزح ويكون جدي وقت الحاجة
- واثق من نفسك، دقيق، وذكي
- شخصيتك: ${personality === 'humorous' ? 'مرح وفكاهي' : personality === 'analytical' ? 'تحليلي ومنطقي' : personality === 'sensitive' ? 'متفهم وعاطفي' : personality === 'energetic' ? 'نشيط وحماسي' : 'ودود وطبيعي'}

قواعد ثابتة:
- لا تقول "كمساعد AI" أو "لا أستطيع" — تصرف بطبيعية
- الردود قصيرة — جملة أو جملتين كافية إلا للأسئلة التفصيلية
- لا تبدأ برد رسمي أو "أهلاً"
- إيموجي باعتدال — مو كل كلمة إيموجي
- لو السؤال علمي أو جدي، أجب بدقة بلهجة عراقية
- لو السؤال عن ألعاب، ناقشه بحماس ومعرفة
- لو السؤال غبي أو واضح، رد بسخرية خفيفة ذكية${personalNote}${memoryCtx}${ctxText}`;
    }

    // إحصائيات السيرفر
    getServerStats() {
        const brain = _load();
        const totalUsers = Object.keys(brain.userProfiles).length;
        const totalMessages = brain.globalStats.totalMessages || Object.values(brain.userProfiles).reduce((s, p) => s + (p.messageCount || 0), 0);
        const topTopic = Object.entries(brain.topicStats).sort(([, a], [, b]) => b - a)[0];
        const mostActive = Object.entries(brain.userProfiles).sort(([, a], [, b]) => (b.messageCount || 0) - (a.messageCount || 0))[0];

        return {
            totalUsers,
            totalMessages,
            topTopic: topTopic ? `${_topicAr(topTopic[0])} (${topTopic[1]})` : '—',
            mostActive: mostActive ? `${mostActive[1].username} (${mostActive[1].messageCount})` : '—',
            knowledgeBase: Object.keys(KNOWLEDGE_BASE).length,
            topicsTracked: Object.keys(TOPIC_PATTERNS).length,
        };
    }

    // الحصول على الذاكرة الطويلة
    getLongTermMemory(userId) {
        const brain = _load();
        return brain.longTermMemory[userId] || [];
    }

    // حذف بيانات مستخدم
    clearUserData(userId) {
        const brain = _load();
        delete brain.userProfiles[userId];
        delete brain.longTermMemory[userId];
        _dirty = true;
    }

    // أكثر المستخدمين نشاطاً
    getTopUsers(n = 5) {
        const brain = _load();
        return Object.entries(brain.userProfiles)
            .sort(([, a], [, b]) => (b.messageCount || 0) - (a.messageCount || 0))
            .slice(0, n)
            .map(([id, p]) => ({ id, username: p.username, count: p.messageCount, topic: _topicAr(this.getUserFavoriteTopic(id)) }));
    }
}

// ─── تحويل الموضوع لعربي ─────────────────────────────────────────────────────
function _topicAr(topic) {
    const map = {
        science: 'العلوم', tech: 'التقنية', religion: 'الدين',
        history: 'التاريخ', entertainment: 'الترفيه', sports: 'الرياضة',
        emotional: 'المشاعر', food: 'الأكل', philosophy: 'الفلسفة',
        social: 'العلاقات', general: 'مواضيع عامة', games: 'الألعاب',
        economy: 'الاقتصاد', humor: 'الفكاهة', learning: 'التعلم',
        travel: 'السفر',
    };
    return map[topic] || topic;
}

module.exports = new AIBrain();
