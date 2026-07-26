export function normalizeRole(role) {
  return typeof role === 'string' ? role.trim().toUpperCase() : '';
}

export function normalizeStatus(status) {
  return typeof status === 'string' ? status.trim().toUpperCase() : '';
}
