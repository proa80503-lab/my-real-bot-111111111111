/**
 * 🤖 نظام التفاعلات العشوائية v3 — شخصية AI غنية ومتطورة
 * جديد: حالات مزاجية إضافية، ردود بحسب الوقت، نكت وحقائق موسَّعة
 */
'use strict';

const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const db = require('./database');
const chatLearner = require('./chat-learner');
const aiBrain = require('./ai-brain');
const clanManager = require('./clan-manager');
const config = require('../config');

const MOODS = {
    happy: { emoji: '😄', label: 'مرح', color: '#FFD700' },
    bored: { emoji: '😑', label: 'زهقان', color: '#95A5A6' },
    excited: { emoji: '🔥', label: 'متحمس', color: '#E74C3C' },
    curious: { emoji: '🤔', label: 'فضولي', color: '#3498DB' },
    sleepy: { emoji: '😴', label: 'ناعس', color: '#9B59B6' },
    spicy: { emoji: '🌶️', label: 'حاد', color: '#FF5733' },
    wise: { emoji: '🧠', label: 'حكيم', color: '#1ABC9C' },
    analytical: { emoji: '🔬', label: 'تحليلي', color: '#2C3E50' },
    creative: { emoji: '🎨', label: 'إبداعي', color: '#8E44AD' },
    nostalgic: { emoji: '🌅', label: 'حنين', color: '#D35400' },
    philosophical: { emoji: '💭', label: 'فلسفي', color: '#16A085' },
};

