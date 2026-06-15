const db = require('../../utils/database');
const { PremiumEmbedBuilder } = require('../../utils/embed-builder');

module.exports = {
    name: 'set-birthday',
    aliases: ['birthday', 'عيد_ميلاد', 'ميلاد'],
    description: 'تعيين تاريخ ميلادك للحصول على مفاجآت!',
    usage: 'MM-DD', // Month-Day
    async execute(message, args) {
        if (!args[0]) {
            return message.reply(`❌ الاستخدام الصحيح: \`!عيد_ميلاد MM-DD\`\nمثال: \`!عيد_ميلاد 12-25\` (لشهر 12 يوم 25)`);
        }

        const dateParts = args[0].split(/[/-]/);
        if (dateParts.length !== 2) {
            return message.reply('❌ تنسيق التاريخ غير صحيح! استخدم `MM-DD` (شهر-يوم)');
        }

        const month = parseInt(dateParts[0]);
        const day = parseInt(dateParts[1]);

        if (isNaN(month) || isNaN(day) || month < 1 || month > 12 || day < 1 || day > 31) {
            return message.reply('❌ تاريخ غير صالح! تأكد من الشهر واليوم.');
        }

        // Check for edge cases (e.g. Feb 30) - simple check
        const daysInMonth = new Date(2024, month, 0).getDate(); // 2024 is leap year, safe bet
        if (day > daysInMonth) {
            return message.reply(`❌ هذا الشهر يحتوي فقط على ${daysInMonth} يوم!`);
        }

        const userData = db.getUserData(message.author.id);

        // Prevent changing birthday too often (optional, but good practice)
        // For now, let's allow it, or maybe once per year? 
        // Let's just allow it for simplicity as user asked "how does it work".

        userData.birthday = `${month}-${day}`;
        db.updateUserData(message.author.id, userData);

        const embed = PremiumEmbedBuilder.success(
            '🎉 تم حفظ تاريخ ميلادك!',
            `سنحتفل بك في **${day}-${month}** من كل عام! 🎂`,
            [
                { name: 'التاريخ المسجل', value: `${month}-${day}`, inline: true },
                { name: 'الهدية المتوقعة', value: '5000 عملة 💰', inline: true }
            ]
        );

        return message.reply({ embeds: [embed] });
    }
};
