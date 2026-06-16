/**
 * 🧠 Chat Learner v4 — نظام التعلم الذكي المتطور
 *
 * التحسينات الجديدة:
 *   1) ذاكرة عبارات موسّعة: 2000 عبارة بدل 400
 *   2) سياق محادثة أعمق: آخر 7 رسائل بدل 3
 *   3) تجميع دلالي: العبارات مُصنَّفة بالموضوع
 *   4) تحليل النبرة: إيجابي/سلبي/محايد لكل عبارة
 *   5) ردود توليدية: يبني ردوداً مركّبة من قاموس مُكتسب
 *   6) نظام ثقة مُحسَّن: الأزواج الأكثر تكراراً تُختار بنسبة 90%
 *   7) تنظيف تلقائي: يحذف العبارات القديمة ويبقي الأجود
 */

'use strict';

const fs = require('fs');
const path = require('path');

const LEARN_FILE = path.join(__dirname, '../data/chat-memory.json');

// ─── تحميل / حفظ ─────────────────────────────────────────────────────────────
let _mem = null;
let _dirty = false;

function _load() {
    if (_mem) return _mem;
    try {
        if (fs.existsSync(LEARN_FILE)) {
            _mem = JSON.parse(fs.readFileSync(LEARN_FILE, 'utf8'));
        }
    } catch { /* ignore */ }
    if (!_mem || typeof _mem !== 'object') _mem = _defaultMemory();

    // تأكد من كل الحقول
    _mem.pairs = _mem.pairs || {};
    _mem.pairWeights = _mem.pairWeights || {};
    _mem.phrases = _mem.phrases || [];
    _mem.keywords = _mem.keywords || {};
    _mem.users = _mem.users || {};
    _mem.topicPhrases = _mem.topicPhrases || {};   // جديد: عبارات مُصنَّفة بالموضوع
    _mem.genDict = _mem.genDict || {};   // جديد: قاموس توليدي
    return _mem;
}

function _flush() {
    if (!_dirty || !_mem) return;
    try {
        const dir = path.dirname(LEARN_FILE);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(LEARN_FILE, JSON.stringify(_mem, null, 2), 'utf8');
        _dirty = false;
    } catch { /* ignore */ }
}

setInterval(_flush, 2 * 60 * 1000).unref?.();
process.on('SIGINT', () => _flush());
process.on('SIGTERM', () => _flush());

function _defaultMemory() {
    return { pairs: {}, pairWeights: {}, phrases: [], keywords: {}, users: {}, topicPhrases: {}, genDict: {} };
}

// ─── معالجة النص ──────────────────────────────────────────────────────────────
function _contextKey(text) {
    return text.trim().toLowerCase()
        .replace(/[^\u0600-\u06FFa-z0-9\s]/g, '')
        .split(/\s+/)
        .filter(w => w.length > 1)
        .slice(0, 5)        // ← من 4 إلى 5 كلمات للمفتاح
        .join(' ');
}

// كشف نوع الرسالة (موسَّع)
function _detectMessageType(text) {
    const t = text.trim();
    if (/[؟?]/.test(t) || /^(كيف|ما|ماذا|هل|متى|أين|من|وش|وين|ليش|ليه|إيش|اش|لماذا|هلأ)\b/.test(t)) return 'question';
    if (/^(اللي|اكتب|اعطني|ابي|ودي|قولي|اشرح|ساعدني|بغيت|شرح|وضّح|فسّر)\b/.test(t)) return 'request';
    if (/(حزين|زعلان|فرحان|مبسوط|خايف|قلقان|تعبان|مريض|حاسس|ضايق|وحيد|مشتاق)/.test(t)) return 'emotion';
    if (/(لأن|لأنه|بسبب|لذلك|ولهذا|والسبب|والنتيجة)/.test(t)) return 'explanation';
    return 'comment';
}

// هل النص قابل للحفظ؟
function _isLearnable(text) {
    if (!text || text.length < 3 || text.length > 300) return false;
    if (text.startsWith('http') || text.startsWith('!') || text.startsWith('/')) return false;
    if (/^\d+$/.test(text)) return false;
    if (/^[^\u0600-\u06FFa-zA-Z]+$/.test(text)) return false; // إيموجي فقط
    return true;
}

