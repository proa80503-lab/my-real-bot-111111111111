'use strict';

/**
 * handlers/slashHandler.js
 * Registers and manages Slash Commands globally + per-guild
 * Supports dual-mode: commands work as both prefix AND slash simultaneously
 */

const { REST, Routes, ApplicationCommandType } = require('discord.js');
const path = require('path');
const fs   = require('fs');

const config = require('../config');

/**
 * Collects all slash command definitions from commands/ directory
 * A command opts-in by exporting a `slash` object with name + description
 */
function collectSlashData(commandsMap) {
    const slashData = [];

    for (const [, cmd] of commandsMap) {
        if (!cmd.slash) continue;

        const def = {
            name:        cmd.slash.name        || cmd.name,
            description: cmd.slash.description || cmd.description || 'No description',
            type:        ApplicationCommandType.ChatInput,
        };

        if (cmd.slash.options?.length) {
            def.options = cmd.slash.options;
        }

        if (cmd.slash.defaultMemberPermissions !== undefined) {
            def.defaultMemberPermissions = cmd.slash.defaultMemberPermissions;
        }

        if (cmd.slash.dmPermission !== undefined) {
            def.dmPermission = cmd.slash.dmPermission;
        }

        slashData.push(def);
    }

    return slashData;
}

/**
 * Deploys slash commands to Discord API
 * @param {import('discord.js').Client} client
 * @param {Map} commandsMap - the bot commands map
 * @param {string} [guildId] - if provided, deploys to a specific guild (instant); otherwise global (1hr delay)
 */
async function deploySlashCommands(client, commandsMap, guildId) {
    const token = process.env.TOKEN || config.token;
    if (!token) {
        console.error('[SlashHandler] No token found - cannot deploy slash commands');
        return;
    }

    const slashData = collectSlashData(commandsMap);
    if (!slashData.length) {
        console.warn('[SlashHandler] No slash commands found to deploy');
        return;
    }

    const rest = new REST({ version: '10' }).setToken(token);

    try {
        console.log(`[SlashHandler] Deploying ${slashData.length} slash commands...`);

        const route = guildId
            ? Routes.applicationGuildCommands(client.user.id, guildId)
            : Routes.applicationCommands(client.user.id);

        await rest.put(route, { body: slashData });

        if (guildId) {
            console.log(`[SlashHandler] Deployed ${slashData.length} guild commands to ${guildId}`);
        } else {
            console.log(`[SlashHandler] Deployed ${slashData.length} global commands (up to 1hr to appear)`);
        }
    } catch (err) {
        console.error('[SlashHandler] Deploy error:', err.message);
        throw err;
    }
}

/**
 * Handles incoming slash command interactions
 * Routes to the matching command's executeSlash() or execute() method
 * @param {import('discord.js').ChatInputCommandInteraction} interaction
 * @param {Map} commandsMap
 */
async function handleSlashCommand(interaction, commandsMap) {
    if (!interaction.isChatInputCommand()) return;

    const commandName = interaction.commandName;

    // Find matching command (by slash.name or command name)
    let cmd = null;
    for (const [, c] of commandsMap) {
        if (c.slash?.name === commandName || c.name === commandName) {
            cmd = c;
            break;
        }
    }

    if (!cmd) {
        return interaction.reply({
            content: 'Command not found.',
            ephemeral: true,
        });
    }

    try {
        // Check if command has dedicated slash handler
        if (typeof cmd.executeSlash === 'function') {
            await cmd.executeSlash(interaction);
        } else if (typeof cmd.execute === 'function') {
            // Build a compatibility wrapper so old message-based execute() works with slash
            const args = buildArgsFromSlash(interaction);
            const msgLike = buildMessageLike(interaction);
            await cmd.execute(msgLike, args);
        } else {
            await interaction.reply({ content: 'This command has no executor.', ephemeral: true });
        }
    } catch (err) {
        console.error(`[SlashHandler] Error executing /${commandName}:`, err.message);
        const errMsg = { content: 'An error occurred while executing this command.', ephemeral: true };
        if (interaction.deferred || interaction.replied) {
            await interaction.followUp(errMsg).catch(() => {});
        } else {
            await interaction.reply(errMsg).catch(() => {});
        }
    }
}

/**
 * Builds a flat args array from slash command options
 */
function buildArgsFromSlash(interaction) {
    const args = [];
    if (!interaction.options) return args;
    for (const option of (interaction.options.data || [])) {
        if (option.value !== undefined) args.push(String(option.value));
    }
    return args;
}

/**
 * Builds a message-like object for backward compatibility
 * This lets old prefix-style execute(message, args) work with slash commands
 */
function buildMessageLike(interaction) {
    return {
        // Core identifiers
        author:  interaction.user,
        member:  interaction.member,
        guild:   interaction.guild,
        channel: interaction.channel,
        client:  interaction.client,
        // Slash-aware reply
        reply:   (options) => interaction.replied || interaction.deferred
            ? interaction.followUp(options)
            : interaction.reply(options),
        // Compatibility shims
        mentions: {
            members: { first: () => null },
            users:   { first: () => null },
        },
        content: '',
        // Flag as slash interaction
        _isSlash:      true,
        _interaction:  interaction,
    };
}

module.exports = {
    collectSlashData,
    deploySlashCommands,
    handleSlashCommand,
    buildArgsFromSlash,
    buildMessageLike,
};
