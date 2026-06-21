import type { UserRole } from '@/types/User';

export function getRoleBadgeLabel(role: UserRole) {
  if (role === 'entrepreneur') {
    return 'Entrepreneur Badge';
  }

  if (role === 'investor') {
    return 'Angel Investor Badge';
  }

  return 'Admin';
}

export function isInvestorRole(role: UserRole | undefined) {
  return role === 'investor' || role === 'admin';
}

export function isEntrepreneurRole(role: UserRole | undefined) {
  return role === 'entrepreneur';
}