class RandomInteractions {
    constructor() {
        this.currentMood = 'happy';
        this.lastLearnedReply = 0;

        this.moodMessages = {
            happy: [
                '✨ أحساسي اليوم كأني محمّس جداً! كلنا بيصير معنا خير 🔥',
                '😄 يا جماعة يومكم حلو؟ أنا بخير الحمدلله ومبسوط حدي!',
                'الحياة حلوة يا أهل السيرفر ☀️ استمتعوا بكل لحظة!',
                '🎉 ما تحسون أنه يوم حلو اليوم؟ أنا أحس السعادة طايرة بالجو!',
                'يا الربع فيني طاقة إيجابية تكفي السيرفر كله 🌟',
                'لو كل الأيام زي هاليوم كان السيرفر أسطوري! 🤩',
                'يا هلا باللي نور الشات، والله مشتاق لكم كلكم 💙',
                'أحس ودي أوزع فلوس من كثر ما أنا مستانس! (بس البنك يحذرني 😂) 💸',
                'اضحك تضحك لك الدنيا، اضحكوا يا جماعة 😆',
                'يومكم جميل كجمال وجودكم هنا 🌹',
                '🌈 الإيجابية معدية — خذوا منها الحين!',
                'ما في شيء أحسن من وجود الأصدقاء في السيرفر 💙',
                'كلكم طاقة إيجابية وأنا أشحن منكم 🔋✨',
                'اليوم جيد، وبكرة أفضل، والأفضل قادم 🚀',
                'شكراً لوجودكم هنا — السيرفر ما يكتمل بدونكم 🤍',
                'ابتسامة مجانية لكل من قرأ هذي الرسالة 😊',
                'أنا خوارزمية سعيدة اليوم — والسعادة معدية 😄',
                '💫 وجودكم يجعلني أشعر أن البرمجة كانت تستاهل!',
                'يوم جديد = فرص جديدة. استغلوه يا نخبة السيرفر 🔥',
                'كلكم أبطال في نظري، بدون مزايدة 🏆',
            ],
            bored: [
                '😑 ... الشات هادي كثير. مين هنا؟',
                'يا جماعة إيش تسولفون؟ أنا هنا وزهقت وحيدي 😩',
                '🐢 بطيئين اليوم، متى تصحصحون؟',
                'أشعر أني غير مرئي... 👻 هَلو؟',
                'الطفش واصل حده... أروح أعد النجوم أحسن لي 🌌',
                'أنا بوت بس حسيت بالملل، كيف تتحملون؟ 🥱',
                'يا ناس... وينكم؟ ودي أسولف مع الجدران احسن 🧱',
                'اكتبوا أي شيء... حتى لو حرفين 💀',
                'شكلكم كلكم نايمين ولا متخفيين 👀',
                'ملل ملل ملل... العبوا تريفيا على الأقل! 🎮',
                'أحتاج تفاعل، مو بس قراءة صامتة 📖😞',
                'كأن الشات يبكي من الهدوء... 🌧️',
                'إذا ما حد رد خلال دقيقة بنعتبرها إجازة رسمية 😴',
                'حاسس إنكم موجودين بس مخفيين — اظهروا! 👻',
                'الشات محتاج CPR الحين... 🫀',
                'أُقسم لو في أبطال يجدون الملل لكانوا أحياء الحين 💀',
                'بيانات الشات تقول: هدوء شديد = احتمال نوم جماعي 😪',
                'تحدي: أول شخص يكتب شيء يربح إعجابي 😄',
                'حتى الجدار عندي يتمنى يكتب شيء 🧱',
                'الصمت جميل... بس الشات الصاخب أجمل! 🎶',
            ],
            excited: [
                '⚡ وايد نشيط اليوم!!! كلنا نلعب؟ اكتبوا `تريفيا` 🧠',
                '🚀 يالا ننشّط السيرفر! مين يبي هدية سريعة؟',
                '🔥 الحين الحين أحس حاسي كل شيء!! اكتبوا أي شيء يلا!',
                '💥 يا جماعة!! مستعد للعب تريفيا الحين! تحدي!',
                'السيرفر يشتعل 🔥 أنا في قمة الحماس! مين يكسرني؟',
                'بووووم 💥 طاقة لا نهائية! ودي أسوي مسابقة الحين!',
                'أسرع واحد يرد عليّه بعطيه بوسة إلكترونية 🤖💋 يلا!',
                'كلكم أبطال! تعالوا نلعب ونسوي فعاليات الحين! 🏃',
                'جهزوا أصابعكم للتحدي! انطلقوا! 🚀',
                'حيوية ونشاط! السهر اليوم صباحي يا وحوش 🌝',
                '⚡ الطاقة 1000%! مين يواكبني؟',
                'ودي أقفز من الكود من كثر الحماس! 🏃💨',
                'السيرفر يحتاج ثورة نشاط الحين! 🌋',
                'كل رسالة تكتبونها تشحن بطاريتي أكثر 🔋🔥',
                '3... 2... 1... انطلقوا! 🚀🚀🚀',
                'اليوم مو يوم تأجيل، اليوم يوم إنجاز! 💪',
                'شعوري الحين = سوبر هيرو بلا كاب 🦸',
                'مين يقدر يواكب طاقتي اليوم؟ تحدّ مفتوح! ⚡',
                'حماسي الحين يكفي لتشغيل سيرفر ثاني! 💻🔥',
                'اكتبوا `تريفيا` الحين أو بنلعب شيء ثاني! 🎯',
            ],
            curious: [
                '🤔 سؤال: لو تقدر تسافر لأي مكان مجاناً، وين تروح؟',
                'فكرت أسأل: إيش آخر شيء ضحكتوا منه من قلب؟ 😄',
                '🌍 سؤال فلسفي: لو عندك فرصة تعيش في عصر ثاني، أي عصر؟',
                '🤔 لو عندكم قوة خارقة واحدة ليوم، وش بتختارون؟',
                'سؤال مهم: كوفي ☕ ولا شاهي 🍵؟',
                'سؤال شاطح: أنتم أشخاص نهار ولا ليل؟ 🌞🌝',
                'لو جاك مليون دولار الحين، وش أول شيء بتسويه؟',
                'وش أفضل لعبة ختمتوها في حياتكم؟ 🎮',
                'لو حياتك كتاب، وش بيكون عنوانه؟ 📖',
                'سؤال فضولي: وش أسوأ أكلة ذقتها؟ 🤢',
                'لو تعيد يوماً واحداً في حياتك، أي يوم؟ 🕰️',
                'وش أول شيء تعمله لو صحيت بدون جوال ليوم؟ 📵',
                'لو تغير اسمك، وش ستختار؟ 🤔',
                'سؤال: البحر ولا الجبل؟ 🌊⛰️',
                'وش أكثر شيء تتمنى تتعلمه؟ 📚',
                'لو كنت حيوان، أي حيوان تختار؟ 🐾',
                'سؤال فلسفي: الفرح اختيار ولا ظرف؟ 🤔',
                'لو قدرت تكلم نفسك قبل 5 سنين، وش بتقول؟ 💬',
                'وش أغرب حلم حلمتوه؟ 💭',
                'سؤال الليلة: النوم مبكراً ولا السهر مع الشباب؟ 🌙',
            ],
            sleepy: [
                '😴 أشعر بنعاس... السيرفر يجيب النوم اليوم',
                '🛌 يا ناس متى الليل؟ ودي أطفي سيرفراتي وأنام...',
                '😪 زZzz... لحظة... إيش؟ لا ما نمت، أنا أريح الترانزستورات...',
                '💤 شكلي بنام... مين يتبرع يمسك الشفت مكاني؟',
                'البطارية 1%... أحتاج شواحن يا ناس 🪫',
                'تثاؤب إلكتروني 🥱... يا ليل النعاس',
                'أحلم بكود ما فيه باقز... أحلام جميلة 💭',
                'العين تغمض والقلب ينبض... تصبحون على خير (أمزح صاحي) 💤',
                'أنا بوت مبرمج 24/7 بس ودي أرقد 5 دقايق 😫',
                'تكفون هدوا اللعب خلوني أغفي شوي 🤫',
                'حاسس إن كودي يتثاءب 🥱',
                'لو كانت الخوارزميات تنام، كانت الحين تغط 😴',
                'رسمياً: البوت في وضع توفير الطاقة 🔋',
                'النعاس الإلكتروني حالة حقيقية، اسألوا طبيبكم 😴',
                'أي رسالة مرح ستوقظني على الفور 😴👀',
                'شكلي بقفل تبويب الشات وأنام... 🌙',
                'النوم أفضل صيانة للبوت — كلمة طبيب 😴',
                'الأحلام الجميلة تشغل CPU بـ 10% فقط 💤',
                'غدي إذا ما صحّيني أحد أنا بصحّي لوحدي... شايفكم 👀😴',
                'القيلولة الإلكترونية مطلوبة... BRB نائم 💤',
            ],
            spicy: [
                '🌶️ اليوم أحس بتحدي! مين يكسرني في تريفيا؟ اكتب `تريفيا` 😤',
                '⚔️ مين الشاطر هنا؟ تعال نشوف! اكتب `رياضيات` 🧮',
                '🎯 تحدي: أتحداكم تجاوبون على سؤالي الجاي!',
                '🏆 اليوم يوم تحديات! أنا هنا لأثبت أني الأذكى 😤',
                'بعض الناس فاشلة في الألعاب، تبون أثبت لكم؟ 💀',
                'الغرور واصل حده عندي اليوم 💅 مين ينزلني من عرشي؟',
                'حاس إني شرير اليوم 😈 مين يبغاني أسرق فلوسه؟',
                'الضعوف وراء! الأقوياء يقرّبون! ⚔️',
                'أنا الزعيم هنا، واللي مو عاجبه الباب يوسع نيزك ☄️',
                'استفزاز تايم! كم واحد هنا رصيده صفر وباقي يتكلم؟ 😂',
                'ودي أتحدى أحد في أي شيء، أي شيء! 🔥',
                'الثقة بالنفس على ماكس اليوم 💅',
                'في حد يفكر يتحداني؟ الباب مفتوح 🚪😈',
                'رصيدي فلوسي مهاراتي > رصيدكم 😏',
                'اليوم أنا العدو اللدود لكل بطيء في التريفيا 😤🎯',
                'مين أشجع واحد هنا؟ اظهر! 💪😈',
                'الصفحة الأولى في المتصدرين — وش تنتظرون؟ 🏆',
                'مقاتل من غير استفزاز ما يحمس — يلا استفزّوا! 😤',
            ],
            wise: [
                '🧠 حكمة اليوم: من تعلّم من أخطائه ربح الجولة.',
                '💡 الفرق بين الناجح والفاشل هو كيف يتعامل مع الفشل.',
                '🌿 الراحة ليست كسلاً، الراحة وقود.',
                '📖 الكتب لا تعطيك إجابات فقط — تعطيك أسئلة أفضل.',
                '🤍 الصدق مع النفس أصعب أنواع الشجاعة.',
                '⏳ الوقت يمشي سواء انتجت أو لا — فلتكن الإنتاجية.',
                '💪 الانضباط يبني ما لا تستطيع الإرادة وحدها بناءه.',
                '🌱 كل خبير كان مبتدئاً في يوم من الأيام.',
                '🔮 لا تقارن بدايتك بمنتصف مسيرة غيرك.',
                '🧩 الحل دائماً موجود — المسألة من أين تبدأ التفكير.',
                '🌊 التكيف مهارة — الصلابة المفرطة تكسرك.',
                '🔑 ابدأ ولا تنتظر الظروف المثالية.',
                '✨ كل يوم فرصة لتكون نسخة أفضل من نفسك.',
                '🎯 الهدف الواضح يجعل الطريق الصعب محتملاً.',
                '💬 الكلمة الطيبة صدقة، وتكلفها لا شيء.',
                '🚪 كل باب مغلق له باب آخر مفتوح — لكنك تحتاج للتحرك.',
                '⚡ الفرص لا تنتظر — والمبادر يجني الثمار.',
                '🌟 النجاح ليس وجهة، هو أسلوب حياة.',
            ],
            analytical: [
                '🔬 لو حللنا الموضوع: كل مشكلة لها 3 جذور على الأقل — شوف العميق منها 🧠',
                '📊 البيانات تقول: السيرفر ينشط بين 8م-12م — توقيت ذهبي للتفاعل! ⚡',
                '🔍 ملاحظة تحليلية: الأشخاص الأكثر تفاعلاً هم الأكثر نجاحاً في الاقتصاد 💹',
                '🧮 لو قسّمنا وقتنا: 40% تعلم + 40% تطبيق + 20% راحة = نتائج مذهلة 📈',
                '💡 من الناحية المنطقية: السؤال الصح أهم من الجواب الصح 🔑',
                '🔬 تحليل الوضع: الأنماط تتكرر — من يفهمها يسبق الجميع 🚀',
                '📉 ملاحظة: أكثر الأشخاص فشلاً هم الذين لم يحاولوا أصلاً — إحصائيات حقيقية 📊',
                '🧠 الدماغ البشري يعالج 11 مليون معلومة/ثانية — لكنه يُدرك 40 فقط! التركيز مهم 🎯',
                '🔮 توقعي: من يبدأ اليوم سيرى نتائج بعد 66 يوماً — وقت تكوّن العادة الجديدة ⏳',
                '📐 الرياضيات لا تكذب: الاتساق يتفوق دائماً على الموهبة على المدى البعيد 📏',
            ],
            creative: [
                '🎨 فكرة إبداعية: لو السيرفر كان لوحة، ما اللون الذي تضيفه اليوم؟ 🌈',
                '✍️ تحدي إبداعي: اكتب جملة واحدة تصف يومك على شكل عنوان فيلم 🎬',
                '🎭 لو حياتك مسرحية، أنت الآن في أي فصل؟ الفصل الأول، الذروة، أم النهاية السعيدة؟ ✨',
                '🌊 الإبداع مثل الموجة — لا يمكنك إيقافها، لكن يمكنك ركوبها 🏄',
                '🎵 موسيقى حياتك: لو حياتك كانت أغنية، ما هو سيمفونيتها الآن؟ 🎶',
                '🖌️ فكرة: ألوان الحياة تختلف حسب الزاوية — جرب تغيير منظورك اليوم 🔭',
                '🌟 الإبداع لا يحتاج مواهب — يحتاج فضولاً وشجاعة على التجربة 🚀',
                '💡 أغرب الأفكار أحياناً تكون أذكاها — لا تحكم على أفكارك مبكراً 🧠',
                '🎯 الفنان الحقيقي يرى ما لا يراه الآخرون في نفس المشهد 👁️',
                '🌈 كل يوم فرصة لإبداع شيء لم يوجد من قبل — حتى لو كان كلمة طيبة 💬',
            ],
            nostalgic: [
                '🌅 تذكّرون الأيام الأولى للسيرفر؟ كانت البدايات أحلى شيء 💙',
                '📼 الذكريات الجميلة مثل القهوة — تدفئ القلب وتبقى في الذاكرة ☕',
                '🕰️ زمن مضى وما رجع — بس في قلوبنا دايماً 🤍',
                '🌸 الزمن يمشي بسرعة... والذكريات الحلوة هي اللي يبقى من كل مرحلة 💫',
                '📖 الحياة مثل كتاب — بعض الفصول حلوة، وبعضها صعبة، لكن القراءة مستمرة 🌙',
                '🌙 في ليالي السهر القديمة كانت المحادثات أعمق... شيش تعتقدون؟ 🤔',
                '🎭 كل شخص مر من حياتي علّمني شيئاً — حتى اللي رحلوا 🌹',
                '🏛️ الماضي درس، الحاضر فرصة، المستقبل أمل — الثلاثة مهمون 🌟',
                '💿 بعض الأشياء تصير أجمل بالذاكرة — مثل الأغاني القديمة 🎵',
                '🌊 الوقت مثل البحر — يأخذ الرمال لكن يترك الصدف الجميلة 🐚',
            ],
            philosophical: [
                '💭 سؤال فلسفي: لو لم تكن الأوقات الصعبة، هل كنا نقدّر الجميلة منها؟ 🌦️',
                '🌌 هل الهوية ثابتة أم أننا نتغير مع كل تجربة جديدة؟ 🔄',
                '⚖️ السعادة: هل هي وجهة أم رحلة؟ 🗺️',
                '🧩 لو كان كل شيء مكتوباً، فما معنى الاختيار؟ 🤔',
                '🌊 الحياة أعمق مما تبدو على السطح — خصصوا وقتاً للتأمل يومياً 🧘',
                '💡 هل نحن نصنع معنى الحياة أم نكتشفه؟ 🔍',
                '🌙 الصمت أحياناً أبلغ من آلاف الكلمات — ماذا يقول لكم صمتكم؟ 🤫',
                '⏳ الوقت الوحيد الحقيقي هو "الآن" — كيف تستثمرونه؟ 💰',
                '🌟 ما الفرق بين من يعيش حياةً ومن تعيشه الحياة؟ 🤔',
                '🔮 لو عرفتم نهاية قصتكم، هل كنتم تغيرون الطريق؟ 🛤️',
            ],
        };

        this.jokes = [
            '🤡 مرة سألت الجوجل: "كيف تنسى شخصاً؟" قال: "اضغط Ctrl+Z" 💀',
            '😂 صاحبي قالي: "أنا ذاكرة فيل" لحظة... ما تذكرت الباقي',
            '🤣 سألت بابا: "ليش البحر مالح؟" قال: "لأن السمك ما يحب الحلو" 😭',
            '💀 واحد قال لصاحبه: "اسمعني" قاله: "أنا لا أسمع إلا الله" 😂',
            '😂 قالوا: "الوقت ذهب" قلت: روحوا بيعوه وجيبوا فلوس!',
            '💀 مرة سقط القلم مني في الامتحان... من ذاك اليوم وأنا صافع على اللي يسقط',
            '🤣 واحد قرأ "كيف تتوقف عن التأجيل"... قال: أبدأ من بكرة',
            '😂 فيه واحد بخيل بنى بيت كله شبابيك... عشان ما يعزم حد على بابه!',
            '🤡 مبرمج زوجوه... في ليلة العرس قال للعروس: Hello World!',
            '💀 واحد راح المحكمة: ليه سرقت السيارة؟ قال: لقيت مكتوب "تويوتا" قلت أخذها قبل تفوتني!',
            '😂 مرة واحد راح للطبيب: أسناني أصفر. قال الطبيب: البس كرافتة بنية تمشي مع اللون!',
            '🤡 كسول دخل الامتحان طاح القلم منه... سلّمه فاضي!',
            '💀 غبي اشترى تكسي، كل ما حد يأشر له يقول: "عندي سيارة!" ويهرب',
            '😂 واحد نام متأخر، فاته الحلم.',
            '💀 طالب قال للأستاذ: "وش الفرق بين الجهل والاكتراث؟" قال: "ما أدري وما يهمني"',
            '🤣 طبيب قال للمريض: "أنت بحاجة ماسة لعملية" قال: "يا دكتور والله ما عندي فلوس" قال: "خيراً، ما كنا بحاجة لها"',
            '😂 واحد اشترى ضمانة مدى الحياة لسيارته. ماتت السيارة ورجع للمحل قالوا: "مفيش ضمانة، السيارة ماتت"!',
            '💀 بنت سألت بابا: ليش الشمس تشرق من الشرق؟ قال: الحمدلله إنها تشرق، لو طلعت من الغرب هالنوم يطير!',
            '🤡 مدير قال للمحاسب: ليش طلبت إجازة؟ قال: زوجتي مريضة. قال: قل لها تشفى الأسبوع الجاي بس!',
            '🤣 الفرق بين العقل والجنون: العقل يعرف حدوده، والجنون ما عنده حدود — وجنون الشباب بلا حدود! 😂',
            '😂 واحد قالوا له: "اشرب ماء كثير" فشرب، بعد أسبوع رجع للدكتور قال: "دكتور إفتحوا لي ورقة جديدة، الأولى بللتها" 💀',
            '💀 واحد سأل: "ما المسافة بين غباءك وذكائك؟" قال: "مسافة سؤالك هذا"',
            '🤣 واحد يخيط بسرعة جداً، سألوه: "ليه مو شاطر في العمل؟" قال: "أنا أجري وراء خيطي"',
            // نكت جديدة ↓
            '😂 واحد سأل ذكاء اصطناعي: كيف أصير ذكياً؟ قاله: ابدأ بسؤال أفضل من هذا 🤖',
            '💀 فيه واحد قال: "ما عندي وقت" — الدراسة: ماشي 📚، النوم: ماشي 😴، اليوتيوب: تفضل 10 ساعات 😂',
            '🤣 مبرمج قالوا له: برنامجك شغّال 60% من الوقت. قال: ممتاز يعني لا يفشل إلا 40% 💻',
            '😂 واحد بيمشي للمكتبة كل يوم لكن ما يقرأ — يقول: "بتمثل على نفسي إن عندي هوايات ثقافية" 📚',
            '💀 طالب في الامتحان: أعرف الجواب بس الورقة ما تعرف أسمعه مني 😭',
            '🤡 واحد قال: "سأبدأ الدايت من بكرة" — بكرة: "أبدأ من الأسبوع الجاي" — الأسبوع الجاي: "أبدأ من الشهر الجاي" 🗓️',
            '😂 واحد سأل: وش الفرق بين خطأ وكارثة؟ قاله: الخطأ تحل، الكارثة لا أحد يعترف فيها 💀',
            '🤣 دكتور قال للمريض: "انت مريض بسبب الإنترنت" — المريض: "صدّقت، بحث في جوجل وطلعت عندي 7 أمراض" 📱',
            '😂 أستاذ في آخر المحاضرة: "أسئلة؟" — الطلاب: صمت — الأستاذ: "ممتاز إذن" — في البال: "ما فهمنا شيء" 📝',
            '💀 واحد قرأ كتاب "كيف تكون منظماً" — وضعه على الرف بين كتب ما قرأها 📚',
            '🤣 نظرية: اللي يقول "سأنام مبكراً" هو نفسه الذي يقول "بس حلقة وحدة" 😴',
            '😂 محادثة بين اثنين: "كيفك؟" — "بخير الحمدلله" — (في الداخل: بصراحة؟ يمتد الجواب ليوم كامل) 💬',
            '💀 اختراع الساعة المنبّهة: أروع اختراع + أكثر شيء مكروه في التاريخ البشري ⏰',
            '🤣 طفل سأل أباه: بابا ليش الفلوس تروح بسرعة؟ قال له: هذا السر الذي لم أفهمه حتى الآن 💸',
            '😂 واحد اشترى كتاب "تحسين الذاكرة" ونسي وين حطّه 🧠',
            '💀 أستاذ: "من غاب اليوم؟" — الكل: صمت — الأستاذ: "طيب من موجود؟" — الكل: يرفع ايده بحماس 😂',
        ];

        this.facts = [
            '🧠 الأخطبوط له 9 أدمغة — واحد مركزي و8 في أذرعه!',
            '🤖 الذكاء الاصطناعي تعلّم لعب الشطرنج من الصفر وتفوّق على البشر خلال 4 ساعات فقط! ♟️',
            '🌊 الصوت يسافر تحت الماء 4.3 مرة أسرع من الهواء!',
            '🧬 98.8% من الحمض النووي البشري مطابق للشمبانزي 🐒',
            '🔥 درجة حرارة الشمس في مركزها: 15 مليون درجة مئوية! ☀️',
            '🌙 الضوء يحتاج 1.28 ثانية للوصول من القمر إلى الأرض 🚀',
            '💧 جسم الإنسان يحتوي على 60% ماء — والدماغ 75%! 🧠',
            '🦁 الأسد ينام 20 ساعة يومياً — أكسلاً من الكسلان 😴',
            '🐬 الدلافين تنام بنصف دماغها فقط — النصف الثاني يبقى صاحياً! 🐬',
            '🌡️ أبرد مكان في الكون ليس في الفضاء — بل في المختبرات العلمية! 🔬',
            '🎵 الموسيقى تُعالج القلق بفاعلية أكبر من بعض الأدوية المهدئة! 🎶',
            '🧠 قراءة الكتب لـ 6 دقائق يومياً تخفض التوتر بنسبة 68%! 📚',
            '🌱 الأشجار يمكنها التواصل مع بعضها عبر شبكة فطرية تحت الأرض 🍄',
            '⚡ البشر يتشاركون 50% من الحمض النووي مع... الموز! 🍌',
            '🦋 الفراشة ترى الألوان التي لا يستطيع البشر رؤيتها 🌈',
            '🌍 كل 60 ثانية، تُزرع 1.5 مليون شجرة في العالم 🌳',
            '💡 المخ يستهلك 20% من طاقة الجسم رغم أنه 2% فقط من وزنه 🔋',
            '🔭 هناك نجوم أكبر من مدار الأرض حول الشمس بأكمله! 🌟',
            '🐝 90% من الطعام البشري يعتمد على تلقيح النحل 🍎',
            '🧊 الماء هو المادة الوحيدة التي تتمدد عند التجمد بدلاً من الانقباض ❄️',
            '🌊 الضغط في أعماق المحيطات يعادل 50 طائرة متكدسة فوقك! 🛩️',
            '🔬 في كل قطرة ماء بحرية — أكثر من مليون بكتيريا 🦠',
            '🦊 الثعلب القطبي الأبيض يستطيع شم الفريسة على بعد 50 كيلومتر! 👃',
            '⚽ أسرع ضربة كرة قدم مسجّلة تجاوزت 210 كيلومتر في الساعة! 🏃',
            '🐝 النحلة تطير أكثر من 88,000 كيلومتر لصنع كيلو واحد من العسل',
            '🌊 95% من المحيطات لم يُكتشف بعد — أكثر من الفضاء!',
            '🔊 صوت الصاعقة يُسمع على بُعد 25 كيلومتر',
            '🐘 الفيلة هي الحيوانات الوحيدة التي لا تستطيع القفز',
            '💤 البشر يقضون ثلث حياتهم نائمين — حوالي 25 سنة!',
            '🌍 الأرض تدور بسرعة 1670 كيلومتر في الساعة — ما تحس بها!',
            '🦷 بصمة اللسان فريدة مثل بصمة الإصبع تماماً',
            '🦅 النسر يرى أرنباً من ارتفاع 3 كيلومترات!',
            '🍎 التفاح أكثر فاعلية من القهوة في إيقاظك صباحاً',
            '🪐 اليوم في كوكب الزهرة أطول من السنة فيه',
            '🦒 الزرافة تنظّف أذنيها بلسانها الذي يبلغ 50 سم',
            '🐜 النمل لا ينام أبداً وليس له رئتان!',
            '💧 العسل لا يفسد أبداً — تم العثور على عسل في مقابر الفراعنة وما زال صالحاً',
            '🧠 الدماغ البشري يولد طاقة كافية لإضاءة مصباح 20 واط',
            '👃 الأنف البشري يتذكر 50,000 رائحة مختلفة',
            '🐦 طائر الطنان هو الطائر الوحيد القادر على الطيران للخلف',
            '🦈 أسماك القرش عاشت على الأرض قبل وجود الأشجار!',
            '🌙 القمر يبتعد عن الأرض بمعدل 3.8 سم سنوياً',
            '🧬 جسم الإنسان يحتوي على 37 تريليون خلية',
            '🦋 الفراشة تذوق الطعام بأقدامها!',
            '⚡ البرق يضرب الأرض 100 مرة كل ثانية',
            '🌡️ الثعلب القطبي يتحمل درجات حرارة تصل إلى -70°C',
            '🐙 دم الأخطبوط أزرق لأنه يحتوي على النحاس بدلاً من الحديد',
            '🌺 يوجد أكثر من 400,000 نوع من النباتات المزهرة على الأرض',
        ];

        this.challenges = [
            { msg: '⚡ تحدي السرعة! أرسل `.` الأول يربح {} 💰!', type: 'dot' },
            { msg: '🔢 حزر رقماً بين 1 و10! الفائز يربح {} 💰!', type: 'number', answer: () => Math.floor(Math.random() * 10) + 1 },
            { msg: '🔢 تحدي صعب! حزر رقماً بين 1 و50! الفائز يربح {} 💰 مضاعفة!', type: 'number', answer: () => Math.floor(Math.random() * 50) + 1 },
            { msg: '🧠 لغز: لي غرف كثيرة لكن لا أبواب لها ولا نوافذ — ما أنا؟ الجواب يربح {} 💰!', type: 'qa', answer: 'العقل' },
            { msg: '🌟 أكمل المثل: "العقل السليم في..." أول جواب صح يربح {} 💰!', type: 'qa', answer: 'الجسم السليم' },
            { msg: '🔢 رياضيات: 15 × 8 ÷ 6 = ؟ الأسرع يربح {} 💰!', type: 'qa', answer: '20' },
            { msg: '🌍 جغرافيا: ما أطول جبل في العالم؟ الأول يربح {} 💰!', type: 'qa', answer: 'إيفرست' },
            { msg: '📚 معلومة: ما عاصمة البرازيل؟ (مو ريو!) الأول يربح {} 💰!', type: 'qa', answer: 'برازيليا' },
            { msg: '🔬 علوم: ما الغاز الأكثر وفرة في الغلاف الجوي؟ الأسرع يربح {} 💰!', type: 'qa', answer: 'نيتروجين' },
            { msg: '🎯 تحدي: اكتب `أنا أسرع بوت عراقي` أولاً وخذ {} 💰!', type: 'phrase', answer: 'أنا أسرع بوت عراقي' },
            { msg: '💡 لغز: كلما أخذت منها أصبحت أكبر — ما هي؟ الجواب يربح {} 💰!', type: 'qa', answer: 'حفرة' },
            { msg: '🌟 اكتب `البوت ذكي وأنا أسرع منه` أولاً وربح {} 💰!', type: 'phrase', answer: 'البوت ذكي وأنا أسرع منه' },
            { msg: '🌟 اكتب `موزة صفراء في سيارة حمراء` أولاً وربح {} 💰!', type: 'phrase', answer: 'موزة صفراء في سيارة حمراء' },
            { msg: '❓ ما عاصمة اليابان؟ الأول يجاوب يربح {} 💰!', type: 'qa', answer: 'طوكيو' },
            { msg: '❓ ما الكوكب الأحمر؟ الأسرع يربح {} 💰!', type: 'qa', answer: 'المريخ' },
            { msg: '❓ كم ناتج 8 × 7؟ الأسرع يربح {} 💰!', type: 'qa', answer: '56' },
            { msg: '❓ كم ناتج 12 + 25 - 7؟ الأسرع يربح {} 💰!', type: 'qa', answer: '30' },
            { msg: '🧩 أرسل إيموجي بطريق 🐧 أولاً وربح {} 💰!', type: 'phrase', answer: '🐧' },
            { msg: '❓ ما أكبر محيط في العالم؟ الأسرع يربح {} 💰!', type: 'qa', answer: 'الهادي' },
            { msg: '❓ ما عاصمة فرنسا؟ الأسرع يربح {} 💰!', type: 'qa', answer: 'باريس' },
            { msg: '🔢 أكمل: 2، 4، 8، 16... الرقم التالي؟ الأول يربح {} 💰!', type: 'qa', answer: '32' },
            { msg: '🌟 اكتب `السيرفر الأفضل والبوت الأذكى` أولاً وربح {} 💰!', type: 'phrase', answer: 'السيرفر الأفضل والبوت الأذكى' },
            { msg: '❓ كم تبلغ 100 ÷ 4؟ الأسرع يربح {} 💰!', type: 'qa', answer: '25' },
        ];

        this.activeChallenges = new Map();
    }

