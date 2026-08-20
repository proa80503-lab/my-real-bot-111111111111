const { Events, MessageFlags } = require('discord.js');
const helpModule = require('../commands/main/help');
const ownerDashboard = require('../commands/main/owner-dashboard');
const tttModule = require('../commands/games/ttt');
const rpsModule = require('../commands/games/rps');
const triviaModule = require('../commands/games/trivia');
const casinoAdvancedModule = require('../commands/economy/casino');
const clans = require('../commands/social/clans');
const punishmentsUtils = require('../utils/punishments');
const colorRoles = require('../commands/moderation/color-roles');
const ownerCommands = require('../commands/main/status');
const menuModule = require('../commands/main/menu');
const balanceModule = require('../commands/economy/balance');
const adminPanelModule = require('../commands/moderation/panel');
const economyModule = require('../commands/economy/shop');
const companyModule = require('../commands/economy/company');
const ecoHub = require('../commands/economy/economy-hub');
const gamesHub = require('../commands/games/games-hub');

// ── الأوامر الجديدة بالأزرار ────────────────────────────────────────────────────
const hangmanModule = require('../commands/games/hangman');
const mathModule = require('../commands/games/math');
const memoryModule = require('../commands/games/memory');
const funButtons = require('../commands/fun/fun-buttons');
const marketModule = require('../commands/economy/market');
const casinoModule = require('../commands/economy/casino');
const achievementsModule = require('../commands/main/achievements-cmd');
const analyticsModule = require('../commands/main/analytics');
const minigamesModule = require('../commands/games/minigames');
const dailyModule = require('../commands/economy/daily');
const workModule = require('../commands/economy/work');
const marryModule = require('../commands/social/marry');
const modButtonsModule = require('../commands/moderation/mod-buttons');

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction) {
        try {
            // ===== AUTO-DEFER MONKEY PATCH =====
            // This safely defers all slow buttons to prevent "Application didn't respond in time"
            // except for buttons that open modals (you cannot open a modal on a deferred interaction).
            if (interaction.isButton()) {
                const id = interaction.customId;
                const modalPrefixes = [
                    'clan_create', 'clan_rename', 'clan_edit_rank', 'clan_invite', 'clan_kick', 'clan_desc',
                    'eco_deposit', 'eco_withdraw', 'eco_transfer', 'eco_rob',
                    'adm_warn', 'adm_jail', 'adm_kick', 'adm_ban', 'adm_unmute', 'adm_unjail', 'adm_unban',
                    'status_btn_', 'company_name', 'company_desc', 'company_logo', 'company_color', 'room_create'
                ];
                const isModalBtn = modalPrefixes.some(p => id.startsWith(p));
                const needsDeferReply = id.startsWith('color_') || id.startsWith('colorole_');

                if (!isModalBtn && !needsDeferReply) {
                    await interaction.deferUpdate().catch(() => {});
                } else if (!isModalBtn && needsDeferReply) {
                    await interaction.deferReply({ ephemeral: true }).catch(() => {});
                }

                // Monkey-patch update to editReply if deferred
                const origUpdate = interaction.update.bind(interaction);
                interaction.update = async (options) => {
                    if (interaction.deferred || interaction.replied) return interaction.editReply(options).catch(()=>{});
                    return origUpdate(options);
                };

                // Monkey-patch reply to followUp if deferred
                const origReply = interaction.reply.bind(interaction);
                interaction.reply = async (options) => {
                    if (interaction.deferred || interaction.replied) {
                        const isEph = options.ephemeral || (options.flags && (options.flags === 64 || options.flags.bitfield === 64));
                        return interaction.followUp({ ...options, ephemeral: !!isEph }).catch(()=>{});
                    }
                    return origReply(options);
                };
                
                // Protect double defer calls
                const origDeferUpdate = interaction.deferUpdate.bind(interaction);
                interaction.deferUpdate = async (options) => {
                    if (interaction.deferred || interaction.replied) return;
                    return origDeferUpdate(options);
                };
                
                const origDeferReply = interaction.deferReply.bind(interaction);
                interaction.deferReply = async (options) => {
                    if (interaction.deferred || interaction.replied) return;
                    return origDeferReply(options);
                };
            }
            // ===================================

            // ===== 1. معالجة الـ Modals =====
            if (interaction.isModalSubmit()) {
                // 🏠 Quick Room Modals
                if (interaction.customId.startsWith('quickroom_modal_')) {
                    const roomCreator = require('../commands/moderation/room-creator');
                    await roomCreator.handleQuickRoomModal(interaction);
                }
                // Clan modals
                else if (interaction.customId === 'clan_create_modal') {
                    await clans.handleCreateSubmit(interaction);
                } else if (interaction.customId === 'clan_invite_modal') {
                    await clans.handleInviteSubmit(interaction);
                } else if (interaction.customId === 'clan_kick_modal') {
                    await clans.handleKickSubmit(interaction);
                } else if (interaction.customId === 'clan_editrank_modal') {
                    await clans.handleEditRankModalSubmit(interaction);
                } else if (interaction.customId.startsWith('clan_desc_modal_')) {
                    const clanId = interaction.customId.replace('clan_desc_modal_', '');
                    await clans.handleDescSubmit(interaction, clanId);
                } else if (interaction.customId.startsWith('clan_rename_modal_')) {
                    const clanId = interaction.customId.replace('clan_rename_modal_', '');
                    await clans.handleRenameSubmit(interaction, clanId);
                }
                // Economy Hub modals
                else if ([
                    'eco_deposit_modal', 'eco_withdraw_modal', 'eco_transfer_modal',
                    'eco_vault_deposit_modal', 'eco_vault_withdraw_modal'
                ].includes(interaction.customId)) {
                    await ecoHub.handleEcoModal(interaction);
                }
                // Status modals
                else if (interaction.customId.startsWith('status_modal_')) {
                    await ownerCommands.handleStatusInteraction(interaction);
                }
                // Economy modals
                else if (interaction.customId.startsWith('econ_')) {
                    if (balanceModule.handleEconomyModal) await balanceModule.handleEconomyModal(interaction);
                }
                // Admin modals (both legacy admin_ and new adm_)
                else if (interaction.customId.startsWith('admin_') || interaction.customId.startsWith('adm_')) {
                    await adminPanelModule.handleAdminModal(interaction);
                }
                // Owner dashboard modals
                else if (interaction.customId.startsWith('owner_')) {
                    await ownerDashboard.handleOwnerModal(interaction);
                }
                // Company modals
                else if (interaction.customId.startsWith('comp_')) {
                    await companyModule.handleCompanyModal(interaction);
                }
                return;
            }

            // ===== 2. معالجة القوائم المنسدلة =====
            if (interaction.isStringSelectMenu()) {
                if (interaction.customId.startsWith('clan_rank_select_')) {
                    const targetId = interaction.customId.replace('clan_rank_select_', '');
                    await clans.handleRankSelection(interaction, targetId);
                } else if (interaction.customId.startsWith('clan_invite_rank_')) {
                    // تنسيق: clan_invite_rank_clan_1|targetId|guildId
                    const raw = interaction.customId.replace('clan_invite_rank_', '');
                    const [clanId, targetId, guildId] = raw.split('|');
                    await clans.handleInviteRankSelect(interaction, clanId, targetId, guildId);
                } else if (interaction.customId === 'trivia_topic_select') {
                    await triviaModule.handleTriviaInteraction(interaction);
                } else if (interaction.customId === 'help_select_category') {
                    await helpModule.handleHelpInteraction(interaction);
                }
                return;
            }

            // ===== 3. معالجة الأزرار =====
            if (interaction.isButton()) {
                const id = interaction.customId;

                // 🏠 Room Creator buttons (including quickroom)
                if (id.startsWith('room_') || id.startsWith('quickroom_')) {
                    const roomCreator = require('../commands/moderation/room-creator');
                    await roomCreator.handleRoomInteraction(interaction);
                }
                // 🗳️ Poll buttons
                else if (id.startsWith('poll_')) {
                    const pollCmd = require('../commands/social/poll');
                    await pollCmd.handlePollInteraction(interaction);
                }
                // 🎨 Color buttons — موحّد (color_btn_ و color_ ← نفس المعالج، إصلاح التعارض)
                else if (id.startsWith('color_btn_') || (id.startsWith('color_') && !id.startsWith('colorole_'))) {
                    const colorName = id.startsWith('color_btn_')
                        ? id.replace('color_btn_', '')
                        : id.replace('color_', '');
                    const colorRolesFixed = require('../commands/moderation/color-roles');
                    await colorRolesFixed.assignColorRole(interaction, colorName);
                }
                // ✅ Server Setup confirm/cancel — collector in server-setup.js handles logic
                // We must deferUpdate() to prevent Discord's "This interaction failed" error
                else if (id === 'setup_confirm' || id === 'setup_cancel') {
                    // Don't defer — the awaitMessageComponent collector inside server-setup.js
                    // will call response.update() which counts as acknowledging the interaction.
                    // If somehow not caught (race condition), silently ignore.
                    // Do nothing here — the collector handles it.
                }
                // 🤖 Bot guide buttons
                else if (id.startsWith('bot_guide_')) {
                    const guides = {
                        'bot_guide_economy': '💰 **الاقتصاد:** `رصيد` `يومي` `عمل` `متجر` `استثمار` `بنك` `تحويل @شخص`',
                        'bot_guide_games': '🎮 **الألعاب:** `xo @شخص` `رحجة @شخص` `تريفيا` `كازينو` `العاب`',
                        'bot_guide_rooms': '🏠 **الغرف:** `غرفة جديدة [اسم] [لعبة]` `غرف` `غرفتي` `حذف غرفة`',
                        'bot_guide_ai': '🧠 **الذكاء الاصطناعي:** منشن البوت في أي رسالة وسيرد عليك فوراً! يتذكر محادثاتك ويتعلم منها.',
                    };
                    await interaction.reply({ content: guides[id] || '❓ غير معروف', ephemeral: true });
                }
                // ❌⭕ Tic-Tac-Toe (v3 — bot, pvp, accept, decline, move)
                else if (id.startsWith('ttt_')) {
                    await tttModule.handleTicTacToeInteraction(interaction);
                }
                // 🪊📄✂️ Rock Paper Scissors (v3)
                else if (id.startsWith('rps_')) {
                    await rpsModule.handleRPSInteraction(interaction);
                }
                // 😵 Hangman (loحة الحروف)
                else if (id.startsWith('hangman_')) {
                    await hangmanModule.handleHangmanInteraction(interaction);
                }
                // 🧠 Memory Match (بطاقات التطابق)
                else if (id.startsWith('memory_')) {
                    await memoryModule.handleMemoryInteraction(interaction);
                }
                // 🧾e Math (إجابات متعددة)
                else if (id.startsWith('math_')) {
                    await mathModule.handleMathInteraction(interaction);
                }
                // 🔮 Fortune
                else if (id.startsWith('fortune_')) {
                    await funButtons.fortune.handleFortuneInteraction(interaction);
                }
                // 🤔 WYR (هل تفضل)
                else if (id.startsWith('wyr_')) {
                    await funButtons.wyr.handleWYRInteraction(interaction);
                }
                // 💘 Ship (توافق)
                else if (id.startsWith('ship_')) {
                    await funButtons.ship.handleShipInteraction(interaction);
                }
                // 🎲 Roll (نرد)
                else if (id.startsWith('roll_')) {
                    await funButtons.roll.handleRollInteraction(interaction);
                }
                // 🔮 8ball
                else if (id.startsWith('ball_')) {
                    await funButtons.ball.handleBallInteraction(interaction);
                }
                // 💹 Market (سوق)
                else if (id.startsWith('market_') || id.startsWith('mkt_')) {
                    if (marketModule.handleMarketInteraction) await marketModule.handleMarketInteraction(interaction);
                }
                // 🎯 Mini-Games
                else if (id.startsWith('mg_')) {
                    // معالجة أزرار الألعاب المصغرة من القائمة الرئيسية
                    if (id === 'mg_bomb') {
                        await minigamesModule.execute(interaction.message, ['bomb']);
                    } else if (id === 'mg_speed') {
                        await minigamesModule.execute(interaction.message, ['speed']);
                    } else if (id === 'mg_chain') {
                        await minigamesModule.execute(interaction.message, ['chain']);
                    }
                }
                // 🏅 Achievements
                else if (id.startsWith('ach_')) {
                    if (achievementsModule.handleAchievementsInteraction) {
                        await achievementsModule.handleAchievementsInteraction(interaction);
                    }
                }
                // 📊 Analytics
                else if (id.startsWith('analytics_') || id.startsWith('anal_')) {
                    if (analyticsModule.handleAnalyticsInteraction) {
                        await analyticsModule.handleAnalyticsInteraction(interaction);
                    }
                }
                // Punishments buttons
                else if (id.startsWith('remove_')) {
                    await punishmentsUtils.handlePunishmentButton(interaction);
                }
                // Shop buy buttons
                else if (id.startsWith('buy_')) {
                    await economyModule.handleShopButton(interaction);
                }
                // Property buttons
                else if (id.startsWith('prop_')) {
                    const propertyModule = require('../commands/economy/property');
                    await propertyModule.handlePropertyInteraction(interaction);
                }
                // Help buttons/menus
                else if (id.startsWith('help_')) {
                    await helpModule.handleHelpInteraction(interaction);
                }
                // Trivia difficulty buttons
                else if (id.startsWith('trivia_diff_')) {
                    await triviaModule.handleTriviaInteraction(interaction);
                }
                // Casino Blackjack buttons
                else if (id.startsWith('bj_')) {
                    await casinoAdvancedModule.handleBlackjackButton(interaction);
                }
                // Color roles buttons
                else if (id.startsWith('colorole_')) {
                    await colorRoles.handleColorButton(interaction);
                }
                // Clan buttons
                else if (id === 'clan_create_btn') {
                    await clans.showCreateModal(interaction);
                } else if (id === 'clan_my_dashboard') {
                    await clans.showDashboard_interaction(interaction);
                } else if (id === 'clan_list_btn') {
                    await clans.showClanList(interaction);
                } else if (id === 'clan_invite_btn') {
                    await clans.handleInviteButton(interaction);
                } else if (id === 'clan_leave_btn') {
                    await clans.handleLeave(interaction);
                } else if (id === 'clan_delete_btn') {
                    await clans.handleDissolve(interaction);
                } else if (id === 'clan_confirm_delete') {
                    await clans.handleConfirmDissolve(interaction);
                } else if (id === 'clan_cancel_delete') {
                    await interaction.update({ content: '❌ تم إلغاء العملية.', components: [] });
                } else if (id === 'clan_kick_btn') {
                    await clans.handleKickButton(interaction);
                } else if (id === 'clan_desc_btn') {
                    await clans.handleDescButton(interaction);
                } else if (id === 'clan_rename_btn') {
                    await clans.handleRenameButton(interaction, null);
                } else if (id.startsWith('clan_rename_')) {
                    const clanId = id.replace('clan_rename_', '');
                    await clans.handleRenameButton(interaction, clanId);
                } else if (id.startsWith('clan_settings_')) {
                    await interaction.reply({ content: '🛠️ إعدادات الكلان (قريباً)...', ephemeral: true });
                } else if (id.startsWith('clan_members_')) {
                    await interaction.reply({ content: '👥 قائمة الأعضاء — استخدم أمر `كلان` لرؤيتها.', ephemeral: true });
                } else if (id === 'clan_edit_rank_btn') {
                    await clans.handleEditRankButton(interaction);
                } else if (id.startsWith('clan:')) {
                    // تنسيق: clan:accept:clanId:guildId:rank  أو  clan:reject:clanId:guildId
                    const parts = id.split(':');
                    const action = parts[1];
                    const clanId = parts[2];
                    const guildId = parts[3];
                    const rank = parts[4] || 'member';
                    await clans.handleInviteResponse(interaction, action, clanId, guildId, rank);
                }
                // Status buttons
                else if (id.startsWith('status_btn_')) {
                    await ownerCommands.handleStatusInteraction(interaction);
                }
                // Menu buttons (economy, games, social, admin, profile, help, refresh)
                else if (id.startsWith('menu_')) {
                    await menuModule.handleMenuInteraction(interaction);
                }
                // eco_leaderboard — يُعالَج دائماً بواسطة ecoHub سواء جاء من القائمة أو اللوحة
                else if (id === 'eco_leaderboard') {
                    await ecoHub.handleEcoButton(interaction);
                }
                // Economy dashboard buttons
                else if (id.startsWith('econ_')) {
                    await balanceModule.handleEconomyInteraction(interaction);
                }
                // Admin buttons (both legacy admin_ and new adm_)
                else if (id.startsWith('admin_') || id.startsWith('adm_')) {
                    await adminPanelModule.handleAdminInteraction(interaction);
                }
                // Profile buttons (handled by collector inside profile.js)
                else if (id.startsWith('prof_')) {
                    // Collector قد يكون انتهت مدته — نرد بصمت لمنع "This interaction failed"
                    if (!interaction.replied && !interaction.deferred) {
                        await interaction.reply({
                            content: '⌛ انتهت مدة هذه الجلسة. اكتب `بروفايل` من جديد لعرض ملفك الشخصي.',
                            ephemeral: true
                        }).catch(() => {});
                    }
                }
                // Owner Dashboard buttons
                else if (id.startsWith('owner_')) {
                    await ownerDashboard.handleOwnerInteraction(interaction);
                }
                // Games Hub buttons (game_ / flip_)
                else if (id.startsWith('game_') || id.startsWith('flip_') || id === 'games_back') {
                    await gamesHub.handleGameButton(interaction);
                }
                // Economy Hub buttons (eco_)
                else if (id.startsWith('eco_')) {
                    await ecoHub.handleEcoButton(interaction);
                }
                // Shop buttons (sbuy_, shop_page_, shop_inv, shop_, buy_)
                else if (id.startsWith('sbuy_') || id.startsWith('shop_') || id.startsWith('buy_') || id === 'shop_inv') {
                    await economyModule.handleShopButton(interaction);
                }
                // 🏆 Leaderboard buttons (lb_)
                else if (id.startsWith('lb_')) {
                    const lbModule = require('../commands/main/leaderboard');
                    await lbModule.handleLeaderboardButton(interaction);
                }
                // Company buttons (must come LAST to not conflict with clan_)
                else if (id.startsWith('comp_')) {
                    await companyModule.handleCompanyInteraction(interaction);
                }
                // 🎁 Daily buttons
                else if (id.startsWith('daily_')) {
                    if (dailyModule.handleDailyInteraction) await dailyModule.handleDailyInteraction(interaction);
                }
                // 💼 Work buttons
                else if (id.startsWith('work_')) {
                    if (workModule.handleWorkInteraction) await workModule.handleWorkInteraction(interaction);
                }
                // 💍 Marry / Divorce buttons
                else if (id.startsWith('marry_') || id.startsWith('married_')) {
                    if (marryModule.handleMarryInteraction) await marryModule.handleMarryInteraction(interaction);
                }
                // 🔨 Moderation confirmation buttons (ban/kick/warn/mute)
                // تنسيق الـ customId: mod_confirm_type_targetId_authorId
                else if (id.startsWith('mod_confirm_') || id.startsWith('mod_cancel_')) {
                    await modButtonsModule.handleModButton(interaction);
                }
                // Guide navigation buttons
                else if (id.startsWith('guide_')) {
                    // The eco panel button 'guide_economy' opens the panel
                    if (id === 'guide_economy') {
                        const panel = await ecoHub.buildMainPanel(interaction.user.id, interaction.client);
                        await interaction.update({ ...panel });
                    } else {
                        // أزرار الـ guide الأخرى (prev/next/page) — collector قد انتهى
                        if (!interaction.replied && !interaction.deferred) {
                            await interaction.reply({
                                content: '⌛ انتهت مدة هذه الجلسة. اكتب الأمر من جديد.',
                                ephemeral: true
                            }).catch(() => {});
                        }
                    }
                }
                // Silently ignore expired/handled-externally buttons
                else if (id === 'fast_click_gift' || id.startsWith('ignore_')) {
                    // أزرار مُهمَلة — نرد بصمت لمنع "This interaction failed"
                    if (!interaction.replied && !interaction.deferred) {
                        await interaction.deferUpdate().catch(() => {});
                    }
                }
                else {
                    // زر غير معروف — نرد بصمت لمنع "This interaction failed"
                    if (!interaction.replied && !interaction.deferred) {
                        await interaction.reply({
                            content: '⚙️ هذا الزر لا يعمل في الوقت الحالي.',
                            ephemeral: true
                        }).catch(() => {});
                    }
                }
            }

        } catch (error) {
            // خطأ 10062 = Unknown Interaction (انتهت صلاحية الـ interaction) — تجاهله بصمت
            if (error.code === 10062) return;

            console.error('[Interaction Handler Error]:', error);
            if (!interaction.replied && !interaction.deferred) {
                try {
                    await interaction.reply({
                        content: `❌ حدث خطأ غير متوقع. حاول مرة أخرى.`,
                        ephemeral: true
                    });
                } catch (e) { /* Already replied or expired */ }
            }
        }
    }
};
