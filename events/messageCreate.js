const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits, MessageFlags } = require('discord.js');

// 20 لون متنوع
const COLORS = {
    red: { name: 'أحمر', hex: '#FF0000', emoji: '🔴' },
    orange: { name: 'برتقالي', hex: '#FF8800', emoji: '🟠' },
    yellow: { name: 'أصفر', hex: '#FFFF00', emoji: '🟡' },
    lime: { name: 'أخضر ليموني', hex: '#88FF00', emoji: '🟢' },
    green: { name: 'أخضر', hex: '#00FF00', emoji: '💚' },
    cyan: { name: 'سماوي', hex: '#00FFFF', emoji: '💠' },
    blue: { name: 'أزرق', hex: '#0088FF', emoji: '🔵' },
    navy: { name: 'أزرق غامق', hex: '#0000FF', emoji: '💙' },
    purple: { name: 'بنفسجي', hex: '#8800FF', emoji: '💜' },
    magenta: { name: 'ماجنتا', hex: '#FF00FF', emoji: '🩷' },
    pink: { name: 'وردي', hex: '#FF88FF', emoji: '🌸' },
    brown: { name: 'بني', hex: '#8B4513', emoji: '🤎' },
    black: { name: 'أسود', hex: '#000000', emoji: '⚫' },
    white: { name: 'أبيض', hex: '#FFFFFF', emoji: '⚪' },
    gold: { name: 'ذهبي', hex: '#FFD700', emoji: '🟡' },
    silver: { name: 'فضي', hex: '#C0C0C0', emoji: '⚪' },
    rose: { name: 'وردي فاتح', hex: '#FF69B4', emoji: '🌹' },
    teal: { name: 'أزرق مخضر', hex: '#008080', emoji: '🩵' },
    coral: { name: 'مرجاني', hex: '#FF7F50', emoji: '🧡' },
    lavender: { name: 'لافندر', hex: '#E6E6FA', emoji: '💟' }
};

// تفعيل نظام الألوان (للإدمن فقط)
async function setupColors(message) {
    if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
        return message.reply('❌ هذا الأمر للإداريين فقط!');
    }

    const msg = await message.reply('⏳ جاري إنشاء رتب الألوان...');

    try {
        let created = 0;
        let existing = 0;

        for (const [id, color] of Object.entries(COLORS)) {
            const roleName = `🎨 ${color.name}`;

            // تحقق إذا الرول موجود
            let role = message.guild.roles.cache.find(r => r.name === roleName);

            if (!role) {
                // إنشاء الرول
                role = await message.guild.roles.create({
                    name: roleName,
                    color: color.hex,
                    permissions: [],
                    mentionable: false,
                    reason: 'Color role system'
                });
                created++;
            } else {
                existing++;
            }
        }

        const embed = new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle('✅ تم تفعيل نظام الألوان!')
            .setDescription(`تم إنشاء **${created} رتبة** جديدة\nرتب موجودة: **${existing}**\n\nالآن يمكن للأعضاء استخدام \`الوان\` لاختيار ألوانهم!`)
            .addFields({ name: '📝 ملاحظة', value: 'تأكد من وضع رتبة البوت فوق رتب الألوان في إعدادات السيرفر!' })
            .setTimestamp();

        await msg.edit({ content: null, embeds: [embed] });

    } catch (error) {
        console.error('خطأ في إنشاء الرتب:', error);
        await msg.edit('❌ حدث خطأ! تأكد من أن البوت لديه صلاحيات إدارة الرتب.');
    }
}

// عرض الألوان (للجميع)
async function showColors(message) {
    const embed = new EmbedBuilder()
        .setColor('#9B59B6')
        .setTitle('🎨 اختر لونك المفضل!')
        .setDescription('اضغط على الزر لتغيير لون اسمك في السيرفر\n**20 لون** متاح للاختيار!')
        .setFooter({ text: 'يمكنك التبديل بين الألوان في أي وقت' })
        .setTimestamp();

    // صف أزرار (5x4 = 20 زر)
    const rows = [];
    const colorEntries = Object.entries(COLORS);

    for (let i = 0; i < 4; i++) {
        const row = new ActionRowBuilder();
        const startIndex = i * 5;

        for (let j = 0; j < 5 && (startIndex + j) < colorEntries.length; j++) {
            const [id, color] = colorEntries[startIndex + j];

            row.addComponents(
                new ButtonBuilder()
                    .setCustomId(`color_${id}`)
                    .setLabel(color.name)
                    .setEmoji(color.emoji)
                    .setStyle(getButtonStyle(i * 5 + j))
            );
        }

        rows.push(row);
    }

    await message.reply({ embeds: [embed], components: rows });
}

