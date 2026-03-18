export function isEmail(value) {
  return typeof value === 'string' && /.+@.+\..+/.test(value);
}

export function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

export function normalizePhone(value) {
  if (!value) return '';
  return String(value).replace(/\s+/g, '').trim();
}

export function sanitizeLike(value) {
  return String(value).replace(/[%_]/g, '\\$&');
}
