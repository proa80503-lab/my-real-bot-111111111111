const { PremiumEmbedBuilder } = require('../../utils/embed-builder');

const friendships = new Map(); // Note: In a real bot, use DB.

module.exports = {
    name: 'friends',
    aliases: ['اصدقاء', 'صديق', 'ضيف_صديق'],
    description: 'نظام الأصدقاء الأساسي',
    usage: 'friends [add @user | list]',

    async execute(message, args) {
        if (!args[0] || args[0] === 'list' || message.content.includes('قائمة')) {
            return await listFriends(message);
        }
        if (args[0] === 'add' || message.mentions.users.size > 0) {
            return await addFriend(message);
        }
    }
};

async function addFriend(message) {
    const friend = message.mentions.users.first();
    if (!friend) return message.reply('❌ منشن الشخص!');
    if (friend.id === message.author.id) return message.reply('❌ لا يمكنك إضافة نفسك!');

    const key = [message.author.id, friend.id].sort().join('-');
    if (friendships.has(key)) return message.reply('✅ أنتما أصدقاء بالفعل!');

    friendships.set(key, { since: Date.now() });
    return message.reply(`✅ تم إضافة ${friend} إلى قائمة أصدقائك!`);
}

async function listFriends(message) {
    const userFriends = [];
    for (const [key, data] of friendships.entries()) {
        const ids = key.split('-');
        if (ids.includes(message.author.id)) {
            const fId = ids.find(id => id !== message.author.id);
            userFriends.push(`<@${fId}>`);
        }
    }
    if (userFriends.length === 0) return message.reply('❌ ليس لديك أصدقاء بعد!');
    const embed = PremiumEmbedBuilder.info('👥 قائمة أصدقائك', userFriends.join('\n'));
    return message.reply({ embeds: [embed] });
}
