const { EmbedBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');

module.exports = {
    name: 'move',
    aliases: ['pull', 'اسحب', 'نقل', 'mv', 'bring'],
    description: 'نقل الأعضاء إلى الروم الصوتي الخاص بك (استخدم: !اسحب)',
    usage: '!mph move <all/half/@user>',

    async execute(message, args) {
        // 1. Check Permissions
        if (!message.member.permissions.has(PermissionFlagsBits.MoveMembers)) {
            return message.reply({
                content: '❌ **ليس لديك صلاحية نقل الأعضاء (Move Members)!**',
                ephemeral: true
            });
        }

        // 2. Check if user is in a voice channel (Robust Detection)
        let targetChannel = message.member.voice?.channel;

        if (!targetChannel) {
            try {
                const member = await message.guild.members.fetch({ user: message.author.id, force: true });
                targetChannel = member.voice?.channel;
            } catch (e) {
                console.error("Failed to fetch fresh member state:", e);
            }
        }

        if (!targetChannel) {
            return message.reply('❌ **يجب أن تكون في روم صوتي أولاً! (تأكد من تفعيل الـ Intents وإعادة تشغيل البوت)**');
        }

        const type = args[0]?.toLowerCase();

        // Helper to delay moving (avoid rate limits)
        const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

        // --- OPTION 1: MOVE SPECIFIC USER ---
        const targetMember = message.mentions.members.first();
        if (targetMember) {
            if (!targetMember.voice.channel) {
                return message.reply('❌ **هذا العضو ليس في روم صوتي!**');
            }
            if (targetMember.voice.channelId === targetChannel.id) {
                return message.reply('❌ **هذا العضو موجود معك بالفعل!**');
            }

            try {
                await targetMember.voice.setChannel(targetChannel);
                return message.reply(`✅ **تم سحب ${targetMember} إلى ${targetChannel}!**`);
            } catch (error) {
                console.error(error);
                return message.reply('❌ **حدث خطأ أثناء محاولة سحب العضو. تأكد من صلاحياتي!**');
            }
        }

        // --- OPTION 2: MOVE ALL (سحب كامل) ---
        if (type === 'all' || type === 'كامل' || type === 'الكل') {
            // Fetch all channels to ensure cache is populated
            await message.guild.channels.fetch();

            // Find all members in ANY voice channel (except the target channel)
            let moveableMembers = [];
            message.guild.channels.cache.filter(c => c.type === ChannelType.GuildVoice && c.id !== targetChannel.id).forEach(channel => {
                channel.members.forEach(member => {
                    if (!member.user.bot) moveableMembers.push(member); // Exclude bots
                });
            });

            if (moveableMembers.length === 0) {
                return message.reply('❌ **لا يوجد أعضاء في رومات صوتية أخرى لسحبهم!**');
            }

            const msg = await message.reply(`🔄 **جاري سحب ${moveableMembers.length} عضو إلى ${targetChannel}...**`);

            let count = 0;
            for (const member of moveableMembers) {
                try {
                    await member.voice.setChannel(targetChannel);
                    count++;
                    await sleep(500); // 0.5s delay to be safe
                } catch (err) {
                    console.error(`Failed to move ${member.user.tag}:`, err);
                }
            }

            return msg.edit(`✅ **تم سحب كامـل الأعضاء بنجاح! (${count}/${moveableMembers.length})**`);
        }

        // --- OPTION 3: MOVE HALF (سحب نصف) ---
        if (type === 'half' || type === 'نصف' || type === 'النصف') {
            // Fetch all channels
            await message.guild.channels.fetch();

            // Find all members in ANY voice channel
            let moveableMembers = [];
            message.guild.channels.cache.filter(c => c.type === ChannelType.GuildVoice && c.id !== targetChannel.id).forEach(channel => {
                channel.members.forEach(member => {
                    if (!member.user.bot) moveableMembers.push(member);
                });
            });

            if (moveableMembers.length === 0) {
                return message.reply('❌ **لا يوجد أعضاء لسحبهم!**');
            }

            // Shuffle array
            moveableMembers = moveableMembers.sort(() => Math.random() - 0.5);

            // Take half
            const halfCount = Math.ceil(moveableMembers.length / 2);
            const selectedMembers = moveableMembers.slice(0, halfCount);

            const msg = await message.reply(`🔄 **جاري سحب نصف الأعضاء (${selectedMembers.length}) إلى ${targetChannel}...**`);

            let count = 0;
            for (const member of selectedMembers) {
                try {
                    await member.voice.setChannel(targetChannel);
                    count++;
                    await sleep(500);
                } catch (err) {
                    console.error(`Failed to move ${member.user.tag}:`, err);
                }
            }

            return msg.edit(`✅ **تم سحب نصف الأعضاء بنجاح! (${count}/${selectedMembers.length})**`);
        }

        // --- DEFAULT: HELP MSG ---
        const embed = new EmbedBuilder()
            .setColor('#3498db')
            .setTitle('🎮 أوامر السحب والنقل')
            .setDescription('استخدم الأوامر التالية لنقل الأعضاء:')
            .addFields(
                { name: 'سحب عضو محدد', value: `\`!سحب @user\``, inline: false },
                { name: 'سحب كامل (الكل)', value: `\`!سحب كامل\``, inline: false },
                { name: 'سحب نصف (عشوائي)', value: `\`!سحب نصف\``, inline: false }
            )
            .setFooter({ text: 'Bot provided by Antigravity' });

        message.reply({ embeds: [embed] });
    }
};