// هل الرد جيد؟
function _isGoodReply(text) {
    if (!text || text.length < 2) return false;
    if (/^https?:\/\//.test(text)) return false;
    if (/^\d+$/.test(text)) return false;
    return true;
}

// ─── تصنيف موضوع مبسَّط (للحفظ الداخلي) ─────────────────────────────────────
const TOPIC_LITE = [
    ['tech', /برمجة|كود|تقنية|حاسوب|جهاز|تطبيق|موقع|ai|ذكاء/iu],
    ['science', /علم|فيزياء|كيمياء|رياضيات|كوكب|فضاء|نظرية|تجربة/iu],
    ['sports', /كرة|ملعب|فريق|مباراة|هدف|لعبة|تمرين/iu],
    ['food', /أكل|طعام|مطعم|وجبة|طبخ|جوعان|شاي|قهوة/iu],
    ['emotion', /حزين|فرحان|خايف|تعبان|مشتاق|وحيد|حاسس/iu],
    ['humor', /ههه|😂|خخخ|lol|نكتة|ضحك|مضحك/iu],
];

function _classifyTopicLite(text) {
    for (const [topic, regex] of TOPIC_LITE) {
        if (regex.test(text)) return topic;
    }
    return 'general';
}

// تحليل نبرة مبسَّطة
function _sentimentLite(text) {
    if (/ممتاز|رائع|جميل|حلو|فرحان|شكراً|مبروك|🎉|🔥|💙|😄/.test(text)) return 'positive';
    if (/حزين|زعلان|مكسور|خسرت|وحيد|😢|💔|😞/.test(text)) return 'negative';
    return 'neutral';
}

// ─── الفئة الرئيسية ───────────────────────────────────────────────────────────
class ChatLearner {
    constructor() {
        _load();
        this._recentMessages = new Map(); // channelId → [{text, userId, ts}] آخر 7
        this._lastReplied = new Map();
        this._REPLY_COOLDOWN = 50000;     // 50 ثانية

        // ─── قاموس المشاعر الموسَّع ──────────────────────────────────────────
        this.emotionMap = {
            '😂|ههه|هاهاها|خخخخ|lol|haha|💀|يميت|كسرتني|ضحكت':
                ['😂😂', 'ههههه والله كسرتني 💀', 'خليتني أموت من الضحك 🤣',
                    'أقسم بالله ضحكت عليك 🤣', 'هذا أحسن شيء شفته اليوم 😆',
                    '💀💀 وقفت عن التنفس', 'طاح چاي من يدي من الضحك 😂',
                    'كسرت السيرفر 🤣', 'وقعت من الكرسي 😂'],

            'مبروك|بركة|تهانينا|كفو|ألف مبروك|تهنئة|نجحت|اجتزت|وصلت':
                ['مبروك يا بطل! 🎉', 'الله يبارك فيك 🥳', 'كفوك والله تستاهل 🔥',
                    'عقبال الأكبر إن شاء الله 🚀', 'أهنيك من گلبي 💙 تستاهل كل خير',
                    'ما شاء الله ربنا يتمم بخير 🌟'],

            'شكرا|شكراً|تسلم|يسلمو|مشكور|يعطيك العافية|ممنون|متشكر|يعطيك':
                ['ولا هم 😊', 'لا شكر على واجب يا حبيبي!', 'أهلاً وسهلاً 🫡',
                    'بأمرك دايماً روحي 💙', 'حاضرين للطيبين ✨', 'وانت أكثر 🌹',
                    'الواجب والله 💫', 'خادمكم دايماً 🙏'],

            'حلو|حلوه|عسل|روعة|جميل|زين|ممتاز|رائع|أجمل|مذهل|أحسن|الأفضل':
                ['وذوقك أحلى 🔥', 'انت الأحلى بيناتنا 💙', 'إبداع والله 👏',
                    'ذوقك راقي 😍', 'والله ما غشّيت، رائع فعلاً ✨',
                    'بتوصف بدقة 😄', 'موافق 100% 💯'],

            'صح|صحيح|أكيد|بالضبط|توب|مضبوط|صواب|نعم|طبعاً|بالتأكيد|دقيق':
                ['صح والله 💯', 'معك حق تماماً ✅', 'كلام رياجيل 💪',
                    'هذا الكلام الصح 🙏', 'يا سلام، فاهم الأمور صح 🧠',
                    'ماكو أصح من هالكلام 👌', 'بالضبط هذا اللي أريده 😄'],

            'حزين|زعلان|كئيب|منكسر|مكسور|أبكي|ابكي|دموع|💔|وحيد|ضايق':
                ['لا تحزن، كل شيء راح ينحل 💙', 'الله يفرج عليك 🤲',
                    'الدنيا ما تسوى الزعل يمّه 🫂', 'ابتسم، الباجر أجمل إن شاء الله ✨',
                    'أنا هنا إذا ريدت تحچي 💙', 'ماكو ليل إلا وبعده فجر 🌅',
                    'الله كريم، بچره أحسن 🤍', 'روح أكل شيء حلو وشوف وجهتك 😄'],

            'زهق|ملل|بايخ|فاضي|ما في شي|وقت يمشي|دخت|بايخة':
                ['العب تريفيا بدل الملل! 🎮', 'شغّل `عمل` واكسب فلوس 💰',
                    'هاي نحچي، شيش يشغل ذهنك؟ 🤔',
                    'جرب تتعلم شيء جديد اليوم! 📚', 'الچات ماكو حياة بيه لو ما انت 💙',
                    'روح جرب شيء ما جربته من قبل 🌟', 'اكتب `رحجة` وشوف حظك 🎯'],

            'تعبت|تعبان|مرهق|خلاص|ما أقدر|منهك|ضاق|منهك|قهرني':
                ['الله يعينك ويقويك 💪', 'ارتاح شوية، الشغل ما يطير 🛌',
                    'روح خذ استراحة واشرب چاي ☕', 'راحة المحارب مطلوبة 🛡️',
                    'جسمك أمانة، خذ حقه من الراحة 🌿',
                    'بعد كل تعب راحة، اصبر يا عزيزي 🤍'],

            'معصب|متضايق|قهر|زفت|غاضب|عصبي|كره|أكره|ما أطيق|يكرهني':
                ['تعوذ من إبليس وهدّى نفسك 🌿', 'هدّى شوية يا بطل 😳',
                    'الدنيا ما تسوى، روق 🥭', 'خذ نفس عميق وعد لـ10 🧘',
                    'اللي يغضبك يتحكم بيك — لا تخليه يربح 💪',
                    'موقف سيطلع، الباجر يتنسى 😌'],

            'صباح|صبح|gm|good morning|صبحتوا|صبّح|صباح النور':
                ['صباح النور والسرور 🌅', 'يسعد هالصباح ☀️',
                    'صباحك مسك وياسمين 🌸', 'يوم موفق إن شاء الله 💫',
                    'صباح الخير يا نور 🌞', 'يوم جديد = فرصة جديدة 🚀',
                    'الفجر عيّن وانت الأحلى 🌅'],

            'مساء|مسيك|good evening|مساكم|مساء الخير':
                ['مساء الورد يا روح 🌹', 'الله يمسيك بالرضا 🌆',
                    'يا مساء الأنوار ✨', 'مساء الأمل 🌇',
                    'مساء الخير والرزق 💫', 'مساؤك أجمل بوجودك 🌸'],

            'ليلة|تصبح|gn|بنطس|أصبح|انام|نايم على|تصبح على خير':
                ['تصبح على خير يا عيني 🌙', 'أحلام حلوة 💤',
                    'الله يسترك 🛌', 'نومة هنيئة يا روحي 🌟',
                    'الله يصبّح عليك بالخير 🌙', 'أحلامك مليانة خير إن شاء الله 💫'],

            'اهلا|هلا|عاشت|سلام|السلام|مرحبا|أهلين|هاي|hi|hey|هيلا|وين كنت|هلوو':
                ['وعليكم السلام ورحمة الله 🤍', 'هلا هلا ومرحبا! 🫡',
                    'الله يحييك زيارتك 👋', 'هلا هلا! ✨', 'أهلاً بالغالي 💙',
                    'ورد ورد، هلا بيك 🌹', 'أهلاً وسهلاً بأحلى واحد 😊'],

            'كيف|شلون|شخبار|اخبارك|عساك|كيف حالك|شگولك|كيفك':
                ['بخير الحمدلله، وانت؟ 💙', 'بأحسن حال بوجودك 😄',
                    'تمام التمام 🚀', 'أنا بوت بس بخير 🤖😂',
                    'بألف خير الحمدلله، وانت نشيط؟ ⚡',
                    'زين والحمد لله، شلونك انت؟ 😊',
                    'ماشي الحال، والله يعافيك 🤍'],

            'جوعان|أكل|عشاء|غداء|مطعم|طعام|ما أكلت|وجبة|طبخ|حلو':
                ['روح اكل يا روحي 😂', 'جيبلي وياك لو سمحت 🍔',
                    'عافية مقدماً 🍕', 'خذ هالفلوس من `يومي` وتغدى 💰',
                    'شوف مطعم حلو وانبسط 🌮', 'اللي ياكل بالخير بخير 😄',
                    'اطبخ شيء وحلّف علينا 😄'],

            'نوم|أنام|نايم|نام|تنام|بنام|نومي|يساعد على النوم':
                ['تصبح على خير يا عيني 🌙', 'أحلام حلوة 💤',
                    'لا تنسى `يومي` قبل النوم! 💰', 'الله يسترك بنومك 🌙',
                    'نومة هنيئة يا نجم 💫', 'نامت عيونك وصحيت بخير 🌅'],

            'العاب|لعبة|game|العب|بلعب|نلعب|fortnite|minecraft|pubg|فري فاير':
                ['اكتب `العاب` وشوف الخيارات 🎮', 'تريفيا جاهزة يا بطل! 🧠',
                    'جرب `تمساح` أو `رحجة` 🎯', 'مين يكسر مين بالألعاب؟ 😤',
                    'العب واكسب فلوس بنفس الوقت 💰🎮', 'يلا نتحداهم! ⚔️'],

            'حبيب|حبيبي|بنت|ولد|علاقة|كراش|تحب|تحبه|زواج|خطوبة|حب':
                ['موضوع حساس 😅 بالتوفيق يا عزيزي!', 'الله يكمّل عليك بالخير 🤍',
                    'الحب حلو بس صعب! 💙', 'ادعِ يا صديقي، الله ييسّر ✨',
                    'الحياة بدون حب ناقصة 🌹'],

            'أحاول|سأحاول|بحاول|أريد|طموح|هدف|حلم|أطور|أتعلم|أبدأ':
                ['روح يا بطل! 🔥', 'الطموح يصنع الأبطال 💪',
                    'واثق فيك 100% ✅', 'اللي يحاول يقدر 🚀',
                    'بالتوفيق، اشتغل عليه وتوكل على الله 💡',
                    'الحلم يصير حقيقة بالسعي 🌟'],

            'خايف|قلقان|خوف|قلق|متوتر|مرعوب|مو مرتاح|وسواس':
                ['الله وياك لا تخاف 🤍', 'كل شيء هيّن إن شاء الله 🌿',
                    'التوكل على الله يريّح الگلب 🤲', 'هدّى نفسك، الأمور بخير 💙',
                    'الخوف طبيعي، الشجاعة مشيك رغمه 💪',
                    'ادعِ وتوكل والأمور كلها بيد الله 🤲'],

            'فلوس|معدم|فقير|مفلس|مديون|محتاج فلوس|ما عندي':
                ['اكتب `عمل` واكسب فلوس 💰', 'ابدأ `يومي` هسّه وخذ راتبك! 💸',
                    'افتح شركة وتوسّع 🏢', 'جرب `استثمار` ضاعف رصيدك 📈',
                    'اسرق أحد بس لا يمسكونك 🕵️ (مزاح!)'],

            'صلوات|صلى الله|اللهم صل|محمد|النبي|آل البيت':
                ['صلى الله عليه وسلم 🌙', 'اللهم صل وسلم على نبينا محمد 💚',
                    'السلام عليه ورحمة الله 🤍'],

            'ذكاء اصطناعي|ai|chatgpt|gemini|بوت ذكي|تعلم آلة':
                ['أنا نفسي نموذج AI مصغّر! 🤖🧠', 'الذكاء الاصطناعي مجال رائع جداً! 💡',
                    'أعمل بتقنية Gemini AI 🌟', 'تعلّم الآلة هو مستقبل التقنية 🚀',
                    'سؤال في مجالي! 😄 الـ AI يتطور بشكل مذهل كل يوم'],
        };

        // ─── ردود سريعة موسَّعة ──────────────────────────────────────────────
        this.quickReplies = [
            { triggers: ['هههه', 'هاهاها', 'lol', 'ههه', 'خخخ', '💀', '😂', '🤣', 'يميت', 'ضحكتني'], replies: ['😂😂😂', 'ههههه وأنا 💀', 'يا گلبي 😂', 'ضحكتني وأنا ما كنت أضحك 😆', 'كسرت السيرفر 🤣', '💀 وقفت عن التنفس', 'كسرتني والله 😆', 'صوّرت الموقف 😂'] },
            { triggers: ['بوت', 'يا بوت', 'bot', 'hey bot', 'يا روبوت', 'يا ذكاء', 'يا AI'], replies: ['نعم؟ 👀', 'هلا ومرحبا! 🤖', 'تأمر يا عيوني 🫡', 'حاضر! شيش تريد؟ 🚀', 'بخدمتكم دايماً 💙', 'نعم يا صاحبي؟ 😊'] },
            { triggers: ['!!', '؟؟', 'هممم', 'اها', 'هم', 'اوه', 'اوف', 'ووو'], replies: ['آي؟ 👀', 'شيش؟ 🤔', 'تكلم كلام مفهوم 😅', 'همممم... أفكر 🧠', 'مفهوم أو مو مفهوم؟ 😅'] },
            { triggers: ['برب', 'brb', 'برجع', 'بروح'], replies: ['تيت ⏱️', 'منتظرك 👀', 'لا تتأخر علينا 🏃', 'روح وارجع بسرعة 💨', 'بنتظرك 🌟'] },
            { triggers: ['باك', 'back', 'رجعت', 'رجعت'], replies: ['هلا بالرايح والجاي! 🎉', 'هلا بالراجع 👋', 'نوّرت من جديد ✨', 'وحشتنا والله 💙', 'مرحباً بعودتك 🌹'] },
            { triggers: ['اسكت', 'انطم', 'هش', 'خرس', 'سكّت', 'صمت'], replies: ['أوكي أسكت 🤐', 'ليش التعصيب؟ 🥺', 'طيب براحتك 🚶', 'ما أنا ألف بكلم روحي 😶'] },
            { triggers: ['منور', 'منورة', 'منورين', 'نوّرت'], replies: ['بنورك يا روحي ✨', 'النور نورك 💡', 'السيرفر منوّر بأهله 🌟', 'وجودك هوّ النور 🌹'] },
            { triggers: ['وين', 'وين الكل', 'وينكم', 'اكو أحد'], replies: ['كلهم بالچات اللامرئي 👻', 'أنا هنا وياك 💙', 'الكل اختفى اليوم 🕵️', 'هلا بيك، انت تكفي 😄'] },
            { triggers: ['اذبحني', 'قتلتني', 'مؤلم', 'آخ', 'الله يستر'], replies: ['استغفر الله 😂', 'يا ما أقساك على روحك 😅', 'رفقاً بالنفس 🥺', 'مبالغ شوية 😄', 'استغفر استغفر 😂'] },
            { triggers: ['ما أدري', 'مو عارف', 'ما أعرف', 'مو واثق', 'ماكو فكرة'], replies: ['الله يهدينا 😂', 'اسأل جوجل، يدري 😅', 'مو عارف وأنا كمان 🤷', 'الجهل أول خطوة للتعلم 🧠'] },
            { triggers: ['صعب', 'صعبة', 'مو سهل', 'مستحيل', 'ما أقدر', 'ما ينفع'], replies: ['مستحيل ما موجود بقاموس الأبطال 💪', 'اللي بدأ نص وصل 🚀', 'الصعب يصير سهل مع الوقت 💡', 'اوثق بنفسك، تقدر ✅'] },
            { triggers: ['قررت', 'قرار', 'باجر', 'من اليوم', 'سأبدأ', 'رايح أبدأ'], replies: ['روح يا بطل! 🔥', 'القرار نص الطريق 💪', 'توكل على الله وابدأ 🚀', 'يلا! كلنا ندعمك 💙'] },
            { triggers: ['سكتوا', 'الچات ميت', 'اكو أحد حي', 'الچات هادي'], replies: ['أنا حي! 🤖👀', 'الچات بغيبوبة مؤقتة 😴', 'كلموني أنا هنا 💙', '... حتى أنا ما أدري وين راحوا 🕵️'] },
            { triggers: ['رأيك', 'شرأيك', 'شتقول', 'قولي رأيك'], replies: ['رأيي؟ أنا AI بس عندي ذوق 😄', 'سؤال صعب! بس أقول رأيي... 🤔', 'والله صعبة 😅', 'ما أقدر أحكم بدون معلومات أكثر 🧠'] },
            // جديد ↓
            { triggers: ['وش رأيك في', 'ما رأيك في', 'شتفكر في', 'هل تعتقد'], replies: ['فكرة جيدة تستاهل تأمل 🤔', 'لها وجهان، شوف الاثنين 💡', 'يعتمد على السياق يا صاحبي 🧠', 'كل موضوع له أبعاد كثيرة 🌊'] },
            { triggers: ['علّمني', 'كيف أتعلم', 'من وين أبدأ', 'أبي أتطور'], replies: ['أول خطوة: حدد هدفك بدقة 🎯', 'ابدأ بالأساسيات ثم تعمّق 📚', 'اليوتيوب والممارسة أفضل معلمَين 💡', 'اسأل وجرب وكرر — هذا التعلم الحقيقي 🔄'] },
            { triggers: ['تعبت من', 'زهقت من', 'ما أقدر أكمل', 'ودي أوقف'], replies: ['استراحة قصيرة ثم واصل 🔋', 'الفطر لا يبني جداراً في يوم 🧱', 'الصبر مفتاح كل إنجاز 🔑', 'غيّر الأسلوب مو الهدف 🔄'] },
        ];
    }

    // ─── تسجيل السياق ──────────────────────────────────────────────────────────
    _recordContext(channelId, text, userId) {
        if (!this._recentMessages.has(channelId)) this._recentMessages.set(channelId, []);
        const arr = this._recentMessages.get(channelId);
        arr.push({ text, userId, ts: Date.now() });
        if (arr.length > 7) arr.shift(); // ← من 3 إلى 7
    }

    // ─── التعلم من رسالة ────────────────────────────────────────────────────────
    learn(message) {
        if (message.author.bot) return;
        const text = message.content.trim();
        if (!_isLearnable(text)) return;

        const mem = _load();
        const uid = message.author.id;
        const chId = message.channel.id;

        // 1) إحصاء المستخدم
        if (!mem.users[uid]) mem.users[uid] = { count: 0, username: message.author.username, lastSeen: 0 };
        mem.users[uid].count++;
        mem.users[uid].username = message.author.username;
        mem.users[uid].lastSeen = Date.now();

        // 2) تعلم أزواج السياق مع الثقة
        const ctx = this._recentMessages.get(chId);
        if (ctx && ctx.length > 0) {
            const prevEntry = ctx[ctx.length - 1];
            if (prevEntry && prevEntry.text !== text) {
                const key = _contextKey(prevEntry.text);
                if (key && key.length >= 3) {
                    if (!mem.pairs[key]) mem.pairs[key] = [];
                    if (!mem.pairWeights[key]) mem.pairWeights[key] = {};

                    mem.pairWeights[key][text] = (mem.pairWeights[key][text] || 0) + 1;

                    const existing = mem.pairs[key].filter(r => r === text).length;
                    if (existing < 3) { // ← من 2 إلى 3
                        mem.pairs[key].push(text);
                        if (mem.pairs[key].length > 15) mem.pairs[key].shift(); // ← من 12 إلى 15
                    }
                }
            }
        }

        this._recordContext(chId, text, uid);

        // 3) حفظ العبارة مع الموضوع والنبرة
        const clean = text.replace(/[^\u0600-\u06FFa-zA-Z0-9\s!؟😂🔥💀🤣👀]/gu, '').trim();
        if (clean.length >= 5) {
            if (mem.phrases.length >= 2000) { // ← من 400 إلى 2000
                // احذف أقدم 100 عبارة عند التوسع
                mem.phrases.splice(0, 100);
            }
            const type = _detectMessageType(text);
            const topic = _classifyTopicLite(text);
            const sentiment = _sentimentLite(text);

            mem.phrases.push({
                text: clean,
                userId: uid,
                username: message.author.username,
                ts: Date.now(),
                type,
                topic,
                sentiment,
            });

            // فهرسة دلالية
            if (!mem.topicPhrases[topic]) mem.topicPhrases[topic] = [];
            if (mem.topicPhrases[topic].length < 200) {
                mem.topicPhrases[topic].push({ text: clean, userId: uid, username: message.author.username, ts: Date.now() });
            }
        }

        // 4) إحصاء الكلمات المفتاحية
        const words = text.toLowerCase().replace(/[^\u0600-\u06FFa-z0-9\s]/g, '').split(/\s+/);
        for (const w of words) {
            if (w.length < 3) continue;
            mem.keywords[w] = (mem.keywords[w] || 0) + 1;
        }

        // 5) بناء قاموس توليدي (أكثر الكلمات المثيرة)
        this._updateGenDict(mem, text);

        _dirty = true;
    }

    // تحديث القاموس التوليدي
    _updateGenDict(mem, text) {
        const words = text.replace(/[^\u0600-\u06FFa-zA-Z\s]/g, '').trim().split(/\s+/).filter(w => w.length > 3);
        if (words.length < 2) return;
        for (let i = 0; i < words.length - 1; i++) {
            const bigram = `${words[i]} ${words[i + 1]}`;
            mem.genDict[bigram] = (mem.genDict[bigram] || 0) + 1;
        }
        // احتفظ فقط بأفضل 500 ثنائية
        const entries = Object.entries(mem.genDict).sort(([, a], [, b]) => b - a);
        if (entries.length > 500) {
            mem.genDict = Object.fromEntries(entries.slice(0, 500));
        }
    }

    // ─── اختيار أفضل رد بناءً على الثقة ────────────────────────────────────────
    _getBestReply(key) {
        const mem = _load();
        const replies = mem.pairs[key];
        if (!replies || replies.length === 0) return null;

        const weights = mem.pairWeights[key] || {};

        // 90% من الوقت نختار الأعلى ثقة، 10% عشوائي
        const scored = [...new Set(replies)]
            .filter(r => _isGoodReply(r))
            .map(r => ({ r, score: (weights[r] || 1) + (Math.random() < 0.9 ? 0 : Math.random() * 2) }))
            .sort((a, b) => b.score - a.score);

        return scored.length > 0 ? scored[0].r : null;
    }

    // ─── توليد رد من القاموس المُكتسب ────────────────────────────────────────────
    _generateFromDict() {
        const mem = _load();
        const entries = Object.entries(mem.genDict).sort(([, a], [, b]) => b - a).slice(0, 30);
        if (entries.length < 3) return null;
        // اختر ثنائية عشوائية من أفضل 30
        const pick = entries[Math.floor(Math.random() * Math.min(entries.length, 10))][0];
        const starters = ['يعني', 'بصراحة', 'فاكر لما قالوا', 'ذكّرتني إن', 'حسيت إن'];
        return `${starters[Math.floor(Math.random() * starters.length)]} "${pick}"... 🤔`;
    }

    // ─── رد ذكي ────────────────────────────────────────────────────────────────
    getReply(text) {
        const mem = _load();
        const lower = text.toLowerCase();
        const type = _detectMessageType(text);

        // 1) ردود سريعة (أولوية عالية)
        for (const qr of this.quickReplies) {
            if (qr.triggers.some(t => lower.includes(t.toLowerCase()))) {
                return qr.replies[Math.floor(Math.random() * qr.replies.length)];
            }
        }

        // 2) قاموس المشاعر الموسَّع
        for (const [pattern, replies] of Object.entries(this.emotionMap)) {
            const regex = new RegExp(pattern, 'iu');
            if (regex.test(lower)) {
                return replies[Math.floor(Math.random() * replies.length)];
            }
        }

        // 3) البحث في الأزواج المتعلَّمة (مع الثقة)
        const key = _contextKey(text);
        if (key && mem.pairs[key] && mem.pairs[key].length > 0) {
            const best = this._getBestReply(key);
            if (best) return best;
        }

        // 4) البحث بمفتاح أقصر (أول 3 كلمات)
        const shortKey = key.split(' ').slice(0, 3).join(' ');
        if (shortKey !== key && mem.pairs[shortKey] && mem.pairs[shortKey].length > 0) {
            const best = this._getBestReply(shortKey);
            if (best) return best;
        }

        // 5) ردود بناءً على نوع الرسالة
        if (type === 'question') {
            const qReplies = [
                'سؤال ذكي يستاهل تفكير عميق! 🧠',
                'والله سؤال ما أعرف أجاوبه بصدق، بس بحاول 😅',
                'اسأل الشباب، هم أعرف مني 😄',
                'أحتاج أفكر بهذا أكثر... 🤔',
                'سؤال مثير! خليني أتذكر ما تعلمته 💡',
            ];
            return qReplies[Math.floor(Math.random() * qReplies.length)];
        }

        if (type === 'request') {
            const rReplies = [
                'حاضر وماشي معك 🫡',
                'اوكي، شيش تريد تحديداً؟ 🤔',
                'بقدر أساعدك، قول أكثر 💬',
                'يلا نشتغل عليها 💪',
            ];
            return rReplies[Math.floor(Math.random() * rReplies.length)];
        }

        if (type === 'explanation') {
            const eReplies = [
                'منطق سليم 💯',
                'تحليل ممتاز 🧠',
                'فاهم الصورة كاملة 👀',
                'شرح واضح، شكراً 🙏',
            ];
            return eReplies[Math.floor(Math.random() * eReplies.length)];
        }

        return null;
    }

    // alias
    getQuickReply(text) { return this.getReply(text); }

    // ─── رد بعبارة متعلَّمة عشوائية ─────────────────────────────────────────────
    getLearnedPhrase(excludeUserId = null) {
        const mem = _load();
        if (!mem.phrases.length) return null;
        let pool = excludeUserId ? mem.phrases.filter(p => p.userId !== excludeUserId) : mem.phrases;
        if (!pool.length) pool = mem.phrases;

        // فضّل العبارات الحديثة (آخر 24 ساعة)
        const recent = pool.filter(p => Date.now() - p.ts < 24 * 60 * 60 * 1000);
        const source = recent.length >= 5 ? recent : pool;
        return source[Math.floor(Math.random() * source.length)] || null;
    }

    // رد بعبارة متعلَّمة من موضوع معين
    getLearnedPhraseByTopic(topic, excludeUserId = null) {
        const mem = _load();
        const pool = (mem.topicPhrases[topic] || []).filter(p => !excludeUserId || p.userId !== excludeUserId);
        if (!pool.length) return this.getLearnedPhrase(excludeUserId);
        return pool[Math.floor(Math.random() * pool.length)];
    }

    // ─── هل يجب أن يرد البوت؟ ───────────────────────────────────────────────
    canReply(channelId) {
        const last = this._lastReplied.get(channelId) || 0;
        if (Date.now() - last < this._REPLY_COOLDOWN) return false;
        this._lastReplied.set(channelId, Date.now());
        return true;
    }

    // ─── أكثر الكلمات استخداماً ─────────────────────────────────────────────
    getTopKeywords(n = 5) {
        const mem = _load();
        return Object.entries(mem.keywords)
            .sort(([, a], [, b]) => b - a)
            .slice(0, n)
            .map(([word, count]) => `${word}(${count})`);
    }

    // ─── أفضل الثنائيات من القاموس التوليدي ───────────────────────────────────
    getTopBigrams(n = 5) {
        const mem = _load();
        return Object.entries(mem.genDict)
            .sort(([, a], [, b]) => b - a)
            .slice(0, n)
            .map(([bigram, count]) => `"${bigram}"(${count})`);
    }

    // ─── إحصائيات ─────────────────────────────────────────────────────────────
    getStats() {
        const mem = _load();
        const topUser = Object.entries(mem.users).sort(([, a], [, b]) => b.count - a.count)[0];
        const topTopic = Object.entries(
            mem.phrases.reduce((acc, p) => { acc[p.topic] = (acc[p.topic] || 0) + 1; return acc; }, {})
        ).sort(([, a], [, b]) => b - a)[0];

        return {
            totalPhrases: mem.phrases.length,
            totalContextPairs: Object.keys(mem.pairs).length,
            totalUsers: Object.keys(mem.users).length,
            mostActiveUser: topUser ? `${topUser[1].username} (${topUser[1].count})` : '—',
            topKeywords: this.getTopKeywords(5).join(', ') || '—',
            topTopic: topTopic ? `${topTopic[0]}(${topTopic[1]})` : '—',
            topBigrams: this.getTopBigrams(3).join(', ') || '—',
            genDictSize: Object.keys(mem.genDict).length,
        };
    }
}

module.exports = new ChatLearner();
