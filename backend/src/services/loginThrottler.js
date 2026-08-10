const failedAttemptsMap = new Map();
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes window for tracking

function getKey(ip, email) {
  const safeIp = ip || 'unknown_ip';
  const safeEmail = (email && typeof email === 'string')
    ? email.trim().toLowerCase()
    : 'unknown_email';
  return `login_attempt:${safeIp}:${safeEmail}`;
}

function cleanExpiredEntries() {
  const now = Date.now();
  for (const [key, record] of failedAttemptsMap.entries()) {
    if (now - record.lastAttemptAt > WINDOW_MS) {
      failedAttemptsMap.delete(key);
    }
  }
}

export function getFailedAttempts(ip, email) {
  cleanExpiredEntries();
  const key = getKey(ip, email);
  const record = failedAttemptsMap.get(key);
  if (!record) return 0;
  if (Date.now() - record.lastAttemptAt > WINDOW_MS) {
    failedAttemptsMap.delete(key);
    return 0;
  }
  return record.count;
}

export async function applyProgressiveDelay(ip, email) {
  const count = getFailedAttempts(ip, email);
  if (count >= 5) {
    await new Promise((resolve) => setTimeout(resolve, 2000));
  } else if (count === 4) {
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
}

export function recordFailedAttempt(ip, email) {
  cleanExpiredEntries();
  const key = getKey(ip, email);
  const record = failedAttemptsMap.get(key) || { count: 0, lastAttemptAt: 0 };
  const nextCount = record.count + 1;
  failedAttemptsMap.set(key, {
    count: nextCount,
    lastAttemptAt: Date.now()
  });
  return nextCount;
}

export function resetAttempts(ip, email) {
  const key = getKey(ip, email);
  failedAttemptsMap.delete(key);
}
