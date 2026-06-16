const { EmbedBuilder } = require('discord.js');
const config = require('../config');

/**
 * نظام Embeds احترافي موحد
 * يوفر templates جاهزة وألوان متناسقة
 */

// ألوان موحدة
const COLORS = {
    SUCCESS: '#00FF00',
    ERROR: '#FF0000',
    WARNING: '#FFA500',
    INFO: '#3498DB',
    PRIMARY: '#9B59B6',
    ECONOMY: '#FFD700',
    GAME: '#FF6B9D',
    LEVEL: '#00CED1',
    ADMIN: '#E74C3C',
    PREMIUM: '#F39C12'
};

// أيقونات موحدة
const ICONS = {
    SUCCESS: '✅',
    ERROR: '❌',
    WARNING: '⚠️',
    INFO: 'ℹ️',
    MONEY: '💰',
    LEVEL: '📊',
    TROPHY: '🏆',
    GAME: '🎮',
    GIFT: '🎁',
    CROWN: '👑',
    SHIELD: '🛡️',
    FIRE: '🔥',
    STAR: '⭐',
    DIAMOND: '💎',
    HEART: '❤️',
    LOADING: '⏳',
    CHECK: '✔️',
    CROSS: '✖️',
    ARROW_RIGHT: '➡️',
    ARROW_LEFT: '⬅️',
    STATUS_ON: '🟢 مفعّل',
    STATUS_OFF: '🔴 معطّل'
};

class PremiumEmbedBuilder {
    /**
     * تحويل الحالة إلى إيموجي ونص
     */
    static statusEmoji(enabled) {
        return enabled ? ICONS.STATUS_ON : ICONS.STATUS_OFF;
    }
    /**
     * إنشاء Embed نجاح
     */
    static success(title, description, fields = []) {
        const embed = new EmbedBuilder()
            .setColor(COLORS.SUCCESS)
            .setTitle(`${ICONS.SUCCESS} ${title}`)
            .setTimestamp();

        if (description) embed.setDescription(description);
        if (fields.length > 0) embed.addFields(fields);

        return embed;
    }

    /**
     * إنشاء Embed خطأ
     */
    static error(title, description, solution = null) {
        const embed = new EmbedBuilder()
            .setColor(COLORS.ERROR)
            .setTitle(`${ICONS.ERROR} ${title}`)
            .setTimestamp();

        if (description) embed.setDescription(description);

        if (solution && (typeof solution === 'string' ? solution.length > 0 : (Array.isArray(solution) ? solution.length > 0 : true))) {
            embed.addFields({
                name: `${ICONS.INFO} الحل`,
                value: String(solution)
            });
        }

        return embed;
    }

    /**
     * إنشاء Embed تحذير
     */
    static warning(title, description, fields = []) {
        const embed = new EmbedBuilder()
            .setColor(COLORS.WARNING)
            .setTitle(`${ICONS.WARNING} ${title}`)
            .setTimestamp();

        if (description) embed.setDescription(description);
        if (fields.length > 0) embed.addFields(fields);

        return embed;
    }

    /**
     * إنشاء Embed معلومات
     */
    static info(title, description, fields = []) {
        const embed = new EmbedBuilder()
            .setColor(COLORS.INFO)
            .setTitle(`${ICONS.INFO} ${title}`)
            .setTimestamp();

        if (description) embed.setDescription(description);
        if (fields.length > 0) embed.addFields(fields);

        return embed;
    }

    /**
     * Embed الاقتصاد
     */
    static economy(title, description, fields = [], userData = null) {
        const embed = new EmbedBuilder()
            .setColor(COLORS.ECONOMY)
            .setTitle(`${ICONS.MONEY} ${title}`)
            .setTimestamp();

        if (description) embed.setDescription(description);
        if (fields.length > 0) embed.addFields(fields);

        if (userData) {
            embed.setFooter({
                text: `رصيدك: ${userData.balance.toLocaleString()} ${config.currency} | البنك: ${userData.bank.toLocaleString()}`
            });
        }

        return embed;
    }

    /**
     * Embed اللعبة
     */
    static game(title, description, fields = []) {
        const embed = new EmbedBuilder()
            .setColor(COLORS.GAME)
            .setTitle(`${ICONS.GAME} ${title}`)
            .setTimestamp();

        if (description) embed.setDescription(description);
        if (fields.length > 0) embed.addFields(fields);

        return embed;
    }

