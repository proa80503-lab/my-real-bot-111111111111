'use strict';

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * interactionCreate.js — نظام Routing مركزي لجميع Interactions
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * الترتيب:
 *   1. ModalSubmit
 *   2. StringSelectMenu
 *   3. Buttons
 *   4. ChatInputCommand (slash commands — محجوز للمستقبل)
 *   5. Autocomplete
 *
 * قواعد defer:
 *   - كل handler مسؤول عن defer نفسه
 *   - لا auto-defer شامل هنا (كان يسبب InteractionAlreadyReplied)
 *   - الـ safeAck هنا فقط كخط دفاع أخير للأزرار المجهولة
 * ─────────────────────────────────────────────────────────────────────────────
 */

const { Events } = require('discord.js');

// ── Lazy imports — محمّلة عند أول استخدام لتقليل وقت الـ boot ────────────────
const _mod = {};
function _require(name) {
    if (!_mod[name]) {
        try { _mod[name] = require(name); }
        catch (e) { console.error(`[InteractionCreate] فشل تحميل: ${name}`, e.message); return null; }
    }
    return _mod[name];
}

module.exports = {
    name: Events.InteractionCreate,

    async execute(interaction) {
        try {

            // ══════════════════════════════════════════════════════════════
            // 1. MODAL SUBMIT
            // ══════════════════════════════════════════════════════════════
            if (interaction.isModalSubmit()) {
                await _handleModal(interaction);
                return;
            }

            // ══════════════════════════════════════════════════════════════
            // 2. STRING SELECT MENU
            // ══════════════════════════════════════════════════════════════
            if (interaction.isStringSelectMenu()) {
                await _handleSelectMenu(interaction);
                return;
            }

            // ══════════════════════════════════════════════════════════════
            // 3. BUTTONS
            // ══════════════════════════════════════════════════════════════
            if (interaction.isButton()) {
                await _handleButton(interaction);
                return;
            }

        } catch (error) {
            // خطأ 10062 = Unknown Interaction (انتهت صلاحيتها) — تجاهل بصمت
            if (error.code === 10062) return;

            console.error('[InteractionCreate] ❌ خطأ:', error.message, '| ID:', interaction.customId ?? interaction.commandName ?? '?');

            // رد بالخطأ إذا لم يتم الرد بعد
            _safeReplyError(interaction, `❌ حدث خطأ غير متوقع. حاول مرة أخرى.`);
        }
    },
};

