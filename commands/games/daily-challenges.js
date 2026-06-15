const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require('../../utils/database');
const config = require('../../config');
const { PremiumEmbedBuilder, ICONS, createProgressBar } = require('../../utils/embed-builder');

// نظام المهام اليومية
class DailyChallengeSystem {
    constructor() {
        this.challengeTypes = [
            // مهام اقتصادية
            { id: 'earn_money', type: 'economy', target: 5000, reward: 2000, title: 'جامع الثروة', desc: 'اجمع {target} عملة', emoji: '💰' },
            { id: 'invest', type: 'economy', target: 10000, reward: 3000, title: 'المستثمر', desc: 'استثمر {target} عملة', emoji: '📈' },
            { id: 'work_times', type: 'economy', target: 5, reward: 1500, title: 'العامل الن ون (3 خطوط اه ...', desc: 'اعمل {target} مرات', emoji: '⚒️' },

            // مهام الألعاب
            { id: 'play_games', type: 'games', target: 10, reward: 2500, title: 'اللاعب', desc: 'العب {target} ألعاب', emoji: '🎮' },
            { id: 'win_games', type: 'games', target: 5, reward: 3500, title: 'المنتصر', desc: 'اربح {target} ألعاب', emoji: '🏆' },
            { id: 'trivia_correct', type: 'games', target: 3, reward: 2000, title: 'العبقري', desc: 'أجب صحيحاً على {target} أسئلة', emoji: '🧠' },

            // مهام اجتماعيةconst message = { reply: (msg) => interaction.update(msg), client: interaction.client, author: interaction.user, guild: interaction.guild };
            { id: 'send_messages', type: 'social', target: 50, reward: 1000, title: 'الثرثار', desc: 'أرسل {target} رسالة', emoji: '💬' },
            { id: 'help_others', type: 'social', target: 3, reward: 2500, title: 'المساعد', desc: 'ساعد {target} أشخاص', emoji: '🤝' },
            { id: 'voice_time', type: 'social', target: 60, reward: 2000, title: 'المتحدث', desc: 'ابقَ في الفويس {target} دقيقة', emoji: '🎙️' },

            // مهام متقدمة
            { id: 'daily_streak', type: 'special', target: 7, reward: 5000, title: 'الملتزم', desc: 'حافظ على Streak لمدة {target} أيام', emoji: '🔥' },
            { id: 'level_up', type: 'special', target: 1, reward: 3000, title: 'المتطور', desc: 'ارتقِ بمستوى واحد', emoji: '⬆️' },
            { id: 'buy_items', type: 'special', target: 3, reward: 2000, title: 'المتسوق', desc: 'اشترِ {target} عناصر', emoji: '🛒' }
        ];
    }

    // توليد مهام يومية عشوائية للمستخدم
    generateDailyChallenges(userId) {
        const userData = db.getUserData(userId);
        const today = new Date().toDateString();

        // تحقق إذا كانت المهام محدّثة اليوم
        if (userData.dailyChallenges && userData.dailyChallenges.date === today) {
            return userData.dailyChallenges;
        }

        // اختيار 3 مهام عشوائية
        const shuffled = [...this.challengeTypes].sort(() => Math.random() - 0.5);
        const selected = shuffled.slice(0, 3);

        const challenges = {
            date: today,
            resetTime: new Date().setHours(24, 0, 0, 0),
            challenges: selected.map(challenge => ({
                ...challenge,
                progress: 0,
                completed: false,
                claimed: false
            }))
        };

        userData.dailyChallenges = challenges;
        db.updateUserData(userId, userData);

        return challenges;
    }

    // تحديث تقدم مهمة
    updateProgress(userId, challengeId, increment = 1) {
        const userData = db.getUserData(userId);
        if (!userData.dailyChallenges) return;

        const challenge = userData.dailyChallenges.challenges.find(c => c.id === challengeId);
        if (!challenge || challenge.completed) return;

        challenge.progress = Math.min(challenge.progress + increment, challenge.target);

        if (challenge.progress >= challenge.target) {
            challenge.completed = true;
        }

        db.updateUserData(userId, userData);
        return challenge;
    }

    // المطالبة بالمكافأة
    claimReward(userId, challengeIndex) {
        const userData = db.getUserData(userId);
        if (!userData.dailyChallenges) return { success: false, error: 'لا توجد مهام!' };

        const challenge = userData.dailyChallenges.challenges[challengeIndex];
        if (!challenge) return { success: false, error: 'مهمة غير موجودة!' };
        if (!challenge.completed) return { success: false, error: 'المهمة غير مكتملة!' };
        if (challenge.claimed) return { success: false, error: 'تم المطالبة بالمكافأة بالفعل!' };

        challenge.claimed = true;
        db.addMoney(userId, challenge.reward);
        db.updateUserData(userId, userData);

        // إضافة XP مكافأة
        const levels = require('../../utils/levels');
        levels.addXP(userId, Math.floor(challenge.reward / 10));

        return {
            success: true,
            reward: challenge.reward,
            challenge
        };
    }

