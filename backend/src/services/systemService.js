import { db } from '../config/db.js';

const DEFAULT_MESSAGE = "Kindly be patient with us. There's a maintenance going on, which will be resolved shortly.";

let inMemoryState = {
  maintenance: false,
  message: DEFAULT_MESSAGE,
  officers_revoked_at: null,
  loadedAt: 0
};

export async function getSetting(key, defaultValue = null) {
  try {
    const rows = await db.query(
      'SELECT setting_value FROM system_settings WHERE setting_key = ?',
      [key]
    );
    if (rows && rows.length > 0) {
      return rows[0].setting_value;
    }
    return defaultValue;
  } catch (err) {
    console.error('Failed to fetch system setting:', key, err.message);
    return defaultValue;
  }
}

export async function setSetting(key, value) {
  try {
    await db.query(
      `INSERT INTO system_settings (setting_key, setting_value)
       VALUES (?, ?)
       ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
      [key, String(value)]
    );
  } catch (err) {
    console.error('Failed to set system setting:', key, err.message);
    throw err;
  }
}

export async function getMaintenanceStatus(forceRefresh = false) {
  const now = Date.now();
  // Cache for 2 seconds unless forced
  if (!forceRefresh && (now - inMemoryState.loadedAt < 2000)) {
    return {
      maintenance: inMemoryState.maintenance,
      message: inMemoryState.message,
      officers_revoked_at: inMemoryState.officers_revoked_at
    };
  }

  const modeVal = await getSetting('maintenance_mode', 'false');
  const messageVal = await getSetting('maintenance_message', DEFAULT_MESSAGE);
  const revokedVal = await getSetting('officers_revoked_at', null);

  const maintenance = modeVal === 'true';
  const officers_revoked_at = revokedVal ? Number(revokedVal) : null;

  inMemoryState = {
    maintenance,
    message: messageVal || DEFAULT_MESSAGE,
    officers_revoked_at,
    loadedAt: now
  };

  return {
    maintenance,
    message: inMemoryState.message,
    officers_revoked_at
  };
}

export async function setMaintenanceMode({ enabled, message }) {
  const current = await getMaintenanceStatus(true);
  const nextEnabled = Boolean(enabled);
  const nextMessage = (message && typeof message === 'string' && message.trim())
    ? message.trim()
    : (current.message || DEFAULT_MESSAGE);

  await setSetting('maintenance_mode', nextEnabled ? 'true' : 'false');
  await setSetting('maintenance_message', nextMessage);

  let nextRevokedAt = current.officers_revoked_at;
  if (nextEnabled && !current.maintenance) {
    // Maintenance toggled from OFF to ON -> set revocation timestamp (aligned to second boundary matching JWT iat)
    nextRevokedAt = Math.floor(Date.now() / 1000) * 1000;
    await setSetting('officers_revoked_at', String(nextRevokedAt));
  }

  inMemoryState = {
    maintenance: nextEnabled,
    message: nextMessage,
    officers_revoked_at: nextRevokedAt,
    loadedAt: Date.now()
  };

  return {
    maintenance: nextEnabled,
    message: nextMessage,
    officers_revoked_at: nextRevokedAt
  };
}