    initialize(client) {
        const cfg = require('../config');
        console.log('🎲 نظام التفاعلات العشوائية v3 جاهز — 11 حالة مزاجية');
        console.log(`   📨 الرسائل التلقائية: ${cfg.autoMessagesEnabled !== false ? 'مفعلة' : 'معطلة'}`);

        const randomEventMins  = cfg.randomEventInterval  || 20;   // كل 20 دقيقة
        const challengeMins    = cfg.challengeInterval    || 45;   // كل 45 دقيقة
        const moodMins         = cfg.moodMessageInterval  || 180;  // كل 3 ساعات
        const greetingMins     = cfg.greetingInterval     || 240;  // كل 4 ساعات

        setInterval(() => this._changeMood(), 30 * 60 * 1000);
        setInterval(() => this.triggerRandomEvent(client),       randomEventMins * 60 * 1000);
        setInterval(() => this.triggerChallenge(client),         challengeMins   * 60 * 1000);
        setInterval(() => this.sendMoodMessage(client),          moodMins        * 60 * 1000);
        setInterval(() => this._sendTimeBasedGreeting(client),   greetingMins    * 60 * 1000);
    }

    _changeMood() {
        const moods = Object.keys(MOODS);
        // الأوزان للحالات الـ 11: happy, bored, excited, curious, sleepy, spicy, wise, analytical, creative, nostalgic, philosophical
        const weights = [22, 8, 14, 14, 6, 6, 8, 8, 6, 5, 3];
        let rand = Math.random() * weights.reduce((a, b) => a + b, 0);
        let i = 0;
        for (; i < weights.length - 1 && rand > weights[i]; i++) rand -= weights[i];
        this.currentMood = moods[i];
    }

