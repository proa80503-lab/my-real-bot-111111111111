const config = require('../../config');

module.exports = {
    name: 'say',
    aliases: ['قول', 'تكلم', 'قل'],
    description: 'يجعل البوت يكرر ما تقوله',
    usage: 'say [النص] / قول [النص]',

    async execute(context, args) {
        // دعم الرسائل والتفاعلات
        const isInteraction = context.isCommand?.() || context.isButton?.();

        const text = args.join(' ');
        if (!text) {
            if (isInteraction) return context.reply({ content: '❌ يرجى كتابة النص الذي تريدني أن أقوله!', ephemeral: true });
            return context.reply('❌ يرجى كتابة النص الذي تريدني أن أقوله!');
        }

        // حذف رسالة المستخدم إذا كانت رسالة عادية
        if (!isInteraction && context.delete) {
            context.delete().catch(() => { });
        }

        if (isInteraction) {
            await context.reply({ content: text });
        } else {
            await context.channel.send(text);
        }
    }
};
