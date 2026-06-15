const { PremiumEmbedBuilder, ICONS } = require('../../utils/embed-builder');
const { ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require('../../utils/database');
const config = require('../../config');

const triviaQuestions = {
    islam: [
        { q: 'من هو أول الأئمة المعصومين؟', a: ['علي', 'الامام علي', 'علي بن ابي طالب'], difficulty: 'easy' },
        { q: 'ما هو يوم الغدير؟', a: ['عيد الولاية', 'تنصيب الامام علي', '18 ذو الحجة'], difficulty: 'easy' },
        { q: 'من هو الإمام المهدي (عج)؟', a: ['محمد بن الحسن', 'الحجة', 'القائم'], difficulty: 'easy' },
        { q: 'ما اسم معركة كربلاء؟', a: ['الطف', 'واقعة الطف'], difficulty: 'medium' },
        { q: 'من هي سيدة نساء العالمين؟', a: ['فاطمة', 'الزهراء', 'فاطمة الزهراء'], difficulty: 'medium' },
        { q: 'كم عدد المعصومين؟', a: ['14', 'أربعة عشر'], difficulty: 'medium' },
        { q: 'من هو الإمام الملقب بـ "باقر العلم"؟', a: ['محمد الباقر', 'الامام الباقر'], difficulty: 'medium' },
        { q: 'أين ولد الإمام علي (ع)؟', a: ['الكعبة', 'جوف الكعبة'], difficulty: 'easy' },
        { q: 'من هو سفير الإمام الحسين (ع) إلى الكوفة؟', a: ['مسلم بن عقيل', 'مسلم'], difficulty: 'hard' },
        { q: 'متى وقعت معركة الجمل؟', a: ['36 هجري', '36'], difficulty: 'hard' },
        { q: 'من هو كفيل زينب (ع)؟', a: ['العباس', 'ابو الفضل', 'ابو الفضل العباس'], difficulty: 'easy' },
        { q: 'في أي يوم استشهد الإمام الحسين (ع)؟', a: ['10 محرم', 'عاشوراء'], difficulty: 'easy' },
        { q: 'من هي أم البنين؟', a: ['فاطمة الكلابية', 'زوجة الامام علي'], difficulty: 'medium' },
        { q: 'ما هو لقب الإمام زين العابدين؟', a: ['السجاد', 'ذو الثفنات'], difficulty: 'medium' },
        { q: 'أين يقع مرقد الإمام الرضا (ع)؟', a: ['مشهد', 'ايران'], difficulty: 'medium' },
        { q: 'من هو باب الحوائج؟', a: ['العباس', 'موسى بن جعفر', 'الامام الكاظم'], difficulty: 'easy' },
        { q: 'من هو الإمام الذي استشهد بالسم في سجن هارون؟', a: ['موسى الكاظم', 'الكاظم'], difficulty: 'medium' },
        { q: 'من هو الإمام "الرضا"؟', a: ['علي بن موسى', 'علي الرضا'], difficulty: 'easy' },
        { q: 'من هي "بنت الهدى"؟', a: ['آمنة الصدر', 'اخت الصدر'], difficulty: 'hard' },
        { q: 'ما هو الكتاب الذي جمع خطب الإمام علي (ع)؟', a: ['نهج البلاغة'], difficulty: 'easy' },
        { q: 'من هو الصحابي الذي نفي إلى الربذة؟', a: ['أبو ذر الغفاري', 'ابو ذر'], difficulty: 'medium' },
        { q: 'من هو مؤذن الرسول (ص)؟', a: ['بلال الحبشي', 'بلال'], difficulty: 'easy' },
        { q: 'من هو "أسد الله الغالب"؟', a: ['علي بن ابي طالب', 'الامام علي'], difficulty: 'easy' },
        { q: 'من هو الإمام الذي يلقب بـ "الجواد"؟', a: ['محمد الجواد', 'محمد بن علي'], difficulty: 'medium' },
        { q: 'أين يقع مرقد الإمامين العسكريين؟', a: ['سامراء'], difficulty: 'medium' },
        { q: 'من هي زوجة الإمام الحسين (ع) وأم علي الأكبر؟', a: ['ليلى العامرية', 'ليلى'], difficulty: 'hard' },
        { q: 'من هو قاتل الإمام علي (ع)؟', a: ['عبدالرحمن بن ملجم', 'ابن ملجم'], difficulty: 'easy' },
        { q: 'من هو "شهيد المحراب"؟', a: ['الامام علي', 'محمد باقر الحكيم'], difficulty: 'medium' },
        { q: 'من هو صاحب "مفاتیح الجنان"؟', a: ['عباس القمي', 'الشيخ القمي'], difficulty: 'medium' },
        { q: 'ما هي السورة التي تسمى "قلب القرآن"؟', a: ['يس', 'ياسين'], difficulty: 'easy' },
        { q: 'من هو الإمام العاشر؟', a: ['علي الهادي', 'الامام الهادي'], difficulty: 'medium' },
        { q: 'من هو الإمام الذي عاش أقصر عمر؟', a: ['محمد الجواد', 'الامام الجواد'], difficulty: 'hard' },
        { q: 'من هو "شيخ الطائفة"؟', a: ['الطوسي', 'الشيخ الطوسي'], difficulty: 'hard' },
        { q: 'من هو مؤلف كتاب "الكافي"؟', a: ['الكليني', 'الشيخ الكليني'], difficulty: 'medium' },
        { q: 'أين ولد الإمام المهدي (عج)؟', a: ['سامراء'], difficulty: 'medium' },
        { q: 'متى كانت الغيبة الكبرى؟', a: ['329 هجري', '329'], difficulty: 'hard' },
        { q: 'من هو أول سفراء الإمام المهدي؟', a: ['عثمان بن سعيد'], difficulty: 'hard' },
        { q: 'من هو "مؤمن آل فرعون" في زمن النبي؟', a: ['أبو طالب', 'ابو طالب'], difficulty: 'medium' },
        { q: 'ما هي أطول سورة في القرآن؟', a: ['البقرة'], difficulty: 'easy' },
        { q: 'كم عدد ركعات صلاة الليل (مع الشفع والوتر)؟', a: ['11', 'إحدى عشر'], difficulty: 'medium' },
        { q: 'ما هو "حديث الكساء"؟', a: ['حديث اهل البيت', 'تطهير اهل البيت'], difficulty: 'easy' },
        { q: 'من هي "فاطمة المعصومة"؟', a: ['اخت الرضا', 'ابنة الكاظم'], difficulty: 'easy' },
        { q: 'أين دفنت السيدة زينب (ع)؟', a: ['دمشق', 'الشام', 'سوريا'], difficulty: 'easy' },
        { q: 'من هو "حبيب بن مظاهر"؟', a: ['صحابي', 'نصير الحسين'], difficulty: 'medium' },
        { q: 'من هو "الحر الرياحي"؟', a: ['اول شهيد', 'قائد جيش'], difficulty: 'medium' },
        { q: 'ما هي "ليلة القدر"؟', a: ['خير من الف شهر', '23 رمضان', '19 رمضان', '21 رمضان'], difficulty: 'easy' },
        { q: 'من هو النبي الذي ابتلعه الحوت؟', a: ['يون1س', 'ذي النون'], difficulty: 'easy' },
        { q: 'من هو كليم الله؟', a: ['موسى', 'النبي موسى'], difficulty: 'easy' },
        { q: 'ما هو اسم أم الإمام المهدي (عج)؟', a: ['نرجس', 'السيدة نرجس'], difficulty: 'medium' },
        { q: 'من هو "قمر بني هاشم"؟', a: ['العباس', 'ابو الفضل'], difficulty: 'easy' },
        { q: 'من هو خطيب كربلاء؟', a: ['الامام السجاد', 'زين العابدين'], difficulty: 'medium' },
        { q: 'من هو الصحابي الذي أرسى قواعد النحو؟', a: ['أبو الأسود الدؤلي'], difficulty: 'hard' },
        { q: 'ما هي عاصمة الدولة الفاطمية؟', a: ['القاهرة'], difficulty: 'medium' },
        { q: 'من بنى مدينة النجف الاشرف؟', a: ['عضد الدولة'], difficulty: 'hard' }
    ],
    history: [
        { q: 'في أي سنة بدأت الحرب العالمية الثانية؟', a: ['1939'], difficulty: 'medium' },
        { q: 'من هو مؤسس الدولة الصفوية؟', a: ['اسماعيل الصفوي', 'الشاه اسماعيل'], difficulty: 'medium' },
        { q: 'متى سقطت الدولة العباسية؟', a: ['1258', '656'], difficulty: 'medium' },
        { q: 'من هو قائد ثورة العشرين في العراق؟', a: ['الشيرازي', 'الميرزا محمد تقي'], difficulty: 'hard' },
        { q: 'من قام بقتل المختار الثقفي؟', a: ['مصعب بن الزبير', 'جيش الزبير'], difficulty: 'hard' },
        { q: 'في أي عام كانت فتوى الجهاد الكفائي؟', a: ['2014'], difficulty: 'easy' },
        { q: 'من هو "المختار الثقفي"؟', a: ['طالب بدم الحسين', 'المختار'], difficulty: 'easy' },
        { q: 'أين حدثت ثورة التوابين؟', a: ['الكوفة', 'العراق'], difficulty: 'medium' },
        { q: 'من هو القائد المسلم الذي فتح الأندلس؟', a: ['طارق بن زياد'], difficulty: 'easy' },
        { q: 'في أي معركة انتصر المسلمون على المغول؟', a: ['عين جالوت'], difficulty: 'medium' },
        { q: 'من هو صلاح الدين الأيوبي؟', a: ['محرر القدس', 'قائد مسلم'], difficulty: 'easy' },
        { q: 'من حكم مصر قبل العثمانيين؟', a: ['المماليك'], difficulty: 'medium' },
        { q: 'من هو باني بغداد؟', a: ['المنصور', 'أبو جعفر المنصور'], difficulty: 'medium' },
        { q: 'متى تم تأميم قناة السويس؟', a: ['1956'], difficulty: 'hard' },
        { q: 'ما هي أقدم حضارة في العالم؟', a: ['سومر', 'السومرية'], difficulty: 'easy' },
        { q: 'من هو حمورابي؟', a: ['ملك بابلي', 'واضع القوانين'], difficulty: 'easy' },
        { q: 'متى تأسس الحشد الشعبي؟', a: ['2014'], difficulty: 'easy' },
        { q: 'من هو الزعيم الهندي الذي قاد المقاومة السلمية؟', a: ['غاندي'], difficulty: 'easy' },
        { q: 'ما هو الاسم القديم لايران؟', a: ['فارس', 'بلاد فارس'], difficulty: 'easy' },
        { q: 'من هو أول رئيس للجمهورية العراقية؟', a: ['محمد نجيب الربيعي', 'عبدالكريم قاسم'], difficulty: 'hard' },
        { q: 'متى انتهت الحرب العراقية الإيرانية؟', a: ['1988'], difficulty: 'medium' },
        { q: 'من هو الذي يلقب بـ "شيخ المجاهدين" في ليبيا؟', a: ['عمر المختار'], difficulty: 'easy' },
        { q: 'ما هي معركة "ذي قار"؟', a: ['هزيمة الفرس', 'انتصار العرب'], difficulty: 'medium' },
        { q: 'من هو الخليفة الذي جمع القرآن؟', a: ['الامام علي', 'علي'], difficulty: 'hard' },
        { q: 'من هو "أمير المؤمنين" الحقيقي؟', a: ['علي بن ابي طالب', 'الامام علي'], difficulty: 'easy' },
        { q: 'متى حدثت واقعة الحرة؟', a: ['63 هجري', '63'], difficulty: 'hard' },
        { q: 'من الذي هدم قبور البقيع؟', a: ['الوهابية', 'ال سعود'], difficulty: 'easy' },
        { q: 'أين يقع وادي السلام؟', a: ['النجف', 'العراق'], difficulty: 'easy' },
        { q: 'من هو الصحابي الذي دافع عن الإمام علي في الشورى؟', a: ['عمار بن ياسر', 'المقداد'], difficulty: 'hard' },
        { q: 'من هو "مالك الأشتر"؟', a: ['قائد جيش علي', 'صاحب علي'], difficulty: 'easy' },
        { q: 'في أي سنة كانت الهجرة النبوية؟', a: ['622 ميلادي', '1 هجري'], difficulty: 'medium' },
        { q: 'من هو "سلمان المحمدي"؟', a: ['سلمان الفارسي', 'صحابي'], difficulty: 'easy' },
        { q: 'متى وقع صلح الحسن (ع)؟', a: ['41 هجري', '41'], difficulty: 'hard' },
        { q: 'من هو قاتل حمزة سيد الشهداء؟', a: ['وحشي'], difficulty: 'medium' },
        { q: 'ما هي عاصمة المناذرة؟', a: ['الحيرة'], difficulty: 'hard' },
        { q: 'من هو الذي قاد جيش التوابين؟', a: ['سليمان بن صرد'], difficulty: 'hard' },
        { q: 'من هو الشهيد الصدر الأول؟', a: ['محمد باقر الصدر'], difficulty: 'medium' },
        { q: 'من مؤلفة كتاب "فدك في التاريخ"؟', a: ['الشهيدة الصدر', 'بنت الهدى'], difficulty: 'hard' },
        { q: 'من هو "الخميني"؟', a: ['قائد الثورة', 'روح الله'], difficulty: 'easy' },
        { q: 'متى انتصرت الثورة الإسلامية في إيران؟', a: ['1979'], difficulty: 'medium' },
        { q: 'من هو "جمال عبدالناصر"؟', a: ['رئيس مصر', 'زعيم عربي'], difficulty: 'easy' },
        { q: 'ما هي "وعد بلفور"؟', a: ['وعد المشؤوم', 'تأسيس اسرائيل'], difficulty: 'easy' },
        { q: 'من بنى الكوفة؟', a: ['سعد بن ابي وقاص'], difficulty: 'medium' },
        { q: 'من بنى البصرة؟', a: ['عتبة بن غزوان'], difficulty: 'hard' },
        { q: 'من هو مؤلف "تاريخ الأمم والملوك"؟', a: ['الطبري'], difficulty: 'medium' },
        { q: 'ما هي "داحس والغبراء"؟', a: ['حرب جاهلية'], difficulty: 'easy' },
        { q: 'من هو قائد القادسية؟', a: ['سعد بن ابي وقاص'], difficulty: 'medium' },
        { q: 'من هو "النمرود"؟', a: ['ملك جبار', 'عدو ابراهيم'], difficulty: 'easy' },
        { q: 'في أي بلد قامت حضارة الإنكا؟', a: ['البيرو', 'بيرو'], difficulty: 'hard' },
        { q: 'متى سقط جدار برلين؟', a: ['1989'], difficulty: 'medium' },
        { q: 'من هو مكتشف أمريكا؟', a: ['كولومبوس'], difficulty: 'easy' }
    ],
    geography: [
        { q: 'ما عاصمة فرنسا؟', a: ['باريس'], difficulty: 'easy' },
        { q: 'أين يقع برج إيفل؟', a: ['باريس', 'فرنسا'], difficulty: 'easy' },
        { q: 'ما أكبر دولة في العالم من حيث المساحة؟', a: ['روسيا'], difficulty: 'medium' },
        { q: 'ما أطول نهر في العالم؟', a: ['النيل', 'نهر النيل'], difficulty: 'medium' },
        { q: 'ما عاصمة السعودية؟', a: ['الرياض'], difficulty: 'easy' },
        { q: 'ما هي أكبر قارة في العالم؟', a: ['آسيا', 'اسيا'], difficulty: 'easy' },
        { q: 'ما هي عاصمة اليابان؟', a: ['طوكيو'], difficulty: 'medium' },
        { q: 'أين يقع نهر الأمازون؟', a: ['امريكا الجنوبية', 'البرازيل'], difficulty: 'medium' },
        { q: 'ما هي الدولة التي تشبه الحذاء؟', a: ['ايطاليا'], difficulty: 'easy' },
        { q: 'ما هي عاصمة مصر؟', a: ['القاهرة'], difficulty: 'easy' },
        { q: 'ما هي عاصمة العراق؟', a: ['بغداد'], difficulty: 'easy' },
        { q: 'أين يقع "جبل أحد"؟', a: ['المدينة المنورة', 'المدينة'], difficulty: 'medium' },
        { q: 'ما هي عاصمة إيران؟', a: ['طهران'], difficulty: 'easy' },
        { q: 'ما هي عاصمة لبنان؟', a: ['بيروت'], difficulty: 'easy' },
        { q: 'ما هي عاصمة سوريا؟', a: ['دمشق'], difficulty: 'easy' },
        { q: 'أين يقع "بحر النجف"؟', a: ['النجف', 'العراق'], difficulty: 'easy' },
        { q: 'ما هي المدينة التي تسمى "الفسطاط" قديماً؟', a: ['القاهرة'], difficulty: 'hard' },
        { q: 'ما هي عاصمة اليمن؟', a: ['صنعاء'], difficulty: 'easy' },
        { q: 'ما هي عاصمة البحرين؟', a: ['المنامة'], difficulty: 'easy' },
        { q: 'أين يقع المسجد الأقصى؟', a: ['القدس', 'فلسطين'], difficulty: 'easy' },
        { q: 'ما هي أكبر بحيرة في العالم؟', a: ['قزوين'], difficulty: 'medium' },
        { q: 'ما هي أصغر دولة في العالم؟', a: ['الفاتيكان'], difficulty: 'medium' },
        { q: 'ما هي عاصمة تركيا؟', a: ['انقرة', 'أنقرة'], difficulty: 'medium' },
        { q: 'أين تقع الأهوار؟', a: ['العراق', 'جنوب العراق'], difficulty: 'easy' },
        { q: 'ما هي عاصمة الأردن؟', a: ['عمان'], difficulty: 'easy' },
        { q: 'ما هي عاصمة الكويت؟', a: ['الكويت'], difficulty: 'easy' },
        { q: 'ما هي عاصمة قطر؟', a: ['الدوحة'], difficulty: 'easy' },
        { q: 'ما هي عاصمة الإمارات؟', a: ['ابو ظبي', 'أبوظبي'], difficulty: 'medium' },
        { q: 'ما هي عاصمة عمان؟', a: ['مسقط'], difficulty: 'easy' },
        { q: 'ما هي عاصمة المغرب؟', a: ['الرباط'], difficulty: 'easy' },
        { q: 'ما هي عاصمة الجزائر؟', a: ['الجزائر'], difficulty: 'easy' },
        { q: 'ما هي عاصمة تونس؟', a: ['تونس'], difficulty: 'easy' },
        { q: 'ما هي عاصمة السودان؟', a: ['الخرطوم'], difficulty: 'easy' },
        { q: 'أين يقع مضيق هرمز؟', a: ['الخليج العربي', 'الخليج'], difficulty: 'medium' },
        { q: 'ما هي أعلى قمة في العالم؟', a: ['ايفرست', 'افريست'], difficulty: 'medium' },
        { q: 'ما هي المدينة الملقبة بـ "أم الربيعين"؟', a: ['الموصل'], difficulty: 'medium' },
        { q: 'ما هي عاصمة أستراليا؟', a: ['كانبرا'], difficulty: 'hard' },
        { q: 'ما هي عاصمة كندا؟', a: ['اوتاوا'], difficulty: 'hard' },
        { q: 'ما هي عاصمة ألمانيا؟', a: ['برلين'], difficulty: 'easy' },
        { q: 'ما هي عاصمة بريطانيا؟', a: ['لندن'], difficulty: 'easy' },
        { q: 'أين يقع نهر دجلة؟', a: ['العراق'], difficulty: 'easy' },
        { q: 'أين يقع نهر الفرات؟', a: ['العراق', 'سوريا و العراق'], difficulty: 'easy' },
        { q: 'ما هي عاصمة البرازيل؟', a: ['برازيليا'], difficulty: 'medium' },
        { q: 'ما هي عاصمة الأرجنتين؟', a: ['بوينس ايرس'], difficulty: 'medium' },
        { q: 'ما هي عاصمة الهند؟', a: ['نيودلهي'], difficulty: 'medium' },
        { q: 'ما هي عاصمة الصين؟', a: ['بكبن', 'بكين'], difficulty: 'easy' },
        { q: 'ما هي عاصمة روسيا؟', a: ['موسكو'], difficulty: 'easy' },
        { q: 'ما هي عاصمة إسبانيا؟', a: ['مدريد'], difficulty: 'easy' },
        { q: 'ما هي عاصمة إيطاليا؟', a: ['روما'], difficulty: 'easy' },
        { q: 'أين تقع الكعبة المشرفة؟', a: ['مكة', 'السعودية'], difficulty: 'easy' },
        { q: 'ما هي المدينة المقدسة عند الشيعة في إيران (غير مشهد)؟', a: ['قم', 'قم المقدسة'], difficulty: 'medium' }
    ],
    sports: [
        { q: 'كم عدد لاعبي فريق كرة القدم؟', a: ['11'], difficulty: 'easy' },
        { q: 'من هو الهداف التاريخي لكأس العالم؟', a: ['كلوزه', 'ميروسلاف كلوزه'], difficulty: 'hard' },
        { q: 'أين أقيمت كأس العالم 2022؟', a: ['قطر'], difficulty: 'easy' },
        { q: 'من فاز بالكرة الذهبية 2023؟', a: ['ميسي', 'ليونيل ميسي'], difficulty: 'medium' },
        { q: 'ما هي الدولة التي فازت بأكبر عدد من كؤوس العالم؟', a: ['البرازيل'], difficulty: 'medium' },
        { q: 'كم شوط في مباراة كرة السلة؟', a: ['4', 'أربعة'], difficulty: 'medium' },
        { q: 'من هو "صاروخ ماديرا"؟', a: ['كريستيانو رونالدو', 'رونالدو', 'الدون'], difficulty: 'easy' },
        { q: 'في أي عام فازت إسبانيا بكأس العالم؟', a: ['2010'], difficulty: 'hard' }
    ],
    technology: [
        { q: 'ما هو اختصار CPU؟', a: ['central processing unit', 'وحدة المعالجة المركزية'], difficulty: 'medium' },
        { q: 'من هو مؤسس شركة آبل؟', a: ['ستيف جوبز'], difficulty: 'easy' },
        { q: 'ما هو نظام تشغيل هواتف آيفون؟', a: ['ios'], difficulty: 'easy' },
        { q: 'ما هو الرام RAM؟', a: ['random access memory', 'الذاكرة العشوائية'], difficulty: 'medium' },
        { q: 'من يملك شركة فيسبوك (ميتا)؟', a: ['مارك زوكربيرغ', 'مارك'], difficulty: 'easy' },
        { q: 'ما هي أشهر لغة برمجة للويب؟', a: ['javascript', 'جافاسكربت', 'js'], difficulty: 'medium' },
        { q: 'ما هو السحابة (Cloud)؟', a: ['تخزين سحابي', 'سيرفرات'], difficulty: 'easy' },
        { q: 'متى تأسست جوجل؟', a: ['1998'], difficulty: 'hard' }
    ]
};

const activeTrivia = new Map();

async function startTriviaGame(source, topic, difficulty) {
    const channel = source.channel;
    const user = source.user || source.author;

    if (activeTrivia.has(channel.id)) {
        const msg = { content: '❌ هناك سؤال نشط بالفعل!', ephemeral: true };
        if (source.isRepliable && !source.replied) await source.reply(msg);
        else await channel.send(msg.content);
        return;
    }

    const questions = triviaQuestions[topic];
    const filteredQuestions = questions.filter(q => q.difficulty === difficulty);
    const question = filteredQuestions.length > 0
        ? filteredQuestions[Math.floor(Math.random() * filteredQuestions.length)]
        : questions[Math.floor(Math.random() * questions.length)];

    const rewards = { easy: 100, medium: 250, hard: 500 };
    const reward = rewards[difficulty] || 250;

    const embed = PremiumEmbedBuilder.game(
        `${ICONS.GAME} Trivia - ${topic.toUpperCase()}`,
        `**السؤال:**\n${question.q}`,
        [
            { name: '⏰ الوقت', value: '30 ثانية للإجابة', inline: true },
            { name: `${ICONS.MONEY} الجائزة`, value: `${reward} ${config.currency}`, inline: true },
            { name: '📊 الصعوبة', value: difficulty === 'easy' ? '🟢 سهل' : difficulty === 'medium' ? '🟡 متوسط' : '🔴 صعب', inline: true }
        ]
    );

    if (source.isRepliable && !source.replied && !source.deferred) {
        await source.update({ embeds: [embed], components: [] }).catch(async () => {
            await channel.send({ embeds: [embed] });
        });
    } else {
        await channel.send({ embeds: [embed], components: [] });
    }

    activeTrivia.set(channel.id, {
        question,
        reward,
        startTime: Date.now()
    });

    const filter = m => !m.author.bot;
    const collector = channel.createMessageCollector({ filter, time: 30000 });

    collector.on('collect', m => {
        const answer = m.content.toLowerCase().trim();
        const correctAnswers = question.a.map(a => a.toLowerCase());

        if (correctAnswers.includes(answer)) {
            const gameData = activeTrivia.get(channel.id);
            if (!gameData) return;

            activeTrivia.delete(channel.id);
            collector.stop();

            const timeTaken = ((Date.now() - gameData.startTime) / 1000).toFixed(1);

            db.addMoney(m.author.id, reward);
            const levels = require('../../utils/levels');
            levels.addXP(m.author.id, reward / 10, m);

            const successEmbed = PremiumEmbedBuilder.success(
                'إجابة صحيحة! 🎉',
                `**${m.author}** أجاب بشكل صحيح!`,
                [
                    { name: `${ICONS.CHECK} الإجابة`, value: question.a[0], inline: true },
                    { name: '⏱️ الوقت', value: `${timeTaken}s`, inline: true },
                    { name: `${ICONS.MONEY} الجائزة`, value: `+${reward} ${config.currency}`, inline: true }
                ]
            );

            m.reply({ embeds: [successEmbed] });
        }
    });

    collector.on('end', (collected, reason) => {
        if (reason === 'time' && activeTrivia.has(channel.id)) {
            const failEmbed = PremiumEmbedBuilder.error(
                'انتهى الوقت! ⏰',
                `لم يجب أحد بشكل صحيح.`,
                `الإجابة الصحيحة: **${question.a[0]}**`
            );
            channel.send({ embeds: [failEmbed] });
            activeTrivia.delete(channel.id);
        }
    });
}

module.exports = {
    name: 'trivia',
    aliases: ['سؤال', 'مسابقة'],
    description: 'مسابقة Trivia متنوعة',
    usage: 'trivia [الموضوع]',

    async execute(message, args) {
        if (activeTrivia.has(message.channel.id)) {
            return message.reply('❌ هناك سؤال نشط بالفعل!');
        }

        const topics = Object.keys(triviaQuestions);
        const selectedTopic = args[0]?.toLowerCase();

        if (selectedTopic && topics.includes(selectedTopic)) {
            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder().setCustomId(`trivia_diff_${selectedTopic}_easy`).setLabel('سهل').setStyle(ButtonStyle.Success).setEmoji('🟢'),
                    new ButtonBuilder().setCustomId(`trivia_diff_${selectedTopic}_medium`).setLabel('متوسط').setStyle(ButtonStyle.Primary).setEmoji('🟡'),
                    new ButtonBuilder().setCustomId(`trivia_diff_${selectedTopic}_hard`).setLabel('صعب').setStyle(ButtonStyle.Danger).setEmoji('🔴')
                );

            const embed = PremiumEmbedBuilder.game(
                `Trivia - مسابقة ${selectedTopic.toUpperCase()}`,
                'اختر مستوى الصعوبة لبدء اللعبة 🎮',
                []
            );

            await message.reply({ embeds: [embed], components: [row] });
            return;
        }

        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('trivia_topic_select')
            .setPlaceholder('اختر موضوع المسابقة')
            .addOptions(
                { label: 'إسلامية (Islam)', value: 'islam', description: 'أسئلة دينية (شيعية)', emoji: '🕌' },
                { label: 'تاريخ (History)', value: 'history', description: 'أحداث تاريخية هامة', emoji: '📜' },
                { label: 'جغرافيا (Geography)', value: 'geography', description: 'دول، عواصم، تضاريس', emoji: '🌍' },
                { label: 'رياضة (Sports)', value: 'sports', description: 'كرة قدم، كؤوس عالم، لاعبين', emoji: '⚽' },
                { label: 'تقنية (Tech)', value: 'technology', description: 'حواسيب، برمجيات، شركات', emoji: '💻' }
            );

        const row = new ActionRowBuilder().addComponents(selectMenu);

        const embed = PremiumEmbedBuilder.game(
            'Trivia - مسابقة معلومات',
            'اختر موضوع المسابقة من القائمة بالأسفل 👇',
            [
                {
                    name: '💡 طريقة اللعب',
                    value: '1. اختر الموضوع\n2. اختر درجة الصعوبة\n3. أجب عن السؤال في الوقت المحدد!'
                }
            ]
        );

        await message.reply({ embeds: [embed], components: [row] });
    },

    // مساعدات التفاعل
    async handleTriviaInteraction(interaction) {
        if (interaction.customId === 'trivia_topic_select') {
            const selectedTopic = interaction.values[0];

            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder().setCustomId(`trivia_diff_${selectedTopic}_easy`).setLabel('سهل').setStyle(ButtonStyle.Success).setEmoji('🟢'),
                    new ButtonBuilder().setCustomId(`trivia_diff_${selectedTopic}_medium`).setLabel('متوسط').setStyle(ButtonStyle.Primary).setEmoji('🟡'),
                    new ButtonBuilder().setCustomId(`trivia_diff_${selectedTopic}_hard`).setLabel('صعب').setStyle(ButtonStyle.Danger).setEmoji('🔴')
                );

            await interaction.update({
                content: `✅ تم اختيار الموضوع: **${selectedTopic}**\nالآن اختر مستوى الصعوبة:`,
                components: [row],
                embeds: []
            });
        }
        else if (interaction.customId.startsWith('trivia_diff_')) {
            const parts = interaction.customId.split('_');
            const topic = parts[2];
            const difficulty = parts[3];

            await startTriviaGame(interaction, topic, difficulty);
        }
    }
};
