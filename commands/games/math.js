'use strict';

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║  🧮 MATH v3.0 — مسألة رياضية بخيارات متعددة (أزرار)                   ║
 * ║  مستويات صعوبة | خيارات مشتتة | جوائز متدرجة                          ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, MessageFlags } = require('discord.js');
const db = require('../../utils/database');
const config = require('../../config');

function generateQuestion(difficulty = 'medium') {
    let n1, n2, op, answer, reward;

    if (difficulty === 'easy') {
        n1 = Math.floor(Math.random() * 20) + 1;
        n2 = Math.floor(Math.random() * 20) + 1;
        op = ['+', '-'][Math.floor(Math.random() * 2)];
        reward = 100;
    } else if (difficulty === 'hard') {
        n1 = Math.floor(Math.random() * 20) + 5;
        n2 = Math.floor(Math.random() * 20) + 5;
        const n3 = Math.floor(Math.random() * 10) + 2;
        op = ['*', '/'][Math.floor(Math.random() * 2)];
        // تجنب القسمة الغير صحيحة
        if (op === '/') {
            n1 = n2 * n3;
            answer = n3;
        } else {
            answer = n1 * n2;
        }
        reward = 500;
        return {
            question: op === '/' ? `${n1} ÷ ${n2}` : `${n1} × ${n2}`,
            answer: answer.toString(),
            reward
        };
    } else { // medium
        n1 = Math.floor(Math.random() * 50) + 10;
        n2 = Math.floor(Math.random() * 50) + 10;
        op = ['+', '-', '*'][Math.floor(Math.random() * 3)];
        reward = 250;
    }

    answer = op === '+' ? n1 + n2 : op === '-' ? n1 - n2 : n1 * n2;
    const opSymbol = op === '*' ? '×' : op === '/' ? '÷' : op;

    return { question: `${n1} ${opSymbol} ${n2}`, answer: answer.toString(), reward };
}

function generateChoices(correct) {
    const correctNum = parseInt(correct);
    const choices = new Set([correctNum]);

    while (choices.size < 4) {
        const offset = Math.floor(Math.random() * 20) - 10;
        const wrong = correctNum + offset;
        if (wrong !== correctNum) choices.add(wrong);
    }

    return [...choices].sort(() => Math.random() - 0.5).map(String);
}

module.exports = {
    name: 'math',
    aliases: ['رياضيات', 'حساب', 'مسألة'],
    description: 'حل مسألة رياضية بخيارات متعددة',
    usage: 'رياضيات [سهل|متوسط|صعب]',

    async execute(message, args) {
        const diffMap = { 'سهل': 'easy', 'متوسط': 'medium', 'صعب': 'hard' };
        const difficulty = diffMap[args[0]] || args[0] || 'medium';
        const validDiff = ['easy', 'medium', 'hard'].includes(difficulty) ? difficulty : 'medium';

        const { question, answer, reward } = generateQuestion(validDiff);
        const choices = generateChoices(answer);

        const diffLabel = { easy: '🟢 سهل', medium: '🟡 متوسط', hard: '🔴 صعب' }[validDiff];

        const embed = new EmbedBuilder()
            .setColor('#9B59B6')
            .setTitle('🧮 مسألة رياضية')
            .setDescription(`> ${message.author} — ما ناتج:\n\n# ${question} = ?\n\n> اختر الإجابة الصحيحة!`)
            .addFields(
                { name: '🏆 الجائزة', value: `**${reward} ${config.currency}**`, inline: true },
                { name: '📊 الصعوبة', value: diffLabel, inline: true },
                { name: '⏰ الوقت', value: '**20 ثانية**', inline: true },
            )
            .setFooter({ text: 'الأزرار ستنتهي بعد 20 ثانية' });

        const gameId = `${message.author.id}_${Date.now()}`;
        const row = new ActionRowBuilder().addComponents(
            choices.map((choice, i) =>
                new ButtonBuilder()
                    .setCustomId(`math_answer_${gameId}_${choice === answer ? 'correct' : 'wrong'}_${choice}`)
                    .setLabel(choice)
                    .setStyle(ButtonStyle.Secondary)
            )
        );

        const msg = await message.reply({ embeds: [embed], components: [row] });

        // انتهاء الوقت
        setTimeout(async () => {
            const timeoutEmbed = new EmbedBuilder()
                .setColor('#ED4245')
                .setTitle('⏰ انتهى الوقت!')
                .setDescription(`> ${message.author} لم يجب في الوقت المحدد!\n\n> ✅ **الإجابة الصحيحة كانت:** \`${answer}\``);

            // تلوين الأزرار
            const revealRow = new ActionRowBuilder().addComponents(
                choices.map(choice =>
                    new ButtonBuilder()
                        .setCustomId(`math_expired_${choice}`)
                        .setLabel(choice)
                        .setStyle(choice === answer ? ButtonStyle.Success : ButtonStyle.Danger)
                        .setDisabled(true)
                )
            );

            await msg.edit({ embeds: [timeoutEmbed], components: [revealRow] }).catch(() => {});
        }, 20000);
    },

    async handleMathInteraction(interaction) {
        if (!interaction.customId.startsWith('math_answer_')) return;

        const parts = interaction.customId.split('_');
        const userId = parts[2];
        const isCorrect = parts[4] === 'correct';
        const chosenValue = parts[5];

        if (interaction.user.id !== userId) {
            return interaction.reply({ content: '❌ هذه اللعبة ليست لك!', flags: MessageFlags.Ephemeral });
        }

        // استخراج معلومات الأزرار لتلوينها
        const embed = EmbedBuilder.from(interaction.message.embeds[0]);
        const rewardText = embed.data.fields?.find(f => f.name.includes('الجائزة'))?.value || '250';
        const reward = parseInt(rewardText.replace(/\D/g, '')) || 250;

        // إيجاد الإجابة الصحيحة من الأزرار
        const correctBtn = interaction.message.components[0].components.find(btn =>
            btn.customId.includes('_correct_')
        );
        const correctValue = correctBtn?.customId?.split('_').pop() || '';

        // بناء صف الأزرار مع التلوين
        const revealRow = new ActionRowBuilder().addComponents(
            interaction.message.components[0].components.map(btn => {
                const btnValue = btn.customId.split('_').pop();
                const isCorrectBtn = btn.customId.includes('_correct_');
                return new ButtonBuilder()
                    .setCustomId(`math_done_${btnValue}`)
                    .setLabel(btnValue)
                    .setStyle(isCorrectBtn ? ButtonStyle.Success : ButtonStyle.Danger)
                    .setDisabled(true);
            })
        );

        if (isCorrect) {
            db.addMoney(interaction.user.id, reward);
            db.addTransaction(interaction.user.id, 'math_win', reward, 'Math Challenge Win');

            embed
                .setColor('#57F287')
                .setTitle('✅ إجابة صحيحة!')
                .setDescription(`> 🎉 ${interaction.user} **أجاب بشكل صحيح!**\n\n> ✅ الإجابة: \`${correctValue}\`\n> 💰 جائزة: **+${reward} ${config.currency}**`);
        } else {
            embed
                .setColor('#ED4245')
                .setTitle('❌ إجابة خاطئة!')
                .setDescription(`> 😔 ${interaction.user} **اختار خطأ!**\n\n> ❌ اخترت: \`${chosenValue}\`\n> ✅ الصحيح: \`${correctValue}\``);
        }

        await interaction.update({ embeds: [embed], components: [revealRow] });
    }
};