    // عرض المهام اليومية
    getChallengesEmbed(userId, username) {
        const challenges = this.generateDailyChallenges(userId);

        const embed = PremiumEmbedBuilder.custom({
            color: '#F39C12',
            title: `${ICONS.FIRE} المهام اليومية`,
            description: `**${username}** - إكمل المهام واحصل على مكافآت رائعة!`
        });

        challenges.challenges.forEach((challenge, index) => {
            const progress = Math.min(challenge.progress, challenge.target);
            const progressPercent = (progress / challenge.target) * 100;
            const progressBar = createProgressBar(progressPercent, 10);

            const status = challenge.claimed ? '✅ تم المطالبة' :
                challenge.completed ? '🎁 جاهزة!' :
                    `${progress}/${challenge.target}`;

            embed.addFields({
                name: `${challenge.emoji} ${index + 1}. ${challenge.title}`,
                value:
                    `${challenge.desc.replace('{target}', challenge.target)}\n` +
                    `${progressBar} ${status}\n` +
                    `💰 المكافأة: **${challenge.reward.toLocaleString()}** ${config.currency}`,
                inline: false
            });
        });

        // وقت التحديث
        const now = Date.now();
        const resetTime = challenges.resetTime;
        const timeLeft = resetTime - now;
        const hoursLeft = Math.floor(timeLeft / (1000 * 60 * 60));
        const minutesLeft = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));

        embed.setFooter({
            text: `التحديث بعد: ${hoursLeft}س ${minutesLeft}د | تحديث تلقائي كل 24 ساعة`
        });

        return embed;
    }

    // أزرار المطالبة بالمكافآت
    getClaimButtons(challenges) {
        const rows = [];
        const buttons = [];

        challenges.challenges.forEach((challenge, index) => {
            if (challenge.completed && !challenge.claimed) {
                buttons.push(
                    new ButtonBuilder()
                        .setCustomId(`claim_challenge_${index}`)
                        .setLabel(`مطالبة ${index + 1}`)
                        .setEmoji('🎁')
                        .setStyle(ButtonStyle.Success)
                );
            }
        });

        if (buttons.length > 0) {
            const row = new ActionRowBuilder().addComponents(buttons);
            rows.push(row);
        }

        // زر التحديث
        rows.push(
            new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('refresh_challenges')
                        .setLabel('تحديث')
                        .setEmoji('🔄')
                        .setStyle(ButtonStyle.Primary)
                )
        );

        return rows;
    }
}

// Singleton
const dailyChallengeSystem = new DailyChallengeSystem();

// أمر المهام اليومية
async function dailyChallengesCommand(message) {
    const embed = dailyChallengeSystem.getChallengesEmbed(message.author.id, message.author.username);
    const userData = db.getUserData(message.author.id);
    const buttons = dailyChallengeSystem.getClaimButtons(userData.dailyChallenges || { challenges: [] });

    await message.reply({ embeds: [embed], components: buttons });
}

// معالج الأزرار
async function handleChallengeButton(interaction) {
    const customId = interaction.customId;

    if (customId === 'refresh_challenges') {
        const embed = dailyChallengeSystem.getChallengesEmbed(interaction.user.id, interaction.user.username);
        const userData = db.getUserData(interaction.user.id);
        const buttons = dailyChallengeSystem.getClaimButtons(userData.dailyChallenges || { challenges: [] });

        return await interaction.update({ embeds: [embed], components: buttons });
    }

    if (customId.startsWith('claim_challenge_')) {
        const index = parseInt(customId.split('_')[2]);
        const result = dailyChallengeSystem.claimReward(interaction.user.id, index);

        if (!result.success) {
            return await interaction.reply({ content: `❌ ${result.error}`, flags: (require('discord.js').MessageFlags).Ephemeral });
        }

        const successEmbed = PremiumEmbedBuilder.success(
            '🎉 مكافأة مُستلمة!',
            `أكملت مهمة **${result.challenge.title}**!\nحصلت على: **${result.reward.toLocaleString()}** ${config.currency}`
        );

        await interaction.reply({ embeds: [successEmbed], flags: (require('discord.js').MessageFlags).Ephemeral });

        // تحديث الرسالة الأصلية
        const embed = dailyChallengeSystem.getChallengesEmbed(interaction.user.id, interaction.user.username);
        const userData = db.getUserData(interaction.user.id);
        const buttons = dailyChallengeSystem.getClaimButtons(userData.dailyChallenges || { challenges: [] });

        await interaction.message.edit({ embeds: [embed], components: buttons });
    }
}

module.exports = {
    // ─── واجهة الأمر المطلوبة من commandHandler ──────────────────
    name: 'daily-challenges',
    aliases: ['تحديات', 'مهام-يومية'],
    description: 'عرض المهام اليومية والمطالبة بمكافآتها',
    usage: 'daily-challenges',

    async execute(message, args) {
        await dailyChallengesCommand(message);
    },

    // ─── export الدوال للاستخدام من ملفات أخرى ──────────────────
    dailyChallengesCommand,
    handleChallengeButton,
    dailyChallengeSystem,
};
