'use strict';

/**
 * migrate-db.js
 * Migrates economy.json -> SQLite (bot.db)
 * Run: node scripts/migrate-db.js
 */

const fs   = require('fs');
const path = require('path');

const jsonPath = path.join(__dirname, '../data/economy.json');
const bakPath  = path.join(__dirname, '../data/economy.json.migrated.bak');

if (!fs.existsSync(jsonPath)) {
    console.log('[Migrate] No economy.json found - nothing to migrate.');
    process.exit(0);
}

const db = require('../src/database/db');
const sqliteDb = db.getDb();

const rawData = fs.readFileSync(jsonPath, 'utf8');
let jsonData;
try { jsonData = JSON.parse(rawData); }
catch (e) { console.error('[Migrate] JSON parse error:', e.message); process.exit(1); }

const users  = jsonData.users  || {};
const guilds = jsonData.guilds || {};
console.log('[Migrate] Users:', Object.keys(users).length, '| Guilds:', Object.keys(guilds).length);

const toEpoch = (v) => v ? Math.floor(v / 1000) : null;

const insertUser  = sqliteDb.prepare(
    'INSERT OR IGNORE INTO users (user_id, balance, bank, bank_cap, xp, level, daily_streak, warnings, last_daily, last_weekly, last_work, last_rob, jail_time, mute_time, married_to, married_since, vault, reputation) VALUES (@user_id, @balance, @bank, @bank_cap, @xp, @level, @daily_streak, @warnings, @last_daily, @last_weekly, @last_work, @last_rob, @jail_time, @mute_time, @married_to, @married_since, @vault, @reputation)'
);
const insertStats = sqliteDb.prepare(
    'INSERT OR IGNORE INTO user_stats (user_id, games_played, games_won, total_wagered, total_won, biggest_win) VALUES (@user_id, @games_played, @games_won, @total_wagered, @total_won, @biggest_win)'
);
const insertInv = sqliteDb.prepare(
    'INSERT OR IGNORE INTO inventory (user_id, item_id, quantity) VALUES (@user_id, @item_id, @quantity)'
);
const insertAch = sqliteDb.prepare(
    'INSERT OR IGNORE INTO achievements (user_id, achievement_id) VALUES (@user_id, @achievement_id)'
);
const insertTxn = sqliteDb.prepare(
    'INSERT INTO transactions (user_id, type, amount, description, created_at) VALUES (@user_id, @type, @amount, @description, @created_at)'
);
const insertGuild = sqliteDb.prepare(
    'INSERT OR IGNORE INTO guilds (guild_id, bank_channel, jail_role, mute_role, log_channel, punishments_channel, games_channel, setup_complete) VALUES (@guild_id, @bank_channel, @jail_role, @mute_role, @log_channel, @punishments_channel, @games_channel, @setup_complete)'
);

const migrateAll = sqliteDb.transaction(() => {
    let userCount = 0;

    for (const [userId, u] of Object.entries(users)) {
        const stats = u.stats || {};
        const inv   = u.inventory || {};
        const achs  = u.achievements || [];
        const txns  = (u.transactions || []).slice(0, 25);

        insertUser.run({
            user_id:      userId,
            balance:      u.balance      || 0,
            bank:         u.bank         || 0,
            bank_cap:     u.bankCap      || 0,
            xp:           u.xp           || 0,
            level:        u.level        || 1,
            daily_streak: u.dailyStreak  || 0,
            warnings:     u.warnings     || 0,
            last_daily:   toEpoch(u.lastDaily),
            last_weekly:  toEpoch(u.lastWeekly),
            last_work:    toEpoch(u.lastWork),
            last_rob:     toEpoch(u.lastRob),
            jail_time:    toEpoch(u.jailTime),
            mute_time:    toEpoch(u.muteTime),
            married_to:   u.marriedTo || u.partner || null,
            married_since:toEpoch(u.marriedSince || u.marriageDate),
            vault:        u.vault        || 0,
            reputation:   u.reputation   || 0,
        });

        insertStats.run({
            user_id:       userId,
            games_played:  stats.gamesPlayed  || 0,
            games_won:     stats.gamesWon      || 0,
            total_wagered: stats.totalWagered  || 0,
            total_won:     stats.totalWon      || 0,
            biggest_win:   stats.biggestWin    || 0,
        });

        if (!Array.isArray(inv)) {
            for (const [itemId, item] of Object.entries(inv)) {
                if (item) insertInv.run({ user_id: userId, item_id: itemId, quantity: item.quantity || 1 });
            }
        }

        for (const achId of achs) {
            insertAch.run({ user_id: userId, achievement_id: achId });
        }

        for (const t of txns) {
            insertTxn.run({
                user_id:     userId,
                type:        t.type        || 'unknown',
                amount:      t.amount      || 0,
                description: t.description || '',
                created_at:  toEpoch(t.timestamp) || Math.floor(Date.now() / 1000),
            });
        }

        userCount++;
    }

    let guildCount = 0;
    for (const [guildId, g] of Object.entries(guilds)) {
        insertGuild.run({
            guild_id:            guildId,
            bank_channel:        g.bankChannel        || null,
            jail_role:           g.jailRole           || null,
            mute_role:           g.muteRole           || null,
            log_channel:         g.logChannel         || null,
            punishments_channel: g.punishmentsChannel || null,
            games_channel:       g.gamesChannel       || null,
            setup_complete:      g.setupComplete ? 1 : 0,
        });
        guildCount++;
    }

    return { userCount, guildCount };
});

try {
    const { userCount, guildCount } = migrateAll();
    console.log('[Migrate] SUCCESS! Users:', userCount, '| Guilds:', guildCount);
    fs.copyFileSync(jsonPath, bakPath);
    console.log('[Migrate] Backup saved to:', bakPath);
    console.log('[Migrate] Migration complete! Bot will now use SQLite.');
} catch (err) {
    console.error('[Migrate] FAILED:', err.message);
    process.exit(1);
}
