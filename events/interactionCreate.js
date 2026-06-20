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

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction) {
        try {
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
                // 🎨 Color buttons (from setup colors embed)
                else if (id.startsWith('color_btn_')) {
                    const colorName = id.replace('color_btn_', '');
                    const colorRoles = require('../commands/moderation/color-roles');
                    await colorRoles.assignColorRole(interaction, colorName);
                }
                // Color command buttons (from the الوان command)
                else if (id.startsWith('color_') && !id.startsWith('colorole_')) {
                    const colorName = id.replace('color_', '');
                    const colorRoles = require('../commands/moderation/color-roles');
                    await colorRoles.assignColorRole(interaction, colorName);
                }
                // ✅ Server Setup confirm/cancel
                else if (id === 'setup_confirm' || id === 'setup_cancel') {
                    // Handled by the collector inside server-setup.js
                }
                // 🤖 Bot guide buttons
                else if (id.startsWith('bot_guide_')) {
                    const guides = {
                        'bot_guide_economy': '💰 **الاقتصاد:** `رصيد` `يومي` `عمل` `متجر` `استثمار` `بنك` `تحويل @شخص`',
                        'bot_guide_games': '🎮 **الألعاب:** `xo @شخص` `رحجة @شخص` `تريفيا` `كازينو` `العاب`',
                        'bot_guide_rooms': '🏠 **الغرف:** `غرفة جديدة [اسم] [لعبة]` `غرف` `غرفتي` `حذف غرفة`',
                        'bot_guide_ai': '🧠 **الذكاء الاصطناعي:** منشن البوت في أي رسالة وسيرد عليك فوراً! يتذكر محادثاتك ويتعلم منها.',
                    };
                    await interaction.reply({ content: guides[id] || '❓ غير معروف', flags: MessageFlags.Ephemeral });
                }
                // Tic-Tac-Toe
                else if (id.startsWith('ttt_')) {
                    await tttModule.handleTicTacToeInteraction(interaction);
                }
                // Rock Paper Scissors
                else if (id.startsWith('rps_')) {
                    await rpsModule.handleRPSInteraction(interaction);
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
                    await interaction.reply({ content: '🛠️ إعدادات الكلان (قريباً)...', flags: MessageFlags.Ephemeral });
                } else if (id.startsWith('clan_members_')) {
                    await interaction.reply({ content: '👥 قائمة الأعضاء — استخدم أمر `كلان` لرؤيتها.', flags: MessageFlags.Ephemeral });
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
                // Economy dashboard buttons
                else if (id.startsWith('econ_')) {
                    await balanceModule.handleEconomyInteraction(interaction);
                }
                // Admin buttons (both legacy admin_ and new adm_)
                else if (id.startsWith('admin_') || id.startsWith('adm_')) {
                    await adminPanelModule.handleAdminInteraction(interaction);
                }
                // Profile refresh button
                else if (id.startsWith('prof_refresh_')) {
                    const profileCmd = interaction.client.commands.get('profile');
                    if (profileCmd) await profileCmd.execute(interaction, []);
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
                // Guide navigation buttons
                else if (id.startsWith('guide_')) {
                    // Handled by message component collectors in guide.js
                    // The eco panel button 'guide_economy' opens the panel
                    if (id === 'guide_economy') {
                        const panel = await ecoHub.buildMainPanel(interaction.user.id, interaction.client);
                        await interaction.update({ ...panel });
                    }
                    // Other guide buttons (prev/next/page) handled by collector
                }
                // Silently ignore expired/handled-externally buttons
                else if (id === 'fast_click_gift' || id.startsWith('ignore_')) {
                    // Handled by collectors
                }
                else {
                    // Silently ignore unknown buttons to avoid crashes
                    // console.debug('[Interaction] Unknown button:', id);
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
                        flags: MessageFlags.Ephemeral
                    });
                } catch (e) { /* Already replied or expired */ }
            }
        }
    }
};