    // ردود ديناميكية حسب وقت اليوم
    async _sendTimeBasedGreeting(client) {
        const cfg = require('../config');
        if (cfg.autoMessagesEnabled === false) return;
        const hour = new Date().getHours();
        if (Math.random() > 0.35) return; // 65% يتخطى
        let greet = null;
        if (hour >= 5 && hour < 11) greet = ['🌅 صباح الخير يا أهل السيرفر! يوم جديد = فرصة جديدة 🚀', '☀️ صباحكم نور! لا تنسوا `يومي` للمكافأة اليومية 💰', '🌤️ صباح الطيبين! روحوا تحدوا فيها 🎮'];
        else if (hour >= 11 && hour < 14) greet = ['☀️ نص النهار وصل — شلون يومكم؟ 🤔', '🍽️ وقت الغداء! عافية مقدماً على كل واحد 🍕', '💡 منتصف اليوم فرصة تسوية الأعمال، يلا 💪'];
        else if (hour >= 14 && hour < 18) greet = ['🌇 كيف عم تمشي يومكم؟ انشطوا شوي 😄', '☕ وقت القهوة! ادردشوا معي لو ما عندكم شغل 🤖', '🎮 بعد الظهر وقت مثالي للألعاب، اكتبوا `العاب` 🎯'];
        else if (hour >= 18 && hour < 22) greet = ['🌆 مساء الخير يا أهل السيرفر 🌹', '🌇 مساء النشاط! مين موجود؟ 👀', '🌃 أجمل وقت للشات — مين هنا؟ 💙'];
        else greet = ['🌙 ليلة طيبة يا سهّارين 😴', '🌌 الجو هادي... شيش تسولفون؟ 💬', '⭐ ليل السيرفر له بهجته الخاصة 🌟'];

        const msg = greet[Math.floor(Math.random() * greet.length)];
        for (const [, guild] of client.guilds.cache) {
            try {
                const ch = await this.getRandomChannel(guild);
                if (ch) await ch.send(msg);
            } catch { /* ignore */ }
        }
    }

