'use strict';

function initializeSchema(db) {
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    db.pragma('synchronous = NORMAL');
    db.pragma('cache_size = -64000');

    // ─── Users ───────────────────────────────────────────────────────────────
    db.exec(`CREATE TABLE IF NOT EXISTS users (
        user_id TEXT PRIMARY KEY,
        balance INTEGER NOT NULL DEFAULT 1000,
        bank INTEGER NOT NULL DEFAULT 0,
        bank_cap INTEGER NOT NULL DEFAULT 0,
        xp INTEGER NOT NULL DEFAULT 0,
        level INTEGER NOT NULL DEFAULT 1,
        daily_streak INTEGER NOT NULL DEFAULT 0,
        warnings INTEGER NOT NULL DEFAULT 0,
        last_daily INTEGER,
        last_weekly INTEGER,
        last_work INTEGER,
        last_rob INTEGER,
        jail_time INTEGER,
        mute_time INTEGER,
        married_to TEXT,
        married_since INTEGER,
        color TEXT,
        birthday TEXT,
        reputation INTEGER NOT NULL DEFAULT 0,
        last_rep INTEGER,
        vault INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL DEFAULT (unixepoch()),
        updated_at INTEGER NOT NULL DEFAULT (unixepoch())
    )`);

    db.exec(`CREATE TABLE IF NOT EXISTS user_stats (
        user_id TEXT PRIMARY KEY,
        games_played INTEGER NOT NULL DEFAULT 0,
        games_won INTEGER NOT NULL DEFAULT 0,
        total_wagered INTEGER NOT NULL DEFAULT 0,
        total_won INTEGER NOT NULL DEFAULT 0,
        biggest_win INTEGER NOT NULL DEFAULT 0,
        total_earned INTEGER NOT NULL DEFAULT 0,
        total_spent INTEGER NOT NULL DEFAULT 0,
        messages_sent INTEGER NOT NULL DEFAULT 0,
        commands_used INTEGER NOT NULL DEFAULT 0
    )`);

    db.exec(`CREATE TABLE IF NOT EXISTS inventory (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        item_id TEXT NOT NULL,
        quantity INTEGER NOT NULL DEFAULT 1,
        purchased_at INTEGER NOT NULL DEFAULT (unixepoch()),
        expires_at INTEGER,
        UNIQUE(user_id, item_id)
    )`);

    db.exec(`CREATE TABLE IF NOT EXISTS transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        type TEXT NOT NULL,
        amount INTEGER NOT NULL,
        description TEXT,
        created_at INTEGER NOT NULL DEFAULT (unixepoch())
    )`);

    db.exec(`CREATE TABLE IF NOT EXISTS achievements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        achievement_id TEXT NOT NULL,
        earned_at INTEGER NOT NULL DEFAULT (unixepoch()),
        UNIQUE(user_id, achievement_id)
    )`);

    // ─── Guilds — مع إعدادات Color, Log, Protection ────────────────────────
    db.exec(`CREATE TABLE IF NOT EXISTS guilds (
        guild_id TEXT PRIMARY KEY,
        bank_channel TEXT,
        jail_role TEXT,
        mute_role TEXT,
        log_channel TEXT,
        punishments_channel TEXT,
        games_channel TEXT,
        welcome_channel TEXT,
        -- نظام الألوان
        color_channel_id TEXT,
        color_message_id TEXT,
        -- نظام اللوق
        log_channel_id TEXT,
        -- إعدادات الحماية (JSON)
        protection_settings TEXT NOT NULL DEFAULT '{}',
        -- إعدادات عامة
        setup_complete INTEGER NOT NULL DEFAULT 0,
        prefix TEXT NOT NULL DEFAULT '!',
        language TEXT NOT NULL DEFAULT 'ar',
        economy_enabled INTEGER NOT NULL DEFAULT 1,
        games_enabled INTEGER NOT NULL DEFAULT 1,
        ai_enabled INTEGER NOT NULL DEFAULT 1,
        auto_mod_enabled INTEGER NOT NULL DEFAULT 1,
        anti_spam_enabled INTEGER NOT NULL DEFAULT 1,
        anti_link_enabled INTEGER NOT NULL DEFAULT 0,
        anti_caps_enabled INTEGER NOT NULL DEFAULT 1,
        anti_raid_enabled INTEGER NOT NULL DEFAULT 1,
        created_at INTEGER NOT NULL DEFAULT (unixepoch()),
        updated_at INTEGER NOT NULL DEFAULT (unixepoch())
    )`);

    // ─── Migration: إضافة columns جديدة لو الجدول موجود بالفعل ──────────────
    const guildCols = db.prepare("PRAGMA table_info(guilds)").all().map(c => c.name);
    if (!guildCols.includes('color_channel_id'))
        db.exec("ALTER TABLE guilds ADD COLUMN color_channel_id TEXT");
    if (!guildCols.includes('color_message_id'))
        db.exec("ALTER TABLE guilds ADD COLUMN color_message_id TEXT");
    if (!guildCols.includes('log_channel_id'))
        db.exec("ALTER TABLE guilds ADD COLUMN log_channel_id TEXT");
    if (!guildCols.includes('protection_settings'))
        db.exec("ALTER TABLE guilds ADD COLUMN protection_settings TEXT NOT NULL DEFAULT '{}'");

    // ─── Clans ───────────────────────────────────────────────────────────────
    db.exec(`CREATE TABLE IF NOT EXISTS clans (
        clan_id TEXT PRIMARY KEY,
        guild_id TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        leader_id TEXT NOT NULL,
        icon TEXT,
        color TEXT,
        xp INTEGER NOT NULL DEFAULT 0,
        level INTEGER NOT NULL DEFAULT 1,
        treasury INTEGER NOT NULL DEFAULT 0,
        text_channel_id TEXT,
        voice_channel_id TEXT,
        admin_channel_id TEXT,
        created_at INTEGER NOT NULL DEFAULT (unixepoch()),
        updated_at INTEGER NOT NULL DEFAULT (unixepoch())
    )`);

    db.exec(`CREATE TABLE IF NOT EXISTS clan_members (
        clan_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        guild_id TEXT NOT NULL,
        rank TEXT NOT NULL DEFAULT 'member',
        joined_at INTEGER NOT NULL DEFAULT (unixepoch()),
        PRIMARY KEY (clan_id, user_id)
    )`);

    db.exec(`CREATE TABLE IF NOT EXISTS custom_responses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        guild_id TEXT NOT NULL,
        trigger TEXT NOT NULL,
        response TEXT NOT NULL,
        exact_match INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL DEFAULT (unixepoch())
    )`);

    db.exec(`CREATE TABLE IF NOT EXISTS disabled_commands (
        guild_id TEXT NOT NULL,
        command TEXT NOT NULL,
        disabled_by TEXT,
        disabled_at INTEGER NOT NULL DEFAULT (unixepoch()),
        PRIMARY KEY (guild_id, command)
    )`);

    // ─── Web Sessions — للـ Server Owner OAuth ────────────────────────────
    db.exec(`CREATE TABLE IF NOT EXISTS web_sessions (
        token TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        username TEXT NOT NULL,
        avatar TEXT,
        role TEXT NOT NULL DEFAULT 'server_owner',
        guild_id TEXT,
        expires_at INTEGER NOT NULL,
        created_at INTEGER NOT NULL DEFAULT (unixepoch())
    )`);

    // ─── Indexes ─────────────────────────────────────────────────────────────
    db.exec(`
        CREATE INDEX IF NOT EXISTS idx_inventory_user ON inventory(user_id);
        CREATE INDEX IF NOT EXISTS idx_transactions_user ON transactions(user_id);
        CREATE INDEX IF NOT EXISTS idx_transactions_time ON transactions(created_at DESC);
        CREATE INDEX IF NOT EXISTS idx_achievements_user ON achievements(user_id);
        CREATE INDEX IF NOT EXISTS idx_clans_guild ON clans(guild_id);
        CREATE INDEX IF NOT EXISTS idx_clan_members_user ON clan_members(user_id);
        CREATE INDEX IF NOT EXISTS idx_clan_members_guild ON clan_members(guild_id);
        CREATE INDEX IF NOT EXISTS idx_custom_resp_guild ON custom_responses(guild_id);
        CREATE INDEX IF NOT EXISTS idx_disabled_cmds_guild ON disabled_commands(guild_id);
        CREATE INDEX IF NOT EXISTS idx_web_sessions_user ON web_sessions(user_id);
    `);

    console.log('[Schema] ✅ All tables ready (SQLite WAL Mode) — Color/Log/Protection fields added');
}

module.exports = { initializeSchema };
