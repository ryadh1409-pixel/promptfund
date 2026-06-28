import type { ActiveRole, User } from '@/types/User';
import type { LegalDocumentVersions } from '@/types/User';
import { legalVersionsMatch } from '@/constants/legal';
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

export function shouldShowLegalOnboarding(profile: User | null | undefined, versions: LegalDocumentVersions | null | undefined) {
  if (!profile || !versions) {
    return false;
  }

  if (profile.legalAcceptance?.accepted === true) {
    return !legalVersionsMatch(profile.legalAcceptance, versions);
  }

  return profile.legalOnboardingRequired === true;
}
