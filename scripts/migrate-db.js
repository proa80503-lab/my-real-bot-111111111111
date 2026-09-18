'use strict';

/**
 * One-time migration from data/economy.json to MongoDB.
 * Required environment variable: MONGODB_URI
 */

require('dotenv').config();

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const { User, Guild } = require('../src/database/models');

const jsonPath = path.join(__dirname, '../data/economy.json');
const backupPath = `${jsonPath}.migrated.bak`;

function normalizeInventory(inventory) {
    if (Array.isArray(inventory)) return inventory;
    if (!inventory || typeof inventory !== 'object') return [];

    return Object.entries(inventory).map(([itemId, item]) => ({
        itemId,
        quantity: Number(item?.quantity) > 0 ? Number(item.quantity) : 1,
        expiresAt: item?.expiresAt || null,
    }));
}

function toUser(userId, user) {
    return {
        ...user,
        userId,
        inventory: normalizeInventory(user.inventory),
        stats: { ...(user.stats || {}) },
        achievements: Array.isArray(user.achievements) ? user.achievements : [],
        transactions: Array.isArray(user.transactions) ? user.transactions.slice(0, 50) : [],
    };
}

function toGuild(guildId, guild) {
    return { ...guild, guildId };
}

async function migrate() {
    if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is not configured');
    if (!fs.existsSync(jsonPath)) {
        console.log('[Migrate] No economy.json found; nothing to migrate.');
        return;
    }

    const raw = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    const users = Object.entries(raw.users || {});
    const guilds = Object.entries(raw.guilds || {});

    await mongoose.connect(process.env.MONGODB_URI);

    for (const [userId, user] of users) {
        await User.updateOne({ userId }, { $set: toUser(userId, user) }, { upsert: true });
    }
    for (const [guildId, guild] of guilds) {
        await Guild.updateOne({ guildId }, { $set: toGuild(guildId, guild) }, { upsert: true });
    }

    fs.copyFileSync(jsonPath, backupPath);
    console.log(`[Migrate] Imported ${users.length} users and ${guilds.length} guilds into MongoDB.`);
    console.log(`[Migrate] Backup saved to ${backupPath}`);
}

migrate()
    .catch(error => {
        console.error('[Migrate] Failed:', error.message);
        process.exitCode = 1;
    })
    .finally(async () => {
        if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
    });
