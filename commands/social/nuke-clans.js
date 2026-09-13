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

        // Always allow proceeding even if JSON says no clans, so the user can sweep orphaned roles.
        if (allClans.length === 0) {
            message.reply('⚠️ لا يوجد كلانات مسجلة في قاعدة البيانات، ولكن سيتم فحص ومسح أي قنوات أو رتب قديمة عالقة.');
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

            // ──── مسح الرتب والقنوات القديمة العالقة (Orphaned) ─────────
            let orphanedRoles = 0;
            let orphanedChannels = 0;
            
            try {
                const guildRoles = await message.guild.roles.fetch();
                for (const [id, role] of guildRoles) {
                    if (role.name.includes(' - قائد') || role.name.includes(' - نائب') || 
                        role.name.includes(' - ضابط') || role.name.includes(' - جندي') || 
                        role.name.includes('👑') || role.name.includes('⭐') || 
                        role.name.includes('🎖️') || role.name.includes('🛡️')) {
                        
                        // تجاهل الرتب الأساسية للسيرفر إذا كان اسمها يحتوي إيموجي صدفة
                        if (role.name.includes('قائد') || role.name.includes('نائب') || role.name.includes('ضابط') || role.name.includes('جندي')) {
                            await role.delete().catch(() => {});
                            orphanedRoles++;
                        }
                    }
                }
                
                const guildChannels = await message.guild.channels.fetch();
                for (const [id, ch] of guildChannels) {
                    if (ch.name.includes('🏰・') || ch.name.includes('💬・شات-') || 
                        ch.name.includes('⚙️・إدارة-') || ch.name.startsWith('🔊・') || 
                        ch.name.includes('الكلانات') || ch.name.includes('🏰 ══ الكلانات ══') ||
                        ch.name === '🏰┃الكلانات') {
                        await ch.delete().catch(() => {});
                        orphanedChannels++;
                    }
                }
            } catch (e) {
                console.error('Error sweeping orphaned assets:', e);
            }

            // ──── امسح كل البيانات من JSON ────────────
            clanManager.clearGuild(guildId);

            // ──── رسالة النتيجة ───────────────────────
            const resultEmbed = new EmbedBuilder()
                .setColor(failed === 0 ? '#2ECC71' : '#E67E22')
                .setTitle('💥 Nuke Clans — اكتمل!')
                .setDescription([
                    `✅ **تم حذف:** ${deleted} كلان مسجل`,
                    failed > 0 ? `❌ **فشل:** ${failed} كلان مسجل` : '',
                    '',
                    `🧹 **مسح إضافي:** تم حذف **${orphanedRoles}** رتبة قديمة و **${orphanedChannels}** قناة عالقة!`,
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
