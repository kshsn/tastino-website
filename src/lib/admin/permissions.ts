import type { Role } from '@prisma/client';

/** The parts of the admin panel. Each role may open only the ones listed for it (US-007.4). */
export type Area = 'dashboard' | 'users' | 'audit' | 'content' | 'leads' | 'settings' | 'retention';

const ALL_AREAS: readonly Area[] = ['dashboard', 'users', 'audit', 'content', 'leads', 'settings', 'retention'];

const ACCESS: Record<Role, readonly Area[]> = {
  SUPER_ADMIN: ALL_AREAS,
  CONTENT_EDITOR: ['dashboard', 'content', 'settings'],
  SALES: ['dashboard', 'leads'],
};

/** A missing or unknown role gets nothing: it is never treated as a default role. */
export function can(role: string | null | undefined, area: Area): boolean {
  if (!role || !Object.prototype.hasOwnProperty.call(ACCESS, role)) return false;
  return ACCESS[role as Role].includes(area);
}

export const allowedAreas = (role: string | null | undefined): Area[] => ALL_AREAS.filter((a) => can(role, a));

export const ROLE_LABEL: Record<Role, string> = {
  SUPER_ADMIN: 'Super admin',
  CONTENT_EDITOR: 'Content editor',
  SALES: 'Sales',
};

export const ROLES: readonly Role[] = ['SUPER_ADMIN', 'CONTENT_EDITOR', 'SALES'];
