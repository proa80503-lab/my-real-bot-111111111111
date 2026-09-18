'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const mongoDb = require('../src/database/db');
const legacyDb = require('../utils/database');

test('MongoDB database exposes the compatibility API', () => {
    assert.equal(typeof mongoDb.getUserData, 'function');
    assert.equal(typeof mongoDb.getAllGuilds, 'function');
    assert.equal(typeof legacyDb.getUserData, 'function');
    assert.equal(typeof legacyDb.setUserData, 'function');
});

test('money operations reject invalid amounts without touching storage', () => {
    assert.equal(mongoDb.addMoney('test-invalid-amount', 0), 0);
    assert.equal(mongoDb.addMoney('test-invalid-amount', -10), 0);
    assert.equal(mongoDb.removeMoney('test-invalid-amount', 0), false);
    assert.equal(mongoDb.transferMoney('same-user', 'same-user', 10), false);
});

test('legacy loadDatabase reads the MongoDB cache interface', () => {
    const snapshot = legacyDb.loadDatabase();
    assert.equal(typeof snapshot.users, 'object');
    assert.equal(typeof snapshot.guilds, 'object');
});
