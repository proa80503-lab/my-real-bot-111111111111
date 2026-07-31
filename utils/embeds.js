// utils/embeds.js
const { EmbedBuilder } = require('discord.js');

const FOOTER_TEXT = 'My Real Bot 🛠️';

/**
 * Create a success embed with a standard green color.
 * @param {string} title
 * @param {string} description
 * @returns {EmbedBuilder}
 */
function successEmbed(title, description) {
  return new EmbedBuilder()
    .setColor('#00FF00')
    .setTitle(title)
    .setDescription(description)
    .setFooter({ text: FOOTER_TEXT });
}

/**
 * Create an error embed with a standard red color.
 * @param {string} title
 * @param {string} description
 * @returns {EmbedBuilder}
 */
function errorEmbed(title, description) {
  return new EmbedBuilder()
    .setColor('#FF0000')
    .setTitle(title)
    .setDescription(description)
    .setFooter({ text: FOOTER_TEXT });
}

/**
 * Create an info embed with a neutral blue color.
 * @param {string} title
 * @param {string} description
 * @returns {EmbedBuilder}
 */
function infoEmbed(title, description) {
  return new EmbedBuilder()
    .setColor('#0099FF')
    .setTitle(title)
    .setDescription(description)
    .setFooter({ text: FOOTER_TEXT });
}

module.exports = { successEmbed, errorEmbed, infoEmbed };
