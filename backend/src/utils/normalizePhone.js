const COUNTRY_CODE = '234';
const NATIONAL_LENGTH = 10; // Nigeria national significant number length

export function normalizePhone(value) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  const digits = trimmed.replace(/\D/g, '');
  if (!digits) return null;

  let normalized = null;

  if (digits.startsWith('0') && digits.length === NATIONAL_LENGTH + 1) {
    normalized = COUNTRY_CODE + digits.slice(1);
  } else if (digits.startsWith(COUNTRY_CODE) && digits.length === COUNTRY_CODE.length + NATIONAL_LENGTH) {
    normalized = digits;
  } else if (digits.length === NATIONAL_LENGTH) {
    normalized = COUNTRY_CODE + digits;
  } else {
    return null;
  }

  if (!normalized.startsWith(COUNTRY_CODE) || normalized.length !== COUNTRY_CODE.length + NATIONAL_LENGTH) {
    return null;
  }

  return `+${normalized}`;
}