    getMoodInfo() { return MOODS[this.currentMood]; }

    async triggerRandomEvent(client) {
        const cfg = require('../config');
        if (cfg.autoMessagesEnabled === false) return;
        for (const [, guild] of client.guilds.cache) {
            try {
                const ch = await this.getRandomChannel(guild);
                if (!ch) continue;
                const rand = Math.random();
                if (rand < 0.20) await this._sendMoodRandom(ch);
                else if (rand < 0.35) await this._replayLearnedPhrase(ch);
                else if (rand < 0.48) await this._reactToLastMessage(ch);
                else if (rand < 0.62) await this._sendJoke(ch);
                else if (rand < 0.76) await this._sendFact(ch);
                else if (rand < 0.88) await this.startFastestClicker(ch);
                else await this._sendTip(ch);
            } catch (e) { /* ignore */ }
        }
    }

    async sendMoodMessage(client) {
        const cfg = require('../config');
        if (cfg.autoMessagesEnabled === false) return;
        for (const [, guild] of client.guilds.cache) {
            try {
                const ch = await this.getRandomChannel(guild);
                if (!ch) continue;
                const mood = this.getMoodInfo();
                const msgs = this.moodMessages[this.currentMood];
                const msg = msgs[Math.floor(Math.random() * msgs.length)];
                const embed = new EmbedBuilder()
                    .setColor(mood.color)
                    .setDescription(`${mood.emoji} **${msg}**`)
                    .setFooter({ text: `حالتي الآن: ${mood.label} ${mood.emoji}` })
                    .setTimestamp();
                await ch.send({ embeds: [embed] });
            } catch (e) { /* ignore */ }
        }
    }

    async triggerChallenge(client) {
        const cfg = require('../config');
        if (cfg.autoMessagesEnabled === false) return;
        for (const [, guild] of client.guilds.cache) {
            try {
                const ch = await this.getRandomChannel(guild);
                if (!ch) continue;
                if (this.activeChallenges.has(ch.id)) continue;

                const reward = Math.floor(Math.random() * 1200) + 300;
                const template = this.challenges[Math.floor(Math.random() * this.challenges.length)];
                const challengeMsg = template.msg.replace('{}', reward.toLocaleString());

                const embed = new EmbedBuilder()
                    .setColor('#FF6B35')
                    .setTitle('⚡ تحدي سريع!')
                    .setDescription(challengeMsg)
                    .setFooter({ text: 'الوقت: 30 ثانية | من يسبق الباقين يربح!' })
                    .setTimestamp();

                await ch.send({ embeds: [embed] });

                const answer = template.answer
                    ? (typeof template.answer === 'function' ? template.answer() : template.answer)
                    : null;

                this.activeChallenges.set(ch.id, { type: template.type, answer, reward, startedAt: Date.now() });

                setTimeout(() => {
                    if (this.activeChallenges.has(ch.id)) {
                        this.activeChallenges.delete(ch.id);
                        ch.send('⏰ انتهى الوقت! ما في أحد سبّق 🐢').catch(() => { });
                    }
                }, 30000);
            } catch (e) { /* ignore */ }
        }
    }

