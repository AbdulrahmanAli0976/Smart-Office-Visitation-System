export const USER_ROLES = {
  ADMIN: 'ADMIN',
  OFFICER: 'OFFICER'
};

export const ACTIVE_ROLES = new Set([
  USER_ROLES.ADMIN,
  USER_ROLES.OFFICER
]);

export const ADMIN_ROLES = new Set([
  USER_ROLES.ADMIN
]);

export const ATTENDANCE_ROLES = new Set([
  USER_ROLES.ADMIN,
  USER_ROLES.OFFICER
]);

export const OFFICER_ROLE_FILTER = `role = '${USER_ROLES.OFFICER}'`;
