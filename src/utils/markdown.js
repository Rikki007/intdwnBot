/**
 * Escape special characters for Telegram MarkdownV2
 */
const markdownV2Escape = (text) => {
    if (!text) return '';

    return (
        String(text)
            .replace(/([\\[\]()~>#+\-=|{}.!])/g, '\\$1')
            .replace(/([_])/g, '\\$1')
    );
};

module.exports = { markdownV2Escape };