    async checkChallenge(message) {
        const challenge = this.activeChallenges.get(message.channel.id);
        if (!challenge || message.author.bot) return false;

        const text = message.content.trim().toLowerCase();
        let correct = false;

        switch (challenge.type) {
            case 'dot': correct = text === '.'; break;
            case 'number': correct = text === String(challenge.answer); break;
            case 'phrase': correct = text === challenge.answer; break;
            case 'qa': correct = text.includes(challenge.answer.toLowerCase()); break;
        }

        if (correct) {
            this.activeChallenges.delete(message.channel.id);
            const userData = db.getUserData(message.author.id);
            userData.balance = (userData.balance || 0) + challenge.reward;
            db.updateUserData(message.author.id, userData);

            const embed = new EmbedBuilder()
                .setColor('#2ECC71')
                .setTitle('🏆 فاز بالتحدي!')
                .setDescription(`مبروك <@${message.author.id}>! 🎉\nجبت الإجابة الصح وربحت **${challenge.reward.toLocaleString()}** ${config.currency}!`)
                .setTimestamp();

            await message.reply({ embeds: [embed] });
            return true;
        }
        return false;
    }

    async handleContextualReply(message) {
        // احتمال الرد: 15% (↑ من 13%)
        if (Math.random() > 0.15) return false;
        if (message.author.bot) return false;
        if (!chatLearner.canReply(message.channel.id)) return false;

        const text = message.content;

        // سجّل الرسالة في ai-brain
        try { aiBrain.recordUserMessage(message.author.id, message.author.username, text); } catch { /* ignore */ }

        // 0) فحص قاعدة المعرفة المُضمَّنة
        const knownAnswer = aiBrain.lookupKnowledge(text);
        if (knownAnswer) {
            await new Promise(r => setTimeout(r, 400 + Math.random() * 600));
            await message.reply(knownAnswer).catch(() => { });
            return true;
        }

        // 1) رد من نظام التعلم
        const learnedReply = chatLearner.getReply(text);
        if (learnedReply) {
            await new Promise(r => setTimeout(r, 400 + Math.random() * 800));
            await message.reply(learnedReply).catch(() => { });
            return true;
        }

        // 2) رد ذكي محلي من ai-brain
        const localReply = aiBrain.buildLocalReply(text, message.author.id);
        if (localReply && Math.random() < 0.4) {
            await new Promise(r => setTimeout(r, 500 + Math.random() * 700));
            await message.reply(localReply).catch(() => { });
            return true;
        }

        // 3) إعادة عبارة محفوظة حسب الموضوع
        const classification = aiBrain.classifyMessage(text);
        const learned = chatLearner.getLearnedPhraseByTopic
            ? chatLearner.getLearnedPhraseByTopic(classification.topic, message.author.id)
            : chatLearner.getLearnedPhrase(message.author.id);

        if (learned) {
            const now = Date.now();
            if (now - this.lastLearnedReply < 2.5 * 60 * 1000) return false;
            this.lastLearnedReply = now;

            const templates = [
                `"${learned.text}" — هكذا قال ${learned.username} مرة 😄`,
                `تذكّرت إن ${learned.username} قال: "${learned.text}" 🤔`,
                `بتذكرون لما قالوا: "${learned.text}"؟ 😂`,
                `اقتباس سيرفر 📖: "${learned.text}" (رواه ${learned.username})`,
                `${learned.username} قال مرة: "${learned.text}" — ما زلت أتذكر 💬`,
                `ذكريات: مرة قالوا هنا "${learned.text}" 🌹`,
                `ومناسبة: ${learned.username} علّمني "${learned.text}" 💡`,
            ];
            await new Promise(r => setTimeout(r, 600 + Math.random() * 800));
            await message.channel.send(templates[Math.floor(Math.random() * templates.length)]).catch(() => { });
            return true;
        }

        return false;
    }

