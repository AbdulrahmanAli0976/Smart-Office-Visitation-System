export function isEmail(value) {
  return typeof value === 'string' && value.length < 255 && /.+@.+\..+/.test(value);
}

export function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * Basic text sanitization and length enforcement
 * @param {any} value 
 * @param {number} maxLength 
 * @returns {boolean}
 */
export function isSafeString(value, maxLength = 255) {
  if (typeof value !== 'string') return false;
  const trimmed = value.trim();
  return trimmed.length > 0 && trimmed.length <= maxLength;
}

export function sanitizeLike(value) {
  return String(value).replace(/[%_]/g, '\\$&');
}

/**
 * Basic HTML/Script tag removal for generic text input
 * @param {string} value 
 * @returns {string}
 */
export function sanitizeText(value) {
  if (typeof value !== 'string') return '';
  return value
    .trim()
    .replace(/<[^>]*>?/gm, '') // Remove HTML tags
    .slice(0, 500); // Hard limit for any single text field
}