    /**
     * Embed المستوى
     */
    static level(title, description, fields = [], levelInfo = null) {
        const embed = new EmbedBuilder()
            .setColor(COLORS.LEVEL)
            .setTitle(`${ICONS.LEVEL} ${title}`)
            .setTimestamp();

        if (description) embed.setDescription(description);
        if (fields.length > 0) embed.addFields(fields);

        if (levelInfo) {
            const progressBar = this.createProgressBar(levelInfo.percentage, 20);
            embed.addFields({
                name: 'التقدم',
                value: `${progressBar} ${levelInfo.percentage}%\n${levelInfo.currentXP}/${levelInfo.requiredXP} XP`
            });
        }

        return embed;
    }

    /**
     * Embed إداري
     */
    static admin(title, description, fields = [], moderator = null) {
        const embed = new EmbedBuilder()
            .setColor(COLORS.ADMIN)
            .setTitle(`${ICONS.SHIELD} ${title}`)
            .setTimestamp();

        if (description) embed.setDescription(description);
        if (fields.length > 0) embed.addFields(fields);

        if (moderator) {
            embed.setFooter({
                text: `بواسطة ${moderator.tag}`,
                iconURL: moderator.displayAvatarURL()
            });
        }

        return embed;
    }

    /**
     * Embed إشراف (Alias for admin/moderation commands)
     */
    static moderation(title, description, fields = [], moderator = null) {
        return this.admin(title, description, fields, moderator);
    }

    /**
     * Embed بريميوم
     */
    static premium(title, description, fields = []) {
        const embed = new EmbedBuilder()
            .setColor(COLORS.PREMIUM)
            .setTitle(`${ICONS.CROWN} ${title}`)
            .setDescription(`✨ **ميزة بريميوم** ✨\n\n${description}`)
            .setTimestamp();

        if (fields.length > 0) embed.addFields(fields);

        return embed;
    }

    /**
     * إنشاء شريط تقدم جميل
     */
    static createProgressBar(percentage, length = 10) {
        const filled = Math.round((percentage / 100) * length);
        const empty = length - filled;

        const filledBar = '█'.repeat(filled);
        const emptyBar = '░'.repeat(empty);

        return `${filledBar}${emptyBar}`;
    }

    /**
     * إنشاء قائمة مرقمة جميلة
     */
    static createNumberedList(items, startFrom = 1) {
        return items.map((item, index) => {
            const number = startFrom + index;
            const medal = number === 1 ? '🥇' : number === 2 ? '🥈' : number === 3 ? '🥉' : `${number}.`;
            return `${medal} ${item}`;
        }).join('\n');
    }

    /**
     * تنسيق الوقت المتبقي
     */
    static formatTime(milliseconds) {
        const seconds = Math.floor(milliseconds / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (days > 0) return `${days} يوم`;
        if (hours > 0) return `${hours} ساعة`;
        if (minutes > 0) return `${minutes} دقيقة`;
        return `${seconds} ثانية`;
    }

    /**
     * تنسيق الأرقام الكبيرة
     */
    static formatNumber(num) {
        if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
        if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
        return num.toLocaleString();
    }

    /**
     * Embed بصفحات (Pagination)
     */
    static createPaginated(items, itemsPerPage = 10, currentPage = 1) {
        const totalPages = Math.ceil(items.length / itemsPerPage);
        const start = (currentPage - 1) * itemsPerPage;
        const end = start + itemsPerPage;
        const pageItems = items.slice(start, end);

        return {
            items: pageItems,
            currentPage,
            totalPages,
            hasNext: currentPage < totalPages,
            hasPrev: currentPage > 1
        };
    }

    /**
     * Embed مخصص كامل
     */
    static custom(options) {
        const embed = new EmbedBuilder();

        if (options.color) embed.setColor(options.color);
        if (options.title) embed.setTitle(options.title);
        if (options.description) embed.setDescription(options.description);
        if (options.thumbnail) embed.setThumbnail(options.thumbnail);
        if (options.image) embed.setImage(options.image);
        if (options.author) embed.setAuthor(options.author);
        if (options.footer) embed.setFooter(options.footer);
        if (options.fields) embed.addFields(options.fields);
        if (options.timestamp !== false) embed.setTimestamp();
        if (options.url) embed.setURL(options.url);

        return embed;
    }

    /**
     * Embed loading/انتظار
     */
    static loading(message = 'جاري التحميل...') {
        return new EmbedBuilder()
            .setColor(COLORS.INFO)
            .setDescription(`${ICONS.LOADING} **${message}**`)
            .setTimestamp();
    }
}

// تصدير
module.exports = {
    PremiumEmbedBuilder,
    COLORS,
    ICONS
};