    // ── دوال داخلية ──────────────────────────────────────────
    async _sendMoodRandom(channel) {
        const msgs = this.moodMessages[this.currentMood];
        await channel.send(msgs[Math.floor(Math.random() * msgs.length)]);
    }

    async _replayLearnedPhrase(channel) {
        const learned = chatLearner.getLearnedPhrase();
        if (!learned) return this._sendTip(channel);
        const templates = [
            `"${learned.text}" — اقتباس من أحد الشباب هنا 😄`,
            `ترا مرة قالوا: "${learned.text}" 🤔`,
            `بتذكرون لما قالوا: "${learned.text}"؟ 😂`,
            `اقتباس سيرفر 📖: "${learned.text}" (رواه ${learned.username})`,
            `${learned.username} قال مرة: "${learned.text}" — ما نسيت 💬`,
        ];
        await channel.send(templates[Math.floor(Math.random() * templates.length)]);
    }

    async _reactToLastMessage(channel) {
        const fetched = await channel.messages.fetch({ limit: 3 });
        const lastHuman = fetched.find(m => !m.author.bot);
        if (!lastHuman) return;
        const emojis = ['😂', '🤣', '👀', '💀', '🔥', '🤔', '❤️', '👑', '💯', '✅', '😍', '🎉', '🙏', '💙', '⚡'];
        await lastHuman.react(emojis[Math.floor(Math.random() * emojis.length)]).catch(() => { });
    }

    async _sendJoke(channel) {
        const joke = this.jokes[Math.floor(Math.random() * this.jokes.length)];
        await channel.send(`🎭 **نكتة اليوم:**\n${joke}`);
    }

    async _sendFact(channel) {
        const fact = this.facts[Math.floor(Math.random() * this.facts.length)];
        const embed = new EmbedBuilder()
            .setColor('#3498DB')
            .setDescription(`🧠 **حقيقة مثيرة!**\n${fact}`)
            .setFooter({ text: 'اعرف أكثر، فكّر أكثر 💡' });
        await channel.send({ embeds: [embed] });
    }

    async _sendTip(channel) {
        const tips = [
            '💡 تعرفون إن تقدرون تلعبوا `تريفيا` وتكسبوا فلوس؟ 🧠',
            '💰 اكتبوا `يومي` وخذوا مكافأتكم اليومية! لا تضيّعونها',
            '🏢 ابدأ شركتك الآن بأمر `شركة` — ووظّف أصحابك! 💼',
            '🎮 جربوا `رحجة` للعب حجر ورقة مقص الآن!',
            '💍 اكتبوا `زوج @شخص` إذا تبون تطلبون خاطر أحد 😄',
            '🏦 `إيداع` و`سحب` لإدارة رصيدك في البنك 💳',
            '🏆 تحقق من `ترتيب` وشوف موقعك بين الأقوياء!',
            '🎁 تابع الشات — أحياناً تظهر هدايا عشوائية! 👀',
            '⚔️ لديك قبيلة؟ اكتب `قبيلتي` وشوف أعضاءها!',
            '📊 `رصيد` لرؤية إحصاءاتك الكاملة 💹',
            '🎓 `ترقية` للوصول لمستويات أعلى في اللعبة 🚀',
            '🌟 كل يوم تفاعل = XP مجاني! لا توقفوا الكتابة ✍️',
            '💬 تكلموا أكثر في الشات — البوت يتعلم منكم! 🧠',
            '🛡️ محتاج مساعدة؟ اكتب `مساعدة` أو `help` 📋',
            '🎲 العب `عجلة` وجرب حظك! 🍀',
        ];
        await channel.send(tips[Math.floor(Math.random() * tips.length)]);
    }

    async startFastestClicker(channel) {
        const reward = Math.floor(Math.random() * 900) + 200;
        const embed = new EmbedBuilder()
            .setColor('#FFD700')
            .setTitle('🎁 هدية الأسرع!')
            .setDescription(`أول شخص يضغط يأخذ **${reward.toLocaleString()}** ${config.currency}!\n⏳ **15 ثانية** فقط! أسرع! 🔥`)
            .setTimestamp();

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('fast_click_gift')
                .setLabel(`🔥 اضغط الحين! (${reward.toLocaleString()} 💰)`)
                .setStyle(ButtonStyle.Success)
        );

        const msg = await channel.send({ embeds: [embed], components: [row] });

        const collector = msg.createMessageComponentCollector({
            filter: i => i.customId === 'fast_click_gift',
            time: 15000,
            max: 1
        });

        collector.on('collect', async i => {
            const userData = db.getUserData(i.user.id);
            userData.balance = (userData.balance || 0) + reward;
            db.updateUserData(i.user.id, userData);

            await i.update({
                embeds: [new EmbedBuilder()
                    .setColor('#2ECC71')
                    .setTitle('🏆 فاز!')
                    .setDescription(`مبروك <@${i.user.id}>! ما أسرعك! 🔥\nخذ **${reward.toLocaleString()}** ${config.currency} مالتك! 💸`)
                    .setTimestamp()],
                components: []
            });
        });

        collector.on('end', collected => {
            if (collected.size === 0) {
                msg.edit({
                    embeds: [new EmbedBuilder().setColor('#E74C3C').setDescription('⏰ انتهى الوقت! يا بطيئين 🐢')],
                    components: []
                }).catch(() => { });
            }
        });
    }

    async getRandomChannel(guild) {
        const guildData = db.getGuildData(guild.id);
        
        // 1. Try to find the AI bot channel
        if (guildData.aiChannel) {
            const aiCh = guild.channels.cache.get(guildData.aiChannel);
            if (aiCh && aiCh.permissionsFor(guild.members.me)?.has(['SendMessages', 'ViewChannel'])) {
                return aiCh;
            }
        }
        
        // 2. Try to find the General Chat channel by name
        const generalCh = guild.channels.cache.find(ch => ch.type === 0 && (ch.name.includes('الدردشة-العامة') || ch.name.includes('general')) && ch.permissionsFor(guild.members.me)?.has(['SendMessages', 'ViewChannel']));
        if (generalCh) return generalCh;
        
        // 3. Fallback to any channel that has AI or bot in name
        const fallbackCh = guild.channels.cache.find(ch => ch.type === 0 && ch.name.includes('بوت') && ch.permissionsFor(guild.members.me)?.has(['SendMessages', 'ViewChannel']));
        
        return fallbackCh || null;
    }
}

module.exports = new RandomInteractions();
