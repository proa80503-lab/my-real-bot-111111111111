'use strict';

// Compatibility facade: MongoDB is the only persistence layer.
const core = require('../src/database/db');

function inventoryToObject(inventory) {
    if (!Array.isArray(inventory)) return inventory || {};

    return Object.fromEntries(
        inventory
            .map(item => {
                const itemId = item.itemId || item.id;
                return itemId ? [itemId, { ...item, id: itemId }] : null;
            })
            .filter(Boolean)
    );
}

function inventoryToArray(inventory) {
    if (Array.isArray(inventory)) return inventory;
    if (!inventory || typeof inventory !== 'object') return [];

    return Object.entries(inventory).map(([itemId, item]) => ({
        itemId,
        quantity: Number(item?.quantity) > 0 ? Number(item.quantity) : 1,
        expiresAt: item?.expiresAt || null,
    }));
}

function toLegacyUser(user) {
    return { ...user, inventory: inventoryToObject(user.inventory) };
}

function getUserData(userId) {
    return toLegacyUser(core.getUserData(userId));
}

function updateUserData(userId, data) {
    const normalized = { ...data };
    if (Object.prototype.hasOwnProperty.call(normalized, 'inventory')) {
        normalized.inventory = inventoryToArray(normalized.inventory);
    }
    return toLegacyUser(core.updateUserData(userId, normalized));
}

function updateFields(userId, fields) {
    return updateUserData(userId, fields);
}

function loadDatabase() {
    const users = {};
    for (const [userId, user] of Object.entries(core.getAllUsers())) {
        users[userId] = toLegacyUser(user);
    }
    return { users, guilds: core.getAllGuilds() };
}

module.exports = {
    ...core,
    getUserData,
    updateUserData,
    updateFields,
    setUserData: updateUserData,
    loadDatabase,
};