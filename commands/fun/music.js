module.exports = {
    name: 'music',
    aliases: ['شغل', 'شغيل', 'play', 'p', 'وقف', 'stop', 'سكيب', 'skip', 'طابور', 'قائمة', 'queue', 'loop', 'تكرار', 'صوت', 'vol', 'الحين', 'np', 'بوز', 'توقف', 'pause', 'كمل', 'resume'],
    description: 'تم إيقاف نظام الموسيقى',
    usage: 'شغل <اسم الأغنية>',

    async execute(message, args) {
        return message.reply('❌ **تم إيقاف وحذف نظام الموسيقى بالكامل من البوت بناءً على طلب الإدارة.**');
    }
};
