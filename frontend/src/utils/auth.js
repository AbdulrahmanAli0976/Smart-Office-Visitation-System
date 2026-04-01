export function normalizeRole(role) {
  return typeof role === 'string' ? role.trim().toUpperCase() : '';
}

export function normalizeStatus(status) {
  return typeof status === 'string' ? status.trim().toUpperCase() : '';
}

export function normalizeUser(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const role = normalizeRole(raw.role);
  if (!role) return null;
  const status = normalizeStatus(raw.status);
  const parsedId = Number.isInteger(raw.id) ? raw.id : parseInt(raw.id, 10);
  return {
    ...raw,
    id: Number.isInteger(parsedId) ? parsedId : raw.id,
    role,
    status
  };
}
