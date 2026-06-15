const fs = require('fs');
const path = require('path');
const config = require('../../config');

const responsesPath = path.join(__dirname, '../../data/responses.json');

// Ensure the file exists
if (!fs.existsSync(responsesPath)) {
    if (!fs.existsSync(path.dirname(responsesPath))) fs.mkdirSync(path.dirname(responsesPath), { recursive: true });
    fs.writeFileSync(responsesPath, JSON.stringify({ responses: {} }, null, 4));
}

let responses = require(responsesPath);

module.exports = {
    name: 'custom_responses',
    aliases: ['اضافة_رد', 'تعديل_رد', 'ردود'],
    description: 'إدارة الردود التلقائية (للمالك فقط)',
    usage: 'اضافة_رد / تعديل_رد',

    async execute(message, args) {
        if (message.author.id !== config.ownerId) return message.reply('❌ هذا الأمر مخصص لصاحب البوت فقط!');

        const cmd = args[0] ? args[0].toLowerCase() : (message.content.includes('اضافة') ? 'add' : 'edit');

        if (cmd === 'add' || message.content.includes('اضافة')) {
            await addResponseModular(message);
        } else {
            await editResponseModular(message);
        }
    },

    async checkResponse(message) {
        if (message.author.bot) return false;
        const content = message.content.toLowerCase().trim();
        if (responses.responses[content]) {
            await message.reply(responses.responses[content]);
            return true;
        }
        return false;
    }
};

async function addResponseModular(message) {
    const filter = m => m.author.id === message.author.id;
    await message.reply('✍️ اكتب الكلمة التي تريد إضافة رد لها:');
    try {
        const wordCollector = await message.channel.awaitMessages({ filter, max: 1, time: 60000, errors: ['time'] });
        const word = wordCollector.first().content.toLowerCase().trim();
        if (responses.responses[word]) return message.reply(`⚠️ كلمة **${word}** موجودة بالفعل!`);
        await message.reply(`✍️ الآن اكتب الرد الذي تريده لكلمة **${word}**:`);
        const respCollector = await message.channel.awaitMessages({ filter, max: 1, time: 60000, errors: ['time'] });
        const respText = respCollector.first().content;
        responses.responses[word] = respText;
        fs.writeFileSync(responsesPath, JSON.stringify(responses, null, 4));
        await message.reply(`✅ تم إضافة الرد بنجاح!\nالكلمة: **${word}**\nالرد: **${respText}**`);
    } catch (e) { message.reply('⏰ انتهى الوقت أو حدث خطأ.'); }
}

async function editResponseModular(message) {
    const filter = m => m.author.id === message.author.id;
    await message.reply('✍️ اكتب الكلمة التي تريد تعديل ردها:');
    try {
        const wordCollector = await message.channel.awaitMessages({ filter, max: 1, time: 60000, errors: ['time'] });
        const word = wordCollector.first().content.toLowerCase().trim();
        if (!responses.responses[word]) return message.reply(`⚠️ كلمة **${word}** غير موجودة!`);
        await message.reply(`✍️ الرد الحالي: **${responses.responses[word]}**\nاكتب الرد الجديد:`);
        const respCollector = await message.channel.awaitMessages({ filter, max: 1, time: 60000, errors: ['time'] });
        const newText = respCollector.first().content;
        responses.responses[word] = newText;
        fs.writeFileSync(responsesPath, JSON.stringify(responses, null, 4));
        await message.reply(`✅ تم تعديل الرد بنجاح!\nالكلمة: **${word}**\nالرد الجديد: **${newText}**`);
    } catch (e) { message.reply('⏰ انتهى الوقت أو حدث خطأ.'); }
}