// ─────────────────────────────────────────────────────────────────────────────
// MODAL HANDLER
// ─────────────────────────────────────────────────────────────────────────────
async function _handleModal(interaction) {
    const id = interaction.customId;

    // Quick Room modals
    if (id.startsWith('quickroom_modal_')) {
        const m = _require('../commands/moderation/room-creator');
        return m?.handleQuickRoomModal(interaction);
    }

    // Clan modals
    if (id === 'clan_create_modal') return _require('../commands/social/clans')?.handleCreateSubmit(interaction);
    if (id === 'clan_invite_modal') return _require('../commands/social/clans')?.handleInviteSubmit(interaction);
    if (id === 'clan_kick_modal')   return _require('../commands/social/clans')?.handleKickSubmit(interaction);
    if (id === 'clan_editrank_modal') return _require('../commands/social/clans')?.handleEditRankModalSubmit(interaction);
    if (id.startsWith('clan_desc_modal_')) {
        const clanId = id.replace('clan_desc_modal_', '');
        return _require('../commands/social/clans')?.handleDescSubmit(interaction, clanId);
    }
    if (id.startsWith('clan_rename_modal_')) {
        const clanId = id.replace('clan_rename_modal_', '');
        return _require('../commands/social/clans')?.handleRenameSubmit(interaction, clanId);
    }

    // Economy Hub modals
    if (['eco_deposit_modal','eco_withdraw_modal','eco_transfer_modal','eco_vault_deposit_modal','eco_vault_withdraw_modal'].includes(id)) {
        return _require('../commands/economy/economy-hub')?.handleEcoModal(interaction);
    }

    // Status modals
    if (id.startsWith('status_modal_')) {
        return _require('../commands/main/status')?.handleStatusInteraction(interaction);
    }

    // Economy modals (legacy econ_)
    if (id.startsWith('econ_')) {
        const m = _require('../commands/economy/balance');
        return m?.handleEconomyModal?.(interaction);
    }

    // Admin modals
    if (id.startsWith('admin_') || id.startsWith('adm_')) {
        return _require('../commands/moderation/panel')?.handleAdminModal(interaction);
    }

    // Owner dashboard modals
    if (id.startsWith('owner_')) {
        return _require('../commands/main/owner-dashboard')?.handleOwnerModal(interaction);
    }

    // Company modals
    if (id.startsWith('comp_')) {
        return _require('../commands/economy/company')?.handleCompanyModal(interaction);
    }

    // Modal غير معروف — رد بصمت
    if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({ content: '⚙️ هذا النموذج لا يعمل حالياً.', ephemeral: true }).catch(() => {});
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// SELECT MENU HANDLER
// ─────────────────────────────────────────────────────────────────────────────
async function _handleSelectMenu(interaction) {
    const id = interaction.customId;

    if (id.startsWith('clan_rank_select_')) {
        const targetId = id.replace('clan_rank_select_', '');
        return _require('../commands/social/clans')?.handleRankSelection(interaction, targetId);
    }
    if (id.startsWith('clan_invite_rank_')) {
        const raw = id.replace('clan_invite_rank_', '');
        const [clanId, targetId, guildId] = raw.split('|');
        return _require('../commands/social/clans')?.handleInviteRankSelect(interaction, clanId, targetId, guildId);
    }
    if (id === 'trivia_topic_select') {
        return _require('../commands/games/trivia')?.handleTriviaInteraction(interaction);
    }
    if (id === 'help_select_category') {
        return _require('../commands/main/help')?.handleHelpInteraction(interaction);
    }

    // Select غير معروف
    if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({ content: '⚙️ هذه القائمة لا تعمل حالياً.', ephemeral: true }).catch(() => {});
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// BUTTON HANDLER
// ─────────────────────────────────────────────────────────────────────────────
async function _handleButton(interaction) {
    const id = interaction.customId;

    // 🏠 Room Creator
    if (id.startsWith('room_') || id.startsWith('quickroom_')) {
        return _require('../commands/moderation/room-creator')?.handleRoomInteraction(interaction);
    }

    // 🗳️ Poll
    if (id.startsWith('poll_')) {
        return _require('../commands/social/poll')?.handlePollInteraction(interaction);
    }

    // 🎨 Color roles — موحّد (color_btn_ و color_)
    if (id.startsWith('color_btn_')) {
        const colorName = id.replace('color_btn_', '');
        return _require('../commands/moderation/color-roles')?.assignColorRole(interaction, colorName);
    }
    if (id.startsWith('color_') && !id.startsWith('colorole_')) {
        const colorName = id.replace('color_', '');
        return _require('../commands/moderation/color-roles')?.assignColorRole(interaction, colorName);
    }

    // ✅ Server Setup — يُدار بـ collector داخل server-setup.js
    // إذا وصل هنا يعني الـ collector انتهى → نرد بصمت
    if (id === 'setup_confirm' || id === 'setup_cancel') {
        if (!interaction.replied && !interaction.deferred) {
            await interaction.deferUpdate().catch(() => {});
        }
        return;
    }

    // 🤖 Bot guide
    if (id.startsWith('bot_guide_')) {
        const guides = {
            'bot_guide_economy': '💰 **الاقتصاد:** `رصيد` `يومي` `عمل` `متجر` `استثمار` `بنك` `تحويل @شخص`',
            'bot_guide_games':   '🎮 **الألعاب:** `xo @شخص` `رحجة @شخص` `تريفيا` `كازينو` `العاب`',
            'bot_guide_rooms':   '🏠 **الغرف:** `غرفة جديدة [اسم] [لعبة]` `غرف` `غرفتي` `حذف غرفة`',
            'bot_guide_ai':      '🧠 **الذكاء الاصطناعي:** منشن البوت في أي رسالة وسيرد عليك فوراً! يتذكر محادثاتك ويتعلم منها.',
        };
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ content: guides[id] || '❓ غير معروف', ephemeral: true }).catch(() => {});
        }
        return;
    }

    // ❌⭕ Tic-Tac-Toe
    if (id.startsWith('ttt_')) {
        return _require('../commands/games/ttt')?.handleTicTacToeInteraction(interaction);
    }

    // 🪨📄✂️ Rock Paper Scissors
    if (id.startsWith('rps_')) {
        return _require('../commands/games/rps')?.handleRPSInteraction(interaction);
    }

    // 😵 Hangman
    if (id.startsWith('hangman_')) {
        return _require('../commands/games/hangman')?.handleHangmanInteraction(interaction);
    }

    // 🧠 Memory Match
    if (id.startsWith('memory_')) {
        return _require('../commands/games/memory')?.handleMemoryInteraction(interaction);
    }

    // ➕ Math
    if (id.startsWith('math_')) {
        return _require('../commands/games/math')?.handleMathInteraction(interaction);
    }

    // 🔮 Fortune
    if (id.startsWith('fortune_')) {
        return _require('../commands/fun/fun-buttons')?.fortune?.handleFortuneInteraction(interaction);
    }

    // 🤔 Would You Rather
    if (id.startsWith('wyr_')) {
        return _require('../commands/fun/fun-buttons')?.wyr?.handleWYRInteraction(interaction);
    }

    // 💘 Ship
    if (id.startsWith('ship_')) {
        return _require('../commands/fun/fun-buttons')?.ship?.handleShipInteraction(interaction);
    }

    // 🎲 Roll
    if (id.startsWith('roll_')) {
        return _require('../commands/fun/fun-buttons')?.roll?.handleRollInteraction(interaction);
    }

    // 🔮 8ball
    if (id.startsWith('ball_')) {
        return _require('../commands/fun/fun-buttons')?.ball?.handleBallInteraction(interaction);
    }

    // 💹 Market
    if (id.startsWith('market_') || id.startsWith('mkt_')) {
        const m = _require('../commands/economy/market');
        return m?.handleMarketInteraction?.(interaction);
    }

    // 🎯 Mini-Games (من القائمة الرئيسية)
    if (id.startsWith('mg_')) {
        const minigames = _require('../commands/games/minigames');
        if (!minigames) return _safeAck(interaction);
        if (id === 'mg_bomb')  return minigames.execute(interaction.message, ['bomb']);
        if (id === 'mg_speed') return minigames.execute(interaction.message, ['speed']);
        if (id === 'mg_chain') return minigames.execute(interaction.message, ['chain']);
        return _safeAck(interaction);
    }

    // 🏅 Achievements
    if (id.startsWith('ach_')) {
        const m = _require('../commands/main/achievements-cmd');
        return m?.handleAchievementsInteraction?.(interaction);
    }

    // 📊 Analytics
    if (id.startsWith('analytics_') || id.startsWith('anal_')) {
        const m = _require('../commands/main/analytics');
        return m?.handleAnalyticsInteraction?.(interaction);
    }

    // Punishments
    if (id.startsWith('remove_')) {
        return _require('../utils/punishments')?.handlePunishmentButton(interaction);
    }

    // Shop buy buttons (قبل أزرار shop_ العامة)
    if (id.startsWith('buy_')) {
        return _require('../commands/economy/shop')?.handleShopButton(interaction);
    }

    // Property
    if (id.startsWith('prop_')) {
        return _require('../commands/economy/property')?.handlePropertyInteraction(interaction);
    }

    // Help
    if (id.startsWith('help_')) {
        return _require('../commands/main/help')?.handleHelpInteraction(interaction);
    }

    // Trivia difficulty
    if (id.startsWith('trivia_diff_')) {
        return _require('../commands/games/trivia')?.handleTriviaInteraction(interaction);
    }

    // Casino Blackjack
    if (id.startsWith('bj_')) {
        return _require('../commands/economy/casino')?.handleBlackjackButton(interaction);
    }

    // Color roles (colorole_)
    if (id.startsWith('colorole_')) {
        return _require('../commands/moderation/color-roles')?.handleColorButton(interaction);
    }

    // Clan buttons
    if (id.startsWith('clan:')) {
        const parts = id.split(':');
        const [, action, clanId, guildId, rank = 'member'] = parts;
        return _require('../commands/social/clans')?.handleInviteResponse(interaction, action, clanId, guildId, rank);
    }
    if (id.startsWith('clan_')) {
        return _handleClanButton(interaction, id);
    }

    // Status buttons (owner)
    if (id.startsWith('status_btn_')) {
        return _require('../commands/main/status')?.handleStatusInteraction(interaction);
    }

    // Menu buttons
    if (id.startsWith('menu_')) {
        return _require('../commands/main/menu')?.handleMenuInteraction(interaction);
    }

    // Economy leaderboard standalone
    if (id === 'eco_leaderboard') {
        return _require('../commands/economy/economy-hub')?.handleEcoButton(interaction);
    }

    // Economy dashboard (econ_)
    if (id.startsWith('econ_')) {
        return _require('../commands/economy/balance')?.handleEconomyInteraction(interaction);
    }

    // Admin buttons
    if (id.startsWith('admin_') || id.startsWith('adm_')) {
        return _require('../commands/moderation/panel')?.handleAdminInteraction(interaction);
    }

    // Profile — يُدار بـ collector، إذا وصل هنا الجلسة انتهت
    if (id.startsWith('prof_')) {
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({
                content: '⌛ انتهت مدة هذه الجلسة. اكتب `بروفايل` من جديد لعرض ملفك الشخصي.',
                ephemeral: true
            }).catch(() => {});
        }
        return;
    }

    // Owner Dashboard
    if (id.startsWith('owner_')) {
        return _require('../commands/main/owner-dashboard')?.handleOwnerInteraction(interaction);
    }

    // Games Hub
    if (id.startsWith('game_') || id.startsWith('flip_') || id === 'games_back') {
        return _require('../commands/games/games-hub')?.handleGameButton(interaction);
    }

    // Word Guess (Wordle) — زر الاستسلام
    if (id.startsWith('wg_give_up_')) {
        const targetUserId = id.replace('wg_give_up_', '');
        if (interaction.user.id !== targetUserId) {
            return interaction.reply({ content: '❌ هذه اللعبة مو إلك يخوي!', ephemeral: true });
        }
        return interaction.reply({
            content: '🏳️ استسلمت! اكتب `خمّن` في الدردشة لتستسلم رسمياً.',
            ephemeral: true,
        });
    }


    // Economy Hub (eco_)
    if (id.startsWith('eco_')) {
        return _require('../commands/economy/economy-hub')?.handleEcoButton(interaction);
    }

    // Shop (sbuy_, shop_, buy_ handled above)
    if (id.startsWith('sbuy_') || id.startsWith('shop_') || id === 'shop_inv') {
        return _require('../commands/economy/shop')?.handleShopButton(interaction);
    }

    // Leaderboard
    if (id.startsWith('lb_')) {
        return _require('../commands/main/leaderboard')?.handleLeaderboardButton(interaction);
    }

    // Company
    if (id.startsWith('comp_')) {
        return _require('../commands/economy/company')?.handleCompanyInteraction(interaction);
    }

    // Daily
    if (id.startsWith('daily_')) {
        const m = _require('../commands/economy/daily');
        return m?.handleDailyInteraction?.(interaction);
    }

    // Work
    if (id.startsWith('work_')) {
        const m = _require('../commands/economy/work');
        return m?.handleWorkInteraction?.(interaction);
    }

    // Marry / Divorce
    if (id.startsWith('marry_') || id.startsWith('married_')) {
        const m = _require('../commands/social/marry');
        return m?.handleMarryInteraction?.(interaction);
    }

    // Moderation confirmation (mod_confirm_, mod_cancel_)
    if (id.startsWith('mod_confirm_') || id.startsWith('mod_cancel_')) {
        return _require('../commands/moderation/mod-buttons')?.handleModButton(interaction);
    }

    // Guide navigation
    if (id.startsWith('guide_')) {
        if (id === 'guide_economy') {
            const ecoHub = _require('../commands/economy/economy-hub');
            if (ecoHub) {
                const panel = await ecoHub.buildMainPanel(interaction.user.id, interaction.client);
                if (!interaction.replied && !interaction.deferred) {
                    return interaction.reply({ ...panel, ephemeral: false }).catch(() => {});
                } else {
                    return interaction.editReply({ ...panel }).catch(() => {});
                }
            }
        }
        // Guide جلسة انتهت
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ content: '⌛ انتهت مدة هذه الجلسة. اكتب الأمر من جديد.', ephemeral: true }).catch(() => {});
        }
        return;
    }

    // Fastest Clicker gift — يُدار بـ collector في random-interactions.js
    if (id === 'fast_click_gift' || id.startsWith('ignore_')) {
        await _safeAck(interaction);
        return;
    }

    // ── زر غير معروف ─────────────────────────────────────────────────────────
    if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({ content: '⚙️ هذا الزر لا يعمل في الوقت الحالي.', ephemeral: true }).catch(() => {});
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// CLAN BUTTON SUB-HANDLER
// ─────────────────────────────────────────────────────────────────────────────
async function _handleClanButton(interaction, id) {
    const clans = _require('../commands/social/clans');
    if (!clans) return _safeAck(interaction);

    if (id === 'clan_create_btn')        return clans.showCreateModal(interaction);
    if (id === 'clan_my_dashboard')      return clans.showDashboard_interaction(interaction);
    if (id === 'clan_list_btn')          return clans.showClanList(interaction);
    if (id === 'clan_invite_btn')        return clans.handleInviteButton(interaction);
    if (id === 'clan_leave_btn')         return clans.handleLeave(interaction);
    if (id === 'clan_delete_btn')        return clans.handleDissolve(interaction);
    if (id === 'clan_confirm_delete')    return clans.handleConfirmDissolve(interaction);
    if (id === 'clan_kick_btn')          return clans.handleKickButton(interaction);
    if (id === 'clan_desc_btn')          return clans.handleDescButton(interaction);
    if (id === 'clan_edit_rank_btn')     return clans.handleEditRankButton(interaction);
    if (id === 'clan_rename_btn')        return clans.handleRenameButton(interaction, null);
    if (id === 'clan_cancel_delete') {
        if (!interaction.replied && !interaction.deferred) {
            return interaction.reply({ content: '❌ تم إلغاء العملية.', ephemeral: true }).catch(() => {});
        }
        return;
    }
    if (id.startsWith('clan_rename_')) {
        const clanId = id.replace('clan_rename_', '');
        return clans.handleRenameButton(interaction, clanId);
    }
    if (id.startsWith('clan_settings_') || id.startsWith('clan_members_')) {
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ content: '🛠️ هذا الخيار قيد التطوير...', ephemeral: true }).catch(() => {});
        }
        return;
    }

    // clan_ غير معروف
    await _safeAck(interaction);
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/** رد صامت لمنع "This interaction failed" */
async function _safeAck(interaction) {
    try {
        if (!interaction.replied && !interaction.deferred) {
            await interaction.deferUpdate();
        }
    } catch { /* تجاهل أخطاء 10062 وما شابه */ }
}

/** رد بخطأ إذا لم يُرد بعد */
async function _safeReplyError(interaction, msg) {
    try {
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ content: msg, ephemeral: true });
        } else if (interaction.deferred) {
            await interaction.editReply({ content: msg });
        }
    } catch { /* تجاهل إذا انتهت صلاحية الـ interaction */ }
}
