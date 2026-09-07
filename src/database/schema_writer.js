const fs = require('fs');
const sql1 = 'CREATE TABLE IF NOT EXISTS users (user_id TEXT PRIMARY KEY, balance INTEGER NOT NULL DEFAULT 1000, bank INTEGER NOT NULL DEFAULT 0, bank_cap INTEGER NOT NULL DEFAULT 0, xp INTEGER NOT NULL DEFAULT 0, level INTEGER NOT NULL DEFAULT 1, daily_streak INTEGER NOT NULL DEFAULT 0, warnings INTEGER NOT NULL DEFAULT 0, last_daily INTEGER, last_weekly INTEGER, last_work INTEGER, last_rob INTEGER, jail_time INTEGER, mute_time INTEGER, married_to TEXT, married_since INTEGER, color TEXT, birthday TEXT, reputation INTEGER NOT NULL DEFAULT 0, last_rep INTEGER, vault INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL DEFAULT (unixepoch()), updated_at INTEGER NOT NULL DEFAULT (unixepoch()))';
const sql2 = 'CREATE TABLE IF NOT EXISTS user_stats (user_id TEXT PRIMARY KEY, games_played INTEGER NOT NULL DEFAULT 0, games_won INTEGER NOT NULL DEFAULT 0, total_wagered INTEGER NOT NULL DEFAULT 0, total_won INTEGER NOT NULL DEFAULT 0, biggest_win INTEGER NOT NULL DEFAULT 0, total_earned INTEGER NOT NULL DEFAULT 0, total_spent INTEGER NOT NULL DEFAULT 0, messages_sent INTEGER NOT NULL DEFAULT 0, commands_used INTEGER NOT NULL DEFAULT 0)';
const sql3 = 'CREATE TABLE IF NOT EXISTS inventory (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id TEXT NOT NULL, item_id TEXT NOT NULL, quantity INTEGER NOT NULL DEFAULT 1, purchased_at INTEGER NOT NULL DEFAULT (unixepoch()), expires_at INTEGER, UNIQUE(user_id, item_id))';
const sql4 = 'CREATE TABLE IF NOT EXISTS transactions (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id TEXT NOT NULL, type TEXT NOT NULL, amount INTEGER NOT NULL, description TEXT, created_at INTEGER NOT NULL DEFAULT (unixepoch()))';
const sql5 = 'CREATE TABLE IF NOT EXISTS achievements (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id TEXT NOT NULL, achievement_id TEXT NOT NULL, earned_at INTEGER NOT NULL DEFAULT (unixepoch()), UNIQUE(user_id, achievement_id))';
const sql6 = "CREATE TABLE IF NOT EXISTS guilds (guild_id TEXT PRIMARY KEY, bank_channel TEXT, jail_role TEXT, mute_role TEXT, log_channel TEXT, punishments_channel TEXT, games_channel TEXT, welcome_channel TEXT, setup_complete INTEGER NOT NULL DEFAULT 0, prefix TEXT NOT NULL DEFAULT '!', language TEXT NOT NULL DEFAULT 'ar', economy_enabled INTEGER NOT NULL DEFAULT 1, games_enabled INTEGER NOT NULL DEFAULT 1, ai_enabled INTEGER NOT NULL DEFAULT 1, auto_mod_enabled INTEGER NOT NULL DEFAULT 1, anti_spam_enabled INTEGER NOT NULL DEFAULT 1, anti_link_enabled INTEGER NOT NULL DEFAULT 0, anti_caps_enabled INTEGER NOT NULL DEFAULT 1, anti_raid_enabled INTEGER NOT NULL DEFAULT 1, created_at INTEGER NOT NULL DEFAULT (unixepoch()), updated_at INTEGER NOT NULL DEFAULT (unixepoch()))";
const sql7 = 'CREATE TABLE IF NOT EXISTS disabled_commands (guild_id TEXT NOT NULL, command TEXT NOT NULL, disabled_by TEXT, disabled_at INTEGER NOT NULL DEFAULT (unixepoch()), PRIMARY KEY (guild_id, command))';
const sql8 = 'CREATE TABLE IF NOT EXISTS clans (clan_id TEXT PRIMARY KEY, guild_id TEXT NOT NULL, name TEXT NOT NULL, description TEXT, leader_id TEXT NOT NULL, icon TEXT, color TEXT, xp INTEGER NOT NULL DEFAULT 0, level INTEGER NOT NULL DEFAULT 1, treasury INTEGER NOT NULL DEFAULT 0, text_channel_id TEXT, voice_channel_id TEXT, admin_channel_id TEXT, created_at INTEGER NOT NULL DEFAULT (unixepoch()), updated_at INTEGER NOT NULL DEFAULT (unixepoch()))';
const sql9 = "CREATE TABLE IF NOT EXISTS clan_members (clan_id TEXT NOT NULL, user_id TEXT NOT NULL, guild_id TEXT NOT NULL, rank TEXT NOT NULL DEFAULT 'member', joined_at INTEGER NOT NULL DEFAULT (unixepoch()), PRIMARY KEY (clan_id, user_id))";
const sql10 = 'CREATE TABLE IF NOT EXISTS custom_responses (id INTEGER PRIMARY KEY AUTOINCREMENT, guild_id TEXT NOT NULL, trigger TEXT NOT NULL, response TEXT NOT NULL, exact_match INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL DEFAULT (unixepoch()))';
const idxes = [
  'CREATE INDEX IF NOT EXISTS idx_inventory_user ON inventory(user_id)',
  'CREATE INDEX IF NOT EXISTS idx_transactions_user ON transactions(user_id)',
  'CREATE INDEX IF NOT EXISTS idx_transactions_time ON transactions(created_at DESC)',
  'CREATE INDEX IF NOT EXISTS idx_achievements_user ON achievements(user_id)',
  'CREATE INDEX IF NOT EXISTS idx_clans_guild ON clans(guild_id)',
  'CREATE INDEX IF NOT EXISTS idx_clan_members_user ON clan_members(user_id)',
  'CREATE INDEX IF NOT EXISTS idx_clan_members_guild ON clan_members(guild_id)',
  'CREATE INDEX IF NOT EXISTS idx_custom_resp_guild ON custom_responses(guild_id)',
  'CREATE INDEX IF NOT EXISTS idx_disabled_cmds_guild ON disabled_commands(guild_id)',
].join('; ');
const allSql = [sql1,sql2,sql3,sql4,sql5,sql6,sql7,sql8,sql9,sql10].join('; ') + '; ' + idxes + ';';
const code = "'use strict';\nfunction initializeSchema(db) {\n    db.pragma('journal_mode = WAL');\n    db.pragma('foreign_keys = ON');\n    db.pragma('synchronous = NORMAL');\n    db.pragma('cache_size = -64000');\n    db.exec(" + JSON.stringify(allSql) + ");\n    console.log('[Schema] All tables ready (SQLite WAL Mode)');\n}\nmodule.exports = { initializeSchema };\n";
fs.writeFileSync('src/database/schema.js', code, 'utf8');
console.log('Written!');