// اختيار ستايل الزر حسب الترتيب
function getButtonStyle(index) {
    const styles = [
        ButtonStyle.Danger,    // أحمر
        ButtonStyle.Danger,    // برتقالي
        ButtonStyle.Primary,   // أصفر
        ButtonStyle.Success,   // أخضر ليموني
        ButtonStyle.Success,   // أخضر
        ButtonStyle.Primary,   // سماوي
        ButtonStyle.Primary,   // أزرق
        ButtonStyle.Primary,   // أزرق غامق
        ButtonStyle.Primary,   // بنفسجي
        ButtonStyle.Danger,    // ماجنتا
        ButtonStyle.Danger,    // وردي
        ButtonStyle.Secondary, // بني
        ButtonStyle.Secondary, // أسود
        ButtonStyle.Secondary, // أبيض
        ButtonStyle.Primary,   // ذهبي
        ButtonStyle.Secondary, // فضي
        ButtonStyle.Danger,    // وردي فاتح
        ButtonStyle.Primary,   // أزرق مخضر
        ButtonStyle.Danger,    // مرجاني
        ButtonStyle.Primary    // لافندر
    ];
    return styles[index] || ButtonStyle.Secondary;
}

// معالج الزر
async function handleColorButton(interaction) {
    const colorId = interaction.customId.replace('colorole_', '').replace('color_', '');
    return assignColorRole(interaction, colorId);
}

// دالة إسناد اللون وتخليق الرتبة ديناميكياً إذا اختفت
async function assignColorRole(interaction, identifier) {
    // البحث عن اللون بالاسم الإنجليزي أو العربي
    let color = COLORS[identifier];
    if (!color) {
        color = Object.values(COLORS).find(c => c.name === identifier || c.name.replace('🎨 ', '') === identifier);
    }

    if (!color) {
        return interaction.reply({ content: '❌ لون غير معروف!', flags: MessageFlags.Ephemeral });
    }

    try {
        const roleName = `🎨 ${color.name}`;
        let role = interaction.guild.roles.cache.find(r => r.name === roleName);

        if (!role) {
            // إنشاء الرتبة تلقائياً إذا حُذفت أو لم تُنشأ من قبل
            try {
                role = await interaction.guild.roles.create({
                    name: roleName,
                    color: color.hex,
                    permissions: [],
                    mentionable: false,
                    reason: 'Dynamic color role creation'
                });
            } catch (err) {
                return interaction.reply({
                    content: '❌ هذا اللون غير متاح ولم يتمكن البوت من إنشائه تلقائياً. تأكد من أن البوت لديه صلاحية إدارة الرتب.',
                    flags: MessageFlags.Ephemeral
                });
            }
        }

        // إزالة جميع الألوان السابقة للأعضاء
        const colorRoles = interaction.member.roles.cache.filter(r => r.name.startsWith('🎨'));
        if (colorRoles.size > 0) {
            await interaction.member.roles.remove(colorRoles);
        }

        // إضافة اللون الجديد
        await interaction.member.roles.add(role);

        const embed = new EmbedBuilder()
            .setColor(color.hex)
            .setTitle(`${color.emoji} تم تغيير اللون!`)
            .setDescription(`لونك الآن: **${color.name}**`)
            .setFooter({ text: 'يمكنك تغيير اللون في أي وقت!' })
            .setTimestamp();

        await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });

    } catch (error) {
        console.error('خطأ في إسناد اللون:', error);
        await interaction.reply({
            content: '❌ حدث خطأ! تأكد من أن رتبة البوت فوق رتب الألوان في قائمة الرتب ولديه صلاحية إدارة الرتب.',
            flags: MessageFlags.Ephemeral
        });
    }
}

// دالة لإنشاء جميع الرتب تلقائياً أثناء التفعيل الكامل
async function createGuildColorRoles(guild) {
    let created = 0;
    for (const [id, color] of Object.entries(COLORS)) {
        const roleName = `🎨 ${color.name}`;
        let role = guild.roles.cache.find(r => r.name === roleName);
        if (!role) {
            await guild.roles.create({
                name: roleName,
                color: color.hex,
                permissions: [],
                mentionable: false,
                reason: 'Color role system setup'
            }).catch(() => {});
            created++;
        }
    }
    return created;
}

// أمر إزالة اللون
async function removeColor(message) {
    const colorRoles = message.member.roles.cache.filter(r => r.name.startsWith('🎨'));

    if (colorRoles.size === 0) {
        return message.reply('❌ ليس لديك لون حالياً!');
    }

    try {
        await message.member.roles.remove(colorRoles);
        message.reply('✅ تم إزالة اللون من حسابك!');
    } catch (error) {
        message.reply('❌ حدث خطأ في إزالة اللون!');
    }
}

module.exports = {
    // ─── واجهة الأمر المطلوبة من commandHandler ──────────────────
    name: 'color-roles',
    aliases: ['الوان', 'ألوان', 'لوني', 'تفعيل-الوان'],
    description: 'نظام ألوان الأعضاء — 20 لون للاختيار',
    usage: 'الوان | تفعيل-الوان (للإدمن)',

    async execute(message, args) {
        const sub = args[0]?.toLowerCase();
        if (sub === 'setup' || sub === 'تفعيل') return setupColors(message);
        if (sub === 'remove' || sub === 'ازالة') return removeColor(message);
        return showColors(message);
    },

    // ─── export الدوال للاستخدام المباشر ────────────────────────
    setupColors,
    showColors,
    handleColorButton,
    assignColorRole,
    createGuildColorRoles,
    removeColor,
    COLORS,
};
