'use strict';
const mongoose = require('mongoose');

// ─── Users Schema ────────────────────────────────────────────────────────
const userSchema = new mongoose.Schema({
    userId: { type: String, required: true, unique: true },
    balance: { type: Number, default: 1000 },
    bank: { type: Number, default: 0 },
    bankCap: { type: Number, default: 0 },
    xp: { type: Number, default: 0 },
    level: { type: Number, default: 1 },
    dailyStreak: { type: Number, default: 0 },
    warnings: { type: Number, default: 0 },
    lastDaily: { type: Number, default: null },
    lastWeekly: { type: Number, default: null },
    lastWork: { type: Number, default: null },
    lastRob: { type: Number, default: null },
    jailTime: { type: Number, default: null },
    muteTime: { type: Number, default: null },
    marriedTo: { type: String, default: null },
    marriedSince: { type: Number, default: null },
    color: { type: String, default: null },
    birthday: { type: String, default: null },
    reputation: { type: Number, default: 0 },
    lastRep: { type: Number, default: null },
    vault: { type: Number, default: 0 },
    vaultCap: { type: Number, default: 0 },
    bankExtensions: { type: Number, default: 0 },
    robShieldUntil: { type: Number, default: null },
    robImmunity: { type: Boolean, default: false },
    vipBadge: { type: Boolean, default: false },
    xpBoostUntil: { type: Number, default: null },
    dailyBoostUntil: { type: Number, default: null },
    profileColor: { type: String, default: null },
    investments: { type: mongoose.Schema.Types.Mixed, default: {} },
    
    // Stats (كانت في جدول منفصل)
    stats: {
        gamesPlayed: { type: Number, default: 0 },
        gamesWon: { type: Number, default: 0 },
        totalWagered: { type: Number, default: 0 },
        totalWon: { type: Number, default: 0 },
        biggestWin: { type: Number, default: 0 }
    },
    
    // Inventory (كانت في جدول منفصل)
    inventory: [{
        itemId: { type: String },
        quantity: { type: Number, default: 1 },
        expiresAt: { type: Number, default: null }
    }],
    
    // Achievements
    achievements: [{ type: String }],
    
    // Transactions
    transactions: [{
        type: { type: String },
        amount: { type: Number },
        description: { type: String },
        timestamp: { type: Number, default: () => Date.now() }
    }]
}, { timestamps: true, strict: false });

// ─── Guilds Schema ───────────────────────────────────────────────────────
const guildSchema = new mongoose.Schema({
    guildId: { type: String, required: true, unique: true },
    bankChannel: String,
    jailRole: String,
    muteRole: String,
    logChannel: String,
    punishmentsChannel: String,
    gamesChannel: String,
    welcomeChannel: String,
    colorChannelId: String,
    colorMessageId: String,
    logChannelId: String,
    protectionSettings: { type: Object, default: {} },
    
    welcomeImage: String,
    welcomeAvatarX: { type: Number, default: 0 },
    welcomeAvatarY: { type: Number, default: 0 },
    welcomeAvatarSize: { type: Number, default: 128 },
    welcomeAvatarRadius: { type: Number, default: 50 },
    
    setupComplete: { type: Boolean, default: false },
    prefix: { type: String, default: '!' },
    language: { type: String, default: 'ar' },
    economyEnabled: { type: Boolean, default: true },
    gamesEnabled: { type: Boolean, default: true },
    aiEnabled: { type: Boolean, default: true },
    autoModEnabled: { type: Boolean, default: true },
    antiSpamEnabled: { type: Boolean, default: true },
    antiLinkEnabled: { type: Boolean, default: false },
    antiCapsEnabled: { type: Boolean, default: true },
    antiRaidEnabled: { type: Boolean, default: true }
}, { timestamps: true });

// ─── Bot Settings Schema ─────────────────────────────────────────────────
const botSettingsSchema = new mongoose.Schema({
    key: { type: String, required: true, unique: true },
    value: { type: mongoose.Schema.Types.Mixed }
});

// ─── Web Sessions Schema ─────────────────────────────────────────────────
const webSessionSchema = new mongoose.Schema({
    token: { type: String, required: true, unique: true },
    userId: { type: String, required: true },
    username: { type: String, required: true },
    avatar: String,
    role: { type: String, default: 'server_owner' },
    guildId: String,
    expiresAt: { type: Number, required: true },
    createdAt: { type: Number, default: () => Date.now() }
});

// ─── Clans Schema ────────────────────────────────────────────────────────
const clanSchema = new mongoose.Schema({
    clanId: { type: String, required: true, unique: true },
    guildId: { type: String, required: true },
    name: { type: String, required: true },
    description: String,
    leaderId: { type: String, required: true },
    icon: String,
    color: String,
    xp: { type: Number, default: 0 },
    level: { type: Number, default: 1 },
    treasury: { type: Number, default: 0 },
    textChannelId: String,
    voiceChannelId: String,
    adminChannelId: String,
    members: [{
        userId: { type: String },
        rank: { type: String, default: 'member' },
        joinedAt: { type: Number, default: () => Date.now() }
    }]
}, { timestamps: true });

module.exports = {
    User: mongoose.model('User', userSchema),
    Guild: mongoose.model('Guild', guildSchema),
    BotSetting: mongoose.model('BotSetting', botSettingsSchema),
    WebSession: mongoose.model('WebSession', webSessionSchema),
    Clan: mongoose.model('Clan', clanSchema)
};
