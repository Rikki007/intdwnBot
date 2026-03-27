/**
 * Escape special characters for Telegram MarkdownV2
 */
const markdownV2Escape = (text) => {
  if (!text) return '';
  return String(text)
    .replace(/[_*\[\]()~`>#+\-=|{}.!]/g, '\\$&'); // экранируем все спецсимволы MarkdownV2
};

module.exports = { markdownV2Escape };