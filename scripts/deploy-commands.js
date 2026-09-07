'use strict';

/**
 * scripts/deploy-commands.js
 * Deploys slash commands to Discord
 * Usage:
 *   node scripts/deploy-commands.js          -> Deploy globally (up to 1hr)
 *   node scripts/deploy-commands.js guild    -> Deploy to test guild (instant)
 */

require('dotenv').config();
const { REST, Routes, ApplicationCommandType } = require('discord.js');
const path = require('path');
const fs   = require('fs');

const config = require('../config');
const token = process.env.TOKEN || config.token;
const clientId = process.env.CLIENT_ID || config.clientId;
const testGuildId = process.env.TEST_GUILD_ID || config.testGuildId;

if (!token || !clientId) {
    console.error('[Deploy] Missing TOKEN or CLIENT_ID in config/env');
    process.exit(1);
}

// Load all commands
function loadAllCommands() {
    const cmdsDir = path.join(__dirname, '../commands');
    const commands = [];

    function walk(dir) {
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
            const full = path.join(dir, entry.name);
            if (entry.isDirectory()) { walk(full); continue; }
            if (!entry.name.endsWith('.js')) continue;
            try {
                const cmd = require(full);
                if (cmd.slash) {
                    commands.push({
                        name:        cmd.slash.name        || cmd.name,
                        description: cmd.slash.description || cmd.description || 'No description',
                        type:        ApplicationCommandType.ChatInput,
                        options:     cmd.slash.options || [],
                        ...(cmd.slash.defaultMemberPermissions !== undefined && { defaultMemberPermissions: cmd.slash.defaultMemberPermissions }),
                    });
                }
            } catch (e) {
                console.warn('[Deploy] Skipped', entry.name, '-', e.message);
            }
        }
    }

    walk(cmdsDir);
    return commands;
}

async function deploy() {
    const deployToGuild = process.argv[2] === 'guild';
    const commands = loadAllCommands();

    if (!commands.length) {
        console.log('[Deploy] No slash commands found. Add a "slash" property to any command file.');
        return;
    }

    console.log(`[Deploy] Found ${commands.length} slash commands:`);
    commands.forEach(c => console.log(' -', '/' + c.name));

    const rest = new REST({ version: '10' }).setToken(token);

    try {
        if (deployToGuild) {
            if (!testGuildId) {
                console.error('[Deploy] TEST_GUILD_ID not set - cannot deploy to guild');
                process.exit(1);
            }
            await rest.put(Routes.applicationGuildCommands(clientId, testGuildId), { body: commands });
            console.log(`[Deploy] Deployed ${commands.length} commands to guild ${testGuildId} (instant)`);
        } else {
            await rest.put(Routes.applicationCommands(clientId), { body: commands });
            console.log(`[Deploy] Deployed ${commands.length} global commands (may take up to 1hr)`);
        }
    } catch (err) {
        console.error('[Deploy] Error:', err.message);
        process.exit(1);
    }
}

deploy();
