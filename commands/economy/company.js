const {
    ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags,
    ModalBuilder, TextInputBuilder, TextInputStyle,
    ChannelType, PermissionFlagsBits, EmbedBuilder
} = require('discord.js');
const db = require('../../utils/database');
const config = require('../../config');
const { PremiumEmbedBuilder } = require('../../utils/embed-builder');

module.exports = {
    name: 'company',
    aliases: ['شركة', 'شركه', 'بيزنس', 'business'],
    description: 'نظام إدارة الشركات التفاعلي',
    usage: 'شركة',

    // ═══════════════════════════════════════════════════════
    // الأمر الرئيسي
    // ═══════════════════════════════════════════════════════
    async execute(context, args) {
        try {
            const isInteraction = context.isCommand?.() || context.isButton?.();
            const author = isInteraction ? context.user : context.author;
            const userData = db.getUserData(author.id);

            if (args && args.length > 0) {
                const action = args[0].toLowerCase();
                if (action === 'create' || action === 'إنشاء')
                    return await this.handleCreate(context, author, args.slice(1).join(' '));
                if (action === 'hire' || action === 'توظيف')
                    return await this.handleHire(context, author, context.mentions?.users?.first(), parseInt(args[2]));
            }
            return await this.sendDashboard(context, author, userData);
        } catch (err) {
            console.error('[Company execute]:', err);
            try {
                const isInteraction = context.isCommand?.() || context.isButton?.();
                const msg = '❌ حدث خطأ في نظام الشركات.';
                if (isInteraction) {
                    if (!context.replied && !context.deferred) await context.reply({ content: msg, flags: [MessageFlags.Ephemeral] });
                } else {
                    await context.reply(msg);
                }
            } catch (e) { console.error(e); }
        }
    },

    // ═══════════════════════════════════════════════════════
    // لوحة التحكم الرئيسية
    // ═══════════════════════════════════════════════════════
    async sendDashboard(context, user, userData) {
        const comp = userData.company;
        let embed, rows = [];

        if (!comp) {
            embed = new EmbedBuilder()
                .setColor('#2B2D31')
                .setTitle('🏢 نظام الشركات')
                .setDescription([
                    '> **مرحباً بك في نظام الشركات!**',
                    '',
                    '📊 لا تملك شركة حالياً.',
                    '💰 تكلفة التأسيس: **20,000** 💰',
                    '',
                    '🏗️ اضغط الزر بالأسفل لتأسيس شركتك!'
                ].join('\n'))
                .setTimestamp();
            rows = [new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('comp_create_modal').setLabel('🏗️ تأسيس شركة الآن').setStyle(ButtonStyle.Success)
            )];
        } else {
            const empCount = comp.employees?.length || 0;
            const pendingCount = comp.pendingApps?.length || 0;
            const profit = comp.profit || 0;
            const dailyRev = empCount * 500;

            embed = new EmbedBuilder()
                .setColor('#FFD700')
                .setTitle(`🏢 ${comp.name}`)
                .setDescription(`> **لوحة إدارة الشركة** | <t:${Math.floor((comp.createdAt || Date.now()) / 1000)}:R>`)
                .addFields(
                    { name: '👤 المالك', value: user.username, inline: true },
                    { name: '👥 الموظفون', value: `${empCount} موظف`, inline: true },
                    { name: '📈 إيراد/يوم', value: `+${dailyRev.toLocaleString()} 💰`, inline: true },
                    { name: '💎 أرباح جاهزة', value: `${profit.toLocaleString()} 💰`, inline: true },
                    { name: '⏳ طلبات معلقة', value: `${pendingCount}`, inline: true },
                    { name: '💼 التوظيف', value: comp.hiringOpen ? '✅ مفتوح' : '🔒 مغلق', inline: true }
                )
                .setTimestamp();

            if (empCount > 0) {
                const list = comp.employees.slice(0, 8)
                    .map((e, i) => `${i + 1}. <@${e.id}> — **${e.rank || 'موظف'}** — ${(e.salary || 0).toLocaleString()} 💰`)
                    .join('\n');
                embed.addFields({ name: '👔 الموظفون', value: list + (empCount > 8 ? `\n... و${empCount - 8} آخرون` : '') });
            }

            if (pendingCount > 0) {
                const pendList = (comp.pendingApps || []).slice(0, 5)
                    .map(a => `• <@${a.userId}>`)
                    .join('\n');
                embed.addFields({ name: '📋 طلبات التوظيف المعلقة', value: pendList });
            }

            rows = [
                new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('comp_hire_show').setLabel('➕ توظيف').setStyle(ButtonStyle.Primary),
                    new ButtonBuilder().setCustomId('comp_fire_show').setLabel('➖ فصل').setStyle(ButtonStyle.Danger),
                    new ButtonBuilder().setCustomId('comp_collect_profits')
                        .setLabel(`💰 جمع الأرباح (${profit.toLocaleString()})`)
                        .setStyle(ButtonStyle.Success).setDisabled(profit <= 0),
                    new ButtonBuilder().setCustomId('comp_rename_modal').setLabel('✏️ إعادة التسمية').setStyle(ButtonStyle.Secondary)
                ),
                new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('comp_toggle_hiring')
                        .setLabel(comp.hiringOpen ? '🔒 إغلاق التوظيف' : '✅ فتح التوظيف')
                        .setStyle(comp.hiringOpen ? ButtonStyle.Danger : ButtonStyle.Success),
                    new ButtonBuilder().setCustomId('comp_update_channel').setLabel('🔄 تحديث قناة الشركات').setStyle(ButtonStyle.Secondary)
                )
            ];
        }

        const msgData = { embeds: [embed], components: rows };
        try {
            if (context.isButton?.() || context.isCommand?.()) {
                if (context.deferred || context.replied) await context.editReply(msgData);
                else await context.reply(msgData);
            } else {
                await context.reply(msgData);
            }
        } catch (e) {
            console.error('[Dashboard send]:', e);
            await context.channel?.send(msgData).catch(() => { });
        }
    },

    // ═══════════════════════════════════════════════════════
    // معالجة أزرار الشركة (buttons)
    // ═══════════════════════════════════════════════════════
    async handleCompanyInteraction(interaction) {
        try {
            const authorId = interaction.user.id;
            const action = interaction.customId;

            // ── فتح Modal تأسيس شركة ──
            if (action === 'comp_create_modal') {
                const modal = new ModalBuilder().setCustomId('comp_create_submit').setTitle('🏢 تأسيس شركة جديدة');
                modal.addComponents(new ActionRowBuilder().addComponents(
                    new TextInputBuilder().setCustomId('comp_name_input').setLabel('اسم الشركة').setPlaceholder('مثلاً: شركة التقنية العربية').setStyle(TextInputStyle.Short).setMinLength(3).setMaxLength(30).setRequired(true)
                ));
                return await interaction.showModal(modal);
            }

            // ── فتح Modal توظيف ──
            if (action === 'comp_hire_show') {
                const ud = db.getUserData(authorId);
                if (!ud.company) return interaction.reply({ content: '❌ لا تملك شركة!', flags: [MessageFlags.Ephemeral] });
                const modal = new ModalBuilder().setCustomId('comp_hire_submit').setTitle('👤 توظيف موظف جديد');
                modal.addComponents(
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder().setCustomId('comp_hire_userid').setLabel('ID العضو').setPlaceholder('مثلاً: 123456789012345678').setStyle(TextInputStyle.Short).setRequired(true)
                    ),
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder().setCustomId('comp_hire_salary').setLabel('الراتب الأسبوعي (💰)').setPlaceholder('مثلاً: 500').setStyle(TextInputStyle.Short).setRequired(true)
                    ),
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder().setCustomId('comp_hire_rank').setLabel('الرتبة الوظيفية').setPlaceholder('مثلاً: مدير تسويق / مبرمج / محاسب').setStyle(TextInputStyle.Short).setRequired(true)
                    )
                );
                return await interaction.showModal(modal);
            }

            // ── فتح Modal فصل موظف ──
            if (action === 'comp_fire_show') {
                const ud = db.getUserData(authorId);
                if (!ud.company) return interaction.reply({ content: '❌ لا تملك شركة!', flags: [MessageFlags.Ephemeral] });
                const modal = new ModalBuilder().setCustomId('comp_fire_submit').setTitle('🔴 فصل موظف');
                modal.addComponents(new ActionRowBuilder().addComponents(
                    new TextInputBuilder().setCustomId('comp_fire_userid').setLabel('ID الموظف المراد فصله').setStyle(TextInputStyle.Short).setRequired(true)
                ));
                return await interaction.showModal(modal);
            }

            // ── فتح Modal تغيير الاسم ──
            if (action === 'comp_rename_modal') {
                const ud = db.getUserData(authorId);
                if (!ud.company) return interaction.reply({ content: '❌ لا تملك شركة!', flags: [MessageFlags.Ephemeral] });
                const modal = new ModalBuilder().setCustomId('comp_rename_submit').setTitle('✏️ إعادة تسمية الشركة');
                modal.addComponents(new ActionRowBuilder().addComponents(
                    new TextInputBuilder().setCustomId('comp_newname_input').setLabel('الاسم الجديد للشركة').setStyle(TextInputStyle.Short).setMinLength(3).setMaxLength(30).setRequired(true)
                ));
                return await interaction.showModal(modal);
            }

            // ── جمع الأرباح ──
            if (action === 'comp_collect_profits') {
                const ud = db.getUserData(authorId);
                if (!ud.company || (ud.company.profit || 0) <= 0)
                    return interaction.reply({ content: '❌ لا توجد أرباح جاهزة!', flags: [MessageFlags.Ephemeral] });
                const profit = ud.company.profit;
                ud.balance = (ud.balance || 0) + profit;
                ud.company.profit = 0;
                db.updateUserData(authorId, ud);
                return interaction.reply({ content: `✅ تم جمع **${profit.toLocaleString()}** 💰 وإضافتها لمحفظتك!`, flags: [MessageFlags.Ephemeral] });
            }

            // ── تبديل حالة التوظيف ──
            if (action === 'comp_toggle_hiring') {
                const ud = db.getUserData(authorId);
                if (!ud.company) return interaction.reply({ content: '❌ لا تملك شركة!', flags: [MessageFlags.Ephemeral] });
                ud.company.hiringOpen = !ud.company.hiringOpen;
                db.updateUserData(authorId, ud);
                await interaction.reply({
                    content: ud.company.hiringOpen ? '✅ تم **فتح** باب التوظيف في شركتك!' : '🔒 تم **إغلاق** باب التوظيف.',
                    flags: [MessageFlags.Ephemeral]
                });
                await this.refreshCompaniesChannel(interaction.guild);
                return;
            }

            // ── تحديث قناة الشركات يدوياً ──
            if (action === 'comp_update_channel') {
                await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });
                await this.refreshCompaniesChannel(interaction.guild);
                return interaction.editReply({ content: '✅ تم تحديث قناة الشركات بنجاح!' });
            }

            // ── زر التقديم من قناة الشركات ──
            if (action.startsWith('comp_apply_')) {
                const ownerId = action.replace('comp_apply_', '');
                const ownerData = db.getUserData(ownerId);
                if (!ownerData.company) return interaction.reply({ content: '❌ هذه الشركة لم تعد موجودة!', flags: [MessageFlags.Ephemeral] });
                if (!ownerData.company.hiringOpen) return interaction.reply({ content: '🔒 التوظيف في هذه الشركة مغلق!', flags: [MessageFlags.Ephemeral] });
                if (authorId === ownerId) return interaction.reply({ content: '❌ لا يمكنك التقديم في شركتك!', flags: [MessageFlags.Ephemeral] });
                if ((ownerData.company.employees || []).some(e => e.id === authorId))
                    return interaction.reply({ content: '❌ أنت موظف بالفعل في هذه الشركة!', flags: [MessageFlags.Ephemeral] });

                if (!ownerData.company.pendingApps) ownerData.company.pendingApps = [];
                if (ownerData.company.pendingApps.some(a => a.userId === authorId))
                    return interaction.reply({ content: '⏳ طلبك قيد المراجعة بالفعل!', flags: [MessageFlags.Ephemeral] });

                // إضافة الطلب
                ownerData.company.pendingApps.push({ userId: authorId, appliedAt: Date.now() });
                db.updateUserData(ownerId, ownerData);

                // إرسال إشعار DM للمالك
                try {
                    const owner = await interaction.client.users.fetch(ownerId);
                    const notifEmbed = new EmbedBuilder()
                        .setColor('#3498DB')
                        .setTitle('📋 طلب توظيف جديد!')
                        .setDescription(`**${interaction.user.username}** يطلب العمل في شركتك **${ownerData.company.name}**`)
                        .addFields({ name: '🙋 المتقدم', value: `<@${authorId}>`, inline: true })
                        .setTimestamp();
                    const btns = new ActionRowBuilder().addComponents(
                        new ButtonBuilder().setCustomId(`comp_accept_${authorId}_${ownerId}`).setLabel('✅ قبول').setStyle(ButtonStyle.Success),
                        new ButtonBuilder().setCustomId(`comp_reject_${authorId}_${ownerId}`).setLabel('❌ رفض').setStyle(ButtonStyle.Danger)
                    );
                    await owner.send({ embeds: [notifEmbed], components: [btns] });
                } catch (e) { console.warn('[Company] Could not DM owner:', e.message); }

                return interaction.reply({ content: `✅ تم إرسال طلبك لمالك **${ownerData.company.name}**! انتظر القبول.`, flags: [MessageFlags.Ephemeral] });
            }

            // ── قبول موظف (owner يضغط ✅) ──
            if (action.startsWith('comp_accept_')) {
                const parts = action.split('_');
                const applicantId = parts[2];
                const ownerId = parts[3];
                if (authorId !== ownerId) return interaction.reply({ content: '❌ هذا الإشعار ليس لك!', flags: [MessageFlags.Ephemeral] });

                const modal = new ModalBuilder()
                    .setCustomId(`comp_acceptconfirm_${applicantId}_${ownerId}`)
                    .setTitle('✅ قبول الموظف — تحديد الشروط');
                modal.addComponents(
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder().setCustomId('acc_rank').setLabel('الرتبة الوظيفية').setPlaceholder('مثلاً: مدير تسويق / محاسب').setStyle(TextInputStyle.Short).setRequired(true)
                    ),
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder().setCustomId('acc_salary').setLabel('الراتب الأسبوعي (💰)').setPlaceholder('مثلاً: 1000').setStyle(TextInputStyle.Short).setRequired(true)
                    )
                );
                return await interaction.showModal(modal);
            }

            // ── رفض موظف (owner يضغط ❌) ──
            if (action.startsWith('comp_reject_')) {
                const parts = action.split('_');
                const applicantId = parts[2];
                const ownerId = parts[3];
                if (authorId !== ownerId) return interaction.reply({ content: '❌ هذا الإشعار ليس لك!', flags: [MessageFlags.Ephemeral] });

                const ownerData = db.getUserData(ownerId);
                if (ownerData.company?.pendingApps) {
                    ownerData.company.pendingApps = ownerData.company.pendingApps.filter(a => a.userId !== applicantId);
                    db.updateUserData(ownerId, ownerData);
                }

                try {
                    const applicant = await interaction.client.users.fetch(applicantId);
                    await applicant.send(`❌ تم رفض طلبك للعمل في **${ownerData.company?.name || 'الشركة'}**. يمكنك التقديم في شركات أخرى!`);
                } catch (e) { /* can't DM */ }

                return await interaction.update({
                    embeds: [new EmbedBuilder().setColor('#FF0000').setTitle('❌ تم رفض الطلب').setDescription(`رفضت طلب <@${applicantId}>`)],
                    components: []
                });
            }

        } catch (error) {
            console.error('[Company Interaction Error]:', error);
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({ content: `❌ خطأ: ${error.message || 'حدث خطأ غير متوقع'}`, flags: [MessageFlags.Ephemeral] }).catch(() => { });
            }
        }
    },

    // ═══════════════════════════════════════════════════════
    // معالجة نوافذ الإدخال (Modals)
    // ═══════════════════════════════════════════════════════
    async handleCompanyModal(interaction) {
        try {
            const authorId = interaction.user.id;
            const modalId = interaction.customId;

            // ── إنشاء شركة ──
            if (modalId === 'comp_create_submit') {
                const name = interaction.fields.getTextInputValue('comp_name_input').trim();
                const userData = db.getUserData(authorId);
                if (userData.company) return interaction.reply({ content: '❌ لديك شركة بالفعل!', flags: [MessageFlags.Ephemeral] });
                if ((userData.balance || 0) < 20000)
                    return interaction.reply({ content: `❌ تحتاج **20,000** 💰 للتأسيس. رصيدك: **${(userData.balance || 0).toLocaleString()}**`, flags: [MessageFlags.Ephemeral] });

                userData.balance -= 20000;
                userData.company = { name, employees: [], pendingApps: [], profit: 0, createdAt: Date.now(), hiringOpen: false };
                db.updateUserData(authorId, userData);
                await interaction.reply({ content: `🏢 تم تأسيس **${name}** بنجاح! استخدم \`شركة\` لإدارتها.`, flags: [MessageFlags.Ephemeral] });
                await this.refreshCompaniesChannel(interaction.guild);
                return;
            }

            // ── توظيف مباشر ──
            if (modalId === 'comp_hire_submit') {
                const userId = interaction.fields.getTextInputValue('comp_hire_userid').trim().replace(/\D/g, '');
                const salary = parseInt(interaction.fields.getTextInputValue('comp_hire_salary').trim());
                const rank = interaction.fields.getTextInputValue('comp_hire_rank').trim();
                const userData = db.getUserData(authorId);

                if (!userData.company) return interaction.reply({ content: '❌ لا تملك شركة!', flags: [MessageFlags.Ephemeral] });
                if (!userId || isNaN(salary) || salary < 0) return interaction.reply({ content: '❌ بيانات غير صحيحة!', flags: [MessageFlags.Ephemeral] });
                if (userId === authorId) return interaction.reply({ content: '❌ لا تستطيع توظيف نفسك!', flags: [MessageFlags.Ephemeral] });
                if ((userData.company.employees || []).some(e => e.id === userId))
                    return interaction.reply({ content: '❌ هذا العضو موظف بالفعل!', flags: [MessageFlags.Ephemeral] });

                if (!userData.company.employees) userData.company.employees = [];
                userData.company.employees.push({ id: userId, salary, rank, hiredAt: Date.now() });
                userData.company.pendingApps = (userData.company.pendingApps || []).filter(a => a.userId !== userId);
                db.updateUserData(authorId, userData);

                try {
                    const u = await interaction.client.users.fetch(userId);
                    await u.send(`🎉 تم توظيفك في **${userData.company.name}** برتبة **${rank}** وراتب **${salary.toLocaleString()}** 💰/أسبوع!`);
                } catch (e) { /* can't DM */ }

                await interaction.reply({ content: `✅ تم توظيف <@${userId}> برتبة **${rank}**!`, flags: [MessageFlags.Ephemeral] });
                await this.refreshCompaniesChannel(interaction.guild);
                return;
            }

            // ── فصل موظف ──
            if (modalId === 'comp_fire_submit') {
                const userId = interaction.fields.getTextInputValue('comp_fire_userid').trim().replace(/\D/g, '');
                const userData = db.getUserData(authorId);
                if (!userData.company) return interaction.reply({ content: '❌ لا تملك شركة!', flags: [MessageFlags.Ephemeral] });

                const before = userData.company.employees?.length || 0;
                userData.company.employees = (userData.company.employees || []).filter(e => e.id !== userId);
                if ((userData.company.employees?.length || 0) === before)
                    return interaction.reply({ content: '❌ هذا الشخص ليس موظفاً لديك!', flags: [MessageFlags.Ephemeral] });

                db.updateUserData(authorId, userData);
                try {
                    const u = await interaction.client.users.fetch(userId);
                    await u.send(`🔴 تم فصلك من **${userData.company.name}**.`);
                } catch (e) { /* can't DM */ }

                await interaction.reply({ content: `✅ تم فصل <@${userId}> من الشركة.`, flags: [MessageFlags.Ephemeral] });
                await this.refreshCompaniesChannel(interaction.guild);
                return;
            }

            // ── إعادة تسمية ──
            if (modalId === 'comp_rename_submit') {
                const newName = interaction.fields.getTextInputValue('comp_newname_input').trim();
                const userData = db.getUserData(authorId);
                if (!userData.company) return interaction.reply({ content: '❌ لا تملك شركة!', flags: [MessageFlags.Ephemeral] });
                const old = userData.company.name;
                userData.company.name = newName;
                db.updateUserData(authorId, userData);
                await interaction.reply({ content: `✅ تمت إعادة التسمية: **${old}** ← **${newName}**`, flags: [MessageFlags.Ephemeral] });
                await this.refreshCompaniesChannel(interaction.guild);
                return;
            }

            // ── قبول موظف من DM (بعد تحديد الرتبة والراتب) ──
            if (modalId.startsWith('comp_acceptconfirm_')) {
                const parts = modalId.split('_');
                const applicantId = parts[2];
                const ownerId = parts[3];
                if (authorId !== ownerId) return interaction.reply({ content: '❌ ليس لك صلاحية!', flags: [MessageFlags.Ephemeral] });

                const rank = interaction.fields.getTextInputValue('acc_rank').trim();
                const salary = parseInt(interaction.fields.getTextInputValue('acc_salary').trim());
                if (!rank || isNaN(salary) || salary < 0) return interaction.reply({ content: '❌ بيانات غير صحيحة!', flags: [MessageFlags.Ephemeral] });

                const ownerData = db.getUserData(ownerId);
                if (!ownerData.company) return interaction.reply({ content: '❌ شركتك غير موجودة!', flags: [MessageFlags.Ephemeral] });

                if (!ownerData.company.employees) ownerData.company.employees = [];
                ownerData.company.employees.push({ id: applicantId, salary, rank, hiredAt: Date.now() });
                ownerData.company.pendingApps = (ownerData.company.pendingApps || []).filter(a => a.userId !== applicantId);
                db.updateUserData(ownerId, ownerData);

                try {
                    const applicant = await interaction.client.users.fetch(applicantId);
                    await applicant.send(`🎉 تم قبولك في **${ownerData.company.name}** برتبة **${rank}** وراتب **${salary.toLocaleString()}** 💰/أسبوع!`);
                } catch (e) { /* can't DM */ }

                await interaction.update({
                    embeds: [new EmbedBuilder().setColor('#00FF00').setTitle('✅ تم قبول الموظف').setDescription(`تمت إضافة <@${applicantId}> برتبة **${rank}** وراتب **${salary.toLocaleString()}** 💰`)],
                    components: []
                });
                await this.refreshCompaniesChannel(interaction.guild);
                return;
            }

        } catch (error) {
            console.error('[Company Modal Error]:', error);
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({ content: `❌ خطأ: ${error.message}`, flags: [MessageFlags.Ephemeral] }).catch(() => { });
            }
        }
    },

    // ═══════════════════════════════════════════════════════
    // تحديث قناة الشركات
    // ═══════════════════════════════════════════════════════
    async refreshCompaniesChannel(guild) {
        try {
            if (!guild) return;
            const guildData = db.getGuildData(guild.id);
            let channelId = guildData.companiesChannelId;
            let channel = channelId ? guild.channels.cache.get(channelId) : null;

            // البحث باسم القناة أولاً قبل الإنشاء
            if (!channel) {
                channel = guild.channels.cache.find(c => c.name === '🏢・الشركات');
            }

            // إنشاء القناة إذا لم توجد
            if (!channel) {
                channel = await guild.channels.create({
                    name: '🏢・الشركات',
                    type: ChannelType.GuildText,
                    permissionOverwrites: [
                        { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.SendMessages, PermissionFlagsBits.AddReactions, PermissionFlagsBits.CreatePublicThreads] },
                        { id: guild.members.me.id, allow: [PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageMessages, PermissionFlagsBits.EmbedLinks] }
                    ],
                    topic: '📋 قائمة شركات السيرفر | اضغط زر التقديم للانضمام!'
                });
                console.log(`[Company] ✅ Created companies channel in ${guild.name}`);
            }

            // حفظ ID القناة
            if (guildData.companiesChannelId !== channel.id) {
                guildData.companiesChannelId = channel.id;
                db.updateGuildData(guild.id, guildData);
            }

            // حذف رسائل البوت القديمة (واحدة واحدة لتجنب قيود bulkDelete)
            try {
                const fetched = await channel.messages.fetch({ limit: 50 });
                const botMsgs = [...fetched.filter(m => m.author.id === guild.members.me.id).values()];
                for (const m of botMsgs) {
                    await m.delete().catch(() => { });
                    await new Promise(r => setTimeout(r, 200));
                }
            } catch (e) { console.warn('[Company] Delete msgs error:', e.message); }

            // تجميع الشركات
            const allUsers = db.getAllUsers();
            const companies = Object.entries(allUsers)
                .filter(([, u]) => u.company)
                .map(([id, u]) => ({ ownerId: id, ...u.company }));

            // رسالة الرأس
            const headerEmbed = new EmbedBuilder()
                .setColor('#2B2D31')
                .setTitle('🏢 مركز الشركات')
                .setDescription([
                    '> **مرحباً بك في مركز الشركات!**',
                    '',
                    '📋 هنا تجد قائمة جميع شركات السيرفر',
                    '💼 قدّم للعمل في أي شركة مفتوحة التوظيف',
                    '🏗️ لتأسيس شركتك اكتب `شركة` في أي قناة',
                    '',
                    `📊 **إجمالي الشركات:** ${companies.length}`
                ].join('\n'))
                .setTimestamp()
                .setFooter({ text: 'آخر تحديث' });
            await channel.send({ embeds: [headerEmbed] });
            await new Promise(r => setTimeout(r, 400));

            if (companies.length === 0) {
                await channel.send({
                    embeds: [new EmbedBuilder().setColor('#FFA500').setTitle('📭 لا توجد شركات بعد').setDescription('كن أول من يؤسس شركة! اكتب `شركة` للبدء 🚀')]
                });
                return;
            }

            // إرسال بطاقة لكل شركة
            for (const comp of companies) {
                const empCount = comp.employees?.length || 0;
                const pendingCount = comp.pendingApps?.length || 0;
                const dailyRev = empCount * 500;

                const embed = new EmbedBuilder()
                    .setColor(comp.hiringOpen ? '#00C853' : '#546E7A')
                    .setTitle(`${comp.hiringOpen ? '🟢' : '🔴'} ${comp.name}`)
                    .setDescription(comp.hiringOpen
                        ? '> ✅ **هذه الشركة تقبل طلبات التوظيف الآن**'
                        : '> 🔒 **باب التوظيف مغلق حالياً**'
                    )
                    .addFields(
                        { name: '👤 المالك', value: `<@${comp.ownerId}>`, inline: true },
                        { name: '👥 الموظفون', value: `${empCount}`, inline: true },
                        { name: '📈 إيراد/يوم', value: `${dailyRev.toLocaleString()} 💰`, inline: true },
                        { name: '📅 التأسيس', value: `<t:${Math.floor((comp.createdAt || Date.now()) / 1000)}:D>`, inline: true },
                        { name: '⏳ طلبات معلقة', value: `${pendingCount}`, inline: true },
                        { name: '💼 التوظيف', value: comp.hiringOpen ? '✅ مفتوح' : '🔒 مغلق', inline: true }
                    )
                    .setTimestamp()
                    .setFooter({ text: comp.hiringOpen ? 'اضغط زر التقديم للانضمام' : 'التوظيف مغلق' });

                if (empCount > 0) {
                    const empList = comp.employees.slice(0, 5)
                        .map(e => `• <@${e.id}> — **${e.rank || 'موظف'}**`)
                        .join('\n');
                    embed.addFields({ name: '👔 بعض الموظفين', value: empList + (empCount > 5 ? `\n... و${empCount - 5} آخرون` : '') });
                }

                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId(`comp_apply_${comp.ownerId}`)
                        .setLabel(comp.hiringOpen ? '📩 تقديم طلب عمل' : '🔒 التوظيف مغلق')
                        .setStyle(comp.hiringOpen ? ButtonStyle.Primary : ButtonStyle.Secondary)
                        .setDisabled(!comp.hiringOpen)
                );

                await channel.send({ embeds: [embed], components: [row] });
                await new Promise(r => setTimeout(r, 350));
            }

        } catch (err) {
            console.error('[refreshCompaniesChannel]:', err);
        }
    },

    // ═══════════════════════════════════════════════════════
    // أوامر نصية (fallback للاستخدام النصي)
    // ═══════════════════════════════════════════════════════
    async handleCreate(context, author, name) {
        try {
            const userData = db.getUserData(author.id);
            if (!name) return context.reply('❌ مثال: `شركة إنشاء اسم الشركة`');
            if (userData.company) return context.reply('❌ لديك شركة بالفعل!');
            if ((userData.balance || 0) < 20000) return context.reply('❌ تحتاج 20,000 💰 للتأسيس!');

            userData.balance -= 20000;
            userData.company = { name, employees: [], pendingApps: [], profit: 0, createdAt: Date.now(), hiringOpen: false };
            db.updateUserData(author.id, userData);
            await context.reply(`✅ تأسست **"${name}"** بنجاح! 🏢`);
            await this.sendDashboard(context, author, userData);
            if (context.guild) await this.refreshCompaniesChannel(context.guild);
        } catch (e) {
            console.error('[handleCreate]:', e);
            context.reply('❌ خطأ في إنشاء الشركة.').catch(() => { });
        }
    },

    async handleHire(context, author, target, salary) {
        try {
            const userData = db.getUserData(author.id);
            if (!userData.company) return context.reply('❌ لا تملك شركة!');
            if (!target || isNaN(salary)) return context.reply('❌ `شركة توظيف @user <راتب>`');
            if (target.bot || target.id === author.id) return context.reply('❌ لا يمكن توظيف بوت أو نفسك!');
            if ((userData.company.employees || []).some(e => e.id === target.id)) return context.reply('❌ موظف بالفعل!');

            userData.company.employees = userData.company.employees || [];
            userData.company.employees.push({ id: target.id, salary, rank: 'موظف', hiredAt: Date.now() });
            db.updateUserData(author.id, userData);
            context.reply(`✅ تم توظيف ${target.username} براتب **${salary.toLocaleString()}** 💰`);
        } catch (e) {
            console.error('[handleHire]:', e);
            context.reply('❌ خطأ في التوظيف.').catch(() => { });
        }
    }
};
