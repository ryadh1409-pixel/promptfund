import type { ActiveRole, User, UserRole } from '@/types/User';

export function getRoleBadgeLabel(role: UserRole) {
  if (role === 'founder' || role === 'entrepreneur') {
    return 'Founder Badge';
  }

  if (role === 'investor' || role === 'angel_investor') {
    return 'Investor Badge';
  }

  return 'Admin';
}

export function getActiveRole(profile: Pick<User, 'activeRole' | 'roles' | 'role'> | null | undefined): ActiveRole | null {
  if (!profile) {
    return null;
  }

  if (profile.activeRole) {
    return profile.activeRole;
  }

  if (profile.roles?.[0]) {
    return profile.roles[0];
  }

  if (profile.role === 'entrepreneur' || profile.role === 'founder') {
    return 'founder';
  }

  if (profile.role === 'angel_investor' || profile.role === 'investor' || profile.role === 'admin') {
    return 'investor';
  }

  return null;
}

export function getRoleTitle(role: ActiveRole | UserRole | null | undefined) {
  if (role === 'founder' || role === 'entrepreneur') {
    return 'Founder';
  }

  if (role === 'investor' || role === 'angel_investor') {
    return 'Angel Investor';
  }

  return 'Admin';
}

export function isInvestorRole(role: UserRole | undefined) {
  return role === 'investor' || role === 'angel_investor' || role === 'admin';
}

export function isEntrepreneurRole(role: UserRole | undefined) {
  return role === 'founder' || role === 'entrepreneur';
}
