const { EmbedBuilder } = require('discord.js');
const db = require('../../utils/database');
const config = require('../../config');
const { PremiumEmbedBuilder } = require('../../utils/embed-builder');

const activeAuctions = new Map();

function formatTime(ms) {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

module.exports = {
    name: 'auction',
    aliases: ['مزاد', 'مزايدة', 'مزايده'],
    description: 'نظام المزادات العلنية',
    usage: 'مزاد [قائمة/إنشاء/زايد]',

    async execute(message, args) {
        const action = args[0]?.toLowerCase();

        if (!action || action === 'list' || action === 'قائمة') {
            if (activeAuctions.size === 0) {
                return message.reply('❌ لا توجد مزادات نشطة حالياً!');
            }

            const fields = [];
            for (const [id, auction] of activeAuctions.entries()) {
                fields.push({
                    name: `#${id} - ${auction.item}`,
                    value: `أعلى مزايدة: **${auction.currentBid}** ${config.currency}\nينتهي في: ${formatTime(auction.endsAt - Date.now())}`,
                    inline: true
                });
            }

            const embed = PremiumEmbedBuilder.custom({
                color: '#F39C12',
                title: '🔨 المزادات النشطة',
                fields
            });

            embed.addFields({
                name: '💡 كيف تزايد',
                value: '`مزاد زايد <رقم> <مبلغ>`'
            });

            return message.reply({ embeds: [embed] });
        }

        if (action === 'create' || action === 'إنشاء') {
            const item = args.slice(1, -2).join(' ');
            const startBid = parseInt(args[args.length - 2]);
            const duration = parseInt(args[args.length - 1]);

            if (!item || isNaN(startBid) || isNaN(duration)) {
                return message.reply('❌ الاستخدام: `مزاد إنشاء <الغرض> <السعر الابتدائي> <المدة بالدقائق>`');
            }

            const auctionId = activeAuctions.size + 1;
            const endsAt = Date.now() + duration * 60 * 1000;

            activeAuctions.set(auctionId, {
                item,
                seller: message.author.id,
                currentBid: startBid,
                highestBidder: null,
                endsAt
            });

            setTimeout(() => {
                const auction = activeAuctions.get(auctionId);
                if (auction) {
                    if (auction.highestBidder) {
                        const sellerData = db.getUserData(auction.seller);
                        sellerData.balance += auction.currentBid;
                        db.updateUserData(auction.seller, sellerData);
                        message.channel.send(`🔨 انتهى المزاد #${auctionId} لمادة **${auction.item}**!\nالفائز: <@${auction.highestBidder}> بمزايدة **${auction.currentBid}** ${config.currency}`);
                    } else {
                        message.channel.send(`🔨 انتهى المزاد #${auctionId} لمادة **${auction.item}** بدون أي مزايدات.`);
                    }
                    activeAuctions.delete(auctionId);
                }
            }, duration * 60 * 1000);

            return message.reply(`✅ تم إنشاء مزاد #${auctionId} لـ **${item}** بنجاح!\nينتهي خلال ${duration} دقيقة.`);
        }

        if (action === 'bid' || action === 'زايد') {
            const auctionId = parseInt(args[1]);
            const bidAmount = parseInt(args[2]);

            if (!auctionId || isNaN(bidAmount)) {
                return message.reply('❌ الاستخدام: `مزاد زايد <رقم> <مبلغ>`');
            }

            const auction = activeAuctions.get(auctionId);
            if (!auction) return message.reply('❌ مزاد غير موجود!');

            if (bidAmount <= auction.currentBid) {
                return message.reply(`❌ يجب أن تكون المزايدة أكبر من المزايدة الحالية (**${auction.currentBid}** ${config.currency})!`);
            }

            const userData = db.getUserData(message.author.id);
            if (userData.balance < bidAmount) {
                return message.reply(`❌ ليس لديك رصيد كافٍ! رصيدك: ${userData.balance}`);
            }

            // Return money to previous bidder
            if (auction.highestBidder) {
                const prevBidder = db.getUserData(auction.highestBidder);
                prevBidder.balance += auction.currentBid;
                db.updateUserData(auction.highestBidder, prevBidder);
            }

            // Take money from new bidder
            userData.balance -= bidAmount;
            db.updateUserData(message.author.id, userData);

            auction.currentBid = bidAmount;
            auction.highestBidder = message.author.id;

            return message.reply(`✅ تم قبول مزايدتك! أنت الآن صاحب الرقم الأعلى بـ **${bidAmount}** ${config.currency}`);
        }
    }
};
