const db = require('./database');
const { PremiumEmbedBuilder } = require('./embed-builder');
const config = require('../config');

// تحسينات نظام المستويات

// Prestige System - إعادة تعيين للحصول على مكافآت
function checkPrestige(userId) {
    const userData = db.getUserData(userId);

    if (userData.level >= 100) {
        return {
            canPrestige: true,
            rewards: {
                prestigeLevel: (userData.prestigeLevel || 0) + 1,
                bonus: 10000 * ((userData.prestigeLevel || 0) + 1),
                multiplier: 1 + ((userData.prestigeLevel || 0) + 1) * 0.1
            }
        };
    }

    return { canPrestige: false };
}

async function prestige(message) {
    const userData = db.getUserData(message.author.id);
    const prestigeCheck = checkPrestige(message.author.id);

    if (!prestigeCheck.canPrestige) {
        return message.reply('❌ تحتاج مستوى 100 للترقية!');
    }

    // حفظ البيانات المهمة
    const prestigeLevel = (userData.prestigeLevel || 0) + 1;
    const totalXP = userData.totalXP || 0;

    // إعادة تعيين
    userData.level = 1;
    userData.xp = 0;
    userData.prestigeLevel = prestigeLevel;
    userData.totalXP = totalXP;
    userData.balance += prestigeCheck.rewards.bonus;

    db.updateUserData(message.author.id, userData);

    const embed = PremiumEmbedBuilder.success(
        `⭐ Prestige ${prestigeLevel}!`,
        `أصبحت أسطورة!`,
        [
            { name: 'مكافأة', value: `${prestigeCheck.rewards.bonus} ${config.currency}` },
            { name: 'مضاعف XP', value: `x${prestigeCheck.rewards.multiplier}` },
            { name: 'شارة', value: `${'⭐'.repeat(prestigeLevel)}` }
        ]
    );

    return message.reply({ embeds: [embed] });
}

// Skill Trees - شجرة مهارات
const skillTrees = {
    economy: {
        name: 'خبير الاقتصاد',
        skills: {
            1: { name: 'عامل ماهر', effect: 'workBonus', value: 0.2 },
            2: { name: 'مستثمر', effect: 'investBonus', value: 0.15 },
            3: { name: 'تاجر', effect: 'shopDiscount', value: 0.1 }
        }
    },
    gaming: {
        name: 'محترف الألعاب',
        skills: {
            1: { name: 'محظوظ', effect: 'luckBonus', value: 0.1 },
            2: { name: 'استراتيجي', effect: 'gameBonus', value: 0.15 },
            3: { name: 'بطل', effect: 'winMultiplier', value: 1.2 }
        }
    },
    social: {
        name: 'اجتماعي',
        skills: {
            1: { name: 'ودود', effect: 'xpFromChat', value: 0.2 },
            2: { name: 'قائد', effect: 'guildBonus', value: 0.15 },
            3: { name: 'مشهور', effect: 'popularityBonus', value: 0.25 }
        }
    }
};

async function skillTree(message, args) {
    const userData = db.getUserData(message.author.id);

    if (!args[0]) {
        const embed = PremiumEmbedBuilder.info(
            '🌳 شجرة المهارات',
            'اختر تخصصك!',
            [
                { name: '💰 Economy', value: 'مكافآت عمل واستثمار' },
                { name: '🎮 Gaming', value: 'مكافآت ألعاب وحظ' },
                { name: '👥 Social', value: 'مكافآت تفاعل اجتماعي' }
            ]
        );

        return message.reply({ embeds: [embed] });
    }

    const treeType = args[0].toLowerCase();
    const skillLevel = parseInt(args[1]) || 1;

    if (!skillTrees[treeType]) {
        return message.reply('❌ تخصص غير موجود!');
    }

    if (!userData.skills) userData.skills = {};
    if (!userData.skills[treeType]) userData.skills[treeType] = 0;

    const cost = skillLevel * 1000;

    if (userData.balance < cost) {
        return message.reply(`❌ تحتاج ${cost} ${config.currency}!`);
    }

    userData.balance -= cost;
    userData.skills[treeType] = skillLevel;
    db.updateUserData(message.author.id, userData);

    const skill = skillTrees[treeType].skills[skillLevel];

    return message.reply(`✅ تعلمت مهارة **${skill.name}**!`);
}

// Badges & Titles - شارات وألقاب
const badges = {
    rich: { name: '💎 غني', requirement: 'balance', value: 100000 },
    gambler: { name: '🎰 مقامر', requirement: 'gamesPlayed', value: 500 },
    veteran: { name: '⭐ محارب قديم', requirement: 'level', value: 50 },
    social: { name: '👥 اجتماعي', requirement: 'messages', value: 10000 },
    lucky: { name: '🍀 محظوظ', requirement: 'wins', value: 100 }
};

function checkBadges(userId) {
    const userData = db.getUserData(userId);
    const earned = [];

    for (const [key, badge] of Object.entries(badges)) {
        const userValue = userData[badge.requirement] || 0;
        if (userValue >= badge.value) {
            earned.push(badge.name);
        }
    }

    return earned;
}

async function myBadges(message) {
    const badges = checkBadges(message.author.id);

    if (badges.length === 0) {
        return message.reply('❌ ليس لديك شارات بعد!');
    }

    const embed = PremiumEmbedBuilder.custom({
        color: '#FFD700',
        title: '🏆 شاراتك',
        description: badges.join(' ')
    });

    return message.reply({ embeds: [embed] });
}

module.exports = {
    prestige,
    checkPrestige,
    skillTree,
    skillTrees,
    checkBadges,
    myBadges
};
