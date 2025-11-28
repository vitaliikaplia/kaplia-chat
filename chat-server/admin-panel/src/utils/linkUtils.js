/**
 * Convert URLs in text to clickable links
 */
export function linkify(text) {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);

  return parts.map((part, index) => {
    if (part.match(urlRegex)) {
      return {
        type: 'link',
        url: part,
        key: index,
      };
    }
    return {
      type: 'text',
      content: part,
      key: index,
    };
  });
}

/**
 * Check if text contains URLs
 */
export function hasLinks(text) {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  return urlRegex.test(text);
}
