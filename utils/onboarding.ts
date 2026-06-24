import type { ActiveRole, User } from '@/types/User';
import { getActiveRole } from '@/utils/roles';

export function appRouteForRole(role: ActiveRole | null | undefined) {
  return role === 'founder' ? '/deck' : '/investor-feed';
}

export function appRouteForProfile(profile: User | null | undefined) {
  return appRouteForRole(getActiveRole(profile));
}

export function shouldShowChoosePath(profile: User | null | undefined) {
  return !!profile && profile.hasChosenPath !== true;
}
