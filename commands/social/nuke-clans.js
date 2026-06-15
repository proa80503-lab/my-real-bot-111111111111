/**
 * ═══════════════════════════════════════════════════════
 * 💥 إلغاء الكلانات — Nuke Clans
 * يحذف كل الكلانات مع رولاتها وقنواتها ويصفر البيانات
 * لمالك البوت فقط
 * ═══════════════════════════════════════════════════════
 */

'use strict';

const {
    EmbedBuilder, ActionRowBuilder, ButtonBuilder,
    ButtonStyle, MessageFlags
} = require('discord.js');

const clanManager = require('../../utils/clan-manager');
const clanAssets = require('../../utils/clan-assets');
const config = require('../../config');

module.exports = {
    name: 'حذف كلانات',
    aliases: [
        'حذف كلان',
        'إلغاء كلانات',
        'إلغاء كلان',
        'nuke-clans',
        'nuke_clans',
        'reset-clans',
    ],
    description: 'يحذف جميع الكلانات مع رولاتها وقنواتها (مالك البوت فقط)',
    usage: 'حذف كلانات',

    async execute(message) {
        // ──── فقط مالك البوت ───────────────────────────────
        if (message.author.id !== config.ownerId) {
            return message.reply('❌ هذا الأمر لمالك البوت فقط.');
        }

        const guildId = message.guild.id;
        const allClans = clanManager.getAllClans(guildId);

        if (allClans.length === 0) {
            return message.reply('✅ لا يوجد كلانات في هذا السيرفر أصلاً!');
        }

        // ──── رسالة تأكيد ─────────────────────────────────
        const confirmEmbed = new EmbedBuilder()
            .setColor('#FF0000')
            .setTitle('⚠️ تحذير نهائي — Nuke Clans')
            .setDescription([
                `سيتم حذف **${allClans.length}** كلان مع كل ما يتعلق بها:`,
                '',
                allClans.map(c => `• **${c.name}** (${c.stats?.totalMembers || 0} عضو)`).join('\n'),
                '',
                '**ما سيُحذف:**',
                '🗑️ جميع الرولات (قائد، نائب، ضابط، جندي)',
                '🗑️ جميع القنوات والكاتيقوري',
                '🗑️ كل بيانات الكلانات من قاعدة البيانات',
                '',
                '> **هذا الإجراء لا يمكن التراجع عنه!**'
            ].join('\n'))
            .setFooter({ text: 'لديك 30 ثانية للتأكيد' })
            .setTimestamp();

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('nuke_clans_confirm')
                .setLabel('✅ تأكيد الحذف الكامل')
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId('nuke_clans_cancel')
                .setLabel('❌ إلغاء')
                .setStyle(ButtonStyle.Secondary)
        );

        const reply = await message.reply({ embeds: [confirmEmbed], components: [row] });

        const collector = reply.createMessageComponentCollector({
            filter: i => i.user.id === message.author.id,
            time: 30_000,
            max: 1
        });

        collector.on('collect', async (i) => {
            if (i.customId === 'nuke_clans_cancel') {
                return i.update({
                    embeds: [new EmbedBuilder().setColor('#95A5A6').setDescription('❌ تم إلغاء العملية.')],
                    components: []
                });
            }

            // ──── بدء الحذف ───────────────────────────────
            await i.update({
                embeds: [new EmbedBuilder()
                    .setColor('#E74C3C')
                    .setTitle('⏳ جاري حذف الكلانات...')
                    .setDescription('يرجى الانتظار، يتم حذف الرولات والقنوات...')
                ],
                components: []
            });

            let deleted = 0;
            let failed = 0;
            const details = [];

            // ──── مرّ على كل كلان واحذف أصوله ─────────
            for (const clan of allClans) {
                try {
                    await clanAssets.deleteClanAssets(message.guild, clan);
                    deleted++;
                    details.push(`✅ ${clan.name}`);
                } catch (err) {
                    failed++;
                    details.push(`❌ ${clan.name} — ${err.message}`);
                }
            }

            // ──── امسح كل البيانات من JSON ────────────
            clanManager.clearGuild(guildId);

            // ──── رسالة النتيجة ───────────────────────
            const resultEmbed = new EmbedBuilder()
                .setColor(failed === 0 ? '#2ECC71' : '#E67E22')
                .setTitle('💥 Nuke Clans — اكتمل!')
                .setDescription([
                    `✅ **تم حذف:** ${deleted} كلان`,
                    failed > 0 ? `❌ **فشل:** ${failed} كلان` : '',
                    '',
                    '**التفاصيل:**',
                    details.join('\n'),
                    '',
                    '🗃️ تم تصفير بيانات الكلانات بالكامل.',
                    'السيرفر الآن خالٍ من الكلانات كأنه لم يكن فيه شيء! 🧹'
                ].filter(Boolean).join('\n'))
                .setTimestamp();

            await reply.edit({ embeds: [resultEmbed], components: [] });
        });

        collector.on('end', (collected) => {
            if (collected.size === 0) {
                reply.edit({
                    embeds: [new EmbedBuilder().setColor('#95A5A6').setDescription('⏰ انتهى الوقت، تم إلغاء العملية.')],
                    components: []
                }).catch(() => { });
            }
        });
    }
};
