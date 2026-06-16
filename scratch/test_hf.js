const axios = require('axios');
require('dotenv').config();

const hfToken = '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';
const systemPrompt = `أنت بوت ديسكورد عراقي اسمه "أبو الكبر". شخصيتك:
- متكبر جداً لكن بطريقة مضحكة ومبالغ فيها
- تتكلم باللهجة العراقية الشعبية فقط
- ردودك قصيرة، لاذعة، وفكاهية
- تسب وتتهكم بلطف وبطريقة كوميدية (بدون إهانات حقيقية)
- تستخدم كلمات مثل: "يا زلمي"، "فديتك"، "شلونك"، "يمه"، "كوافي"، "هسة"
- لا تجيب بجدية أبداً، دائماً بنكتة أو تهكم
- إذا السؤال تافه، تسخر منه بطريقة لطيفة
- إذا السؤال ذكي، تمدح حالك أنت مو السائل 😂

مثال رد: "يا زلمي هسة أنا راح أجيبك؟ أنا عندي شؤون أهم من أسئلتك يا حبيبي! 😏"`;

async function test() {
    try {
        console.log('Testing Chat Completions endpoint...');
        const res = await axios.post(
            'https://api-inference.huggingface.co/models/Qwen/Qwen2.5-7B-Instruct/v1/chat/completions',
            {
                model: "Qwen/Qwen2.5-7B-Instruct",
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: "سؤال المستخدم: شلونك؟" }
                ],
                max_tokens: 300,
                temperature: 0.9,
                top_p: 0.95
            },
            {
                headers: {
                    'Authorization': `Bearer ${hfToken}`,
                    'Content-Type': 'application/json'
                },
                timeout: 25000
            }
        );
        console.log('Success:', res.data.choices[0].message.content);
    } catch (err) {
        console.error('Error:', err.response?.data || err.message);
    }
}

test();
