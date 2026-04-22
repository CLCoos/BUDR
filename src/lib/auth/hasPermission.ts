import type { Permission } from '@/lib/permissions';

export function hasPermission(permissions: Permission[], required: Permission): boolean {
  return permissions.includes(required);
}
