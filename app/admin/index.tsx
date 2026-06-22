import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Card, LoadingState, PrimaryButton, Screen, StatCard, ui } from '@/components/ui/Primitives';
import { colors } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { adminService } from '@/services/adminService';
import type { AgreementRoom } from '@/types/Agreement';
import type { Investment, Match } from '@/types/FundingRequest';
import type { Project } from '@/types/Project';
import type { BlockedUser, User, UserReport } from '@/types/User';
import { formatCurrency } from '@/utils/format';
import { getRoleBadgeLabel } from '@/utils/roles';
import { getFriendlyErrorMessage } from '@/services/errorHandler';

type AdminData = {
  users: User[];
  projects: Project[];
  investments: Investment[];
  matches: Match[];
  agreements: AgreementRoom[];
  reports: UserReport[];
  blockedUsers: BlockedUser[];
  revenue: number;
  portfolioVolume: number;
};

export default function AdminDashboardScreen() {
  const { authUser, initializing, profile } = useAuth();
  const [data, setData] = useState<AdminData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadAdminData() {
      if (profile?.role !== 'admin') {
        setIsLoading(false);
        return;
      }

      try {
        setError(null);
        setData(await adminService.getDashboardData());
      } catch (loadError) {
        setError(getFriendlyErrorMessage(loadError));
      } finally {
        setIsLoading(false);
      }
    }

    loadAdminData();
  }, [profile?.role]);

  if (!initializing && !authUser) {
    return <Redirect href="/login" />;
  }

  if (!initializing && profile && profile.role !== 'admin') {
    return <Redirect href="/profile" />;
  }

  async function handleUserStatus(userId: string, status: 'suspended' | 'banned') {
    try {
      setError(null);
      await adminService.updateUserStatus(userId, status);
      setData(await adminService.getDashboardData());
    } catch (statusError) {
      setError(getFriendlyErrorMessage(statusError));
    }
  }

  async function handleProjectStatus(projectId: string, status: Project['status']) {
    try {
      setError(null);
      await adminService.updateProjectStatus(projectId, status);
      setData(await adminService.getDashboardData());
    } catch (projectError) {
      setError(getFriendlyErrorMessage(projectError));
    }
  }

  async function handleResolveReport(reportId: string) {
    try {
      setError(null);
      await adminService.resolveReport(reportId);
      setData(await adminService.getDashboardData());
    } catch (reportError) {
      setError(getFriendlyErrorMessage(reportError));
    }
  }

  return (
    <Screen eyebrow="Admin" title="PromptFund Admin Dashboard" subtitle="Private operations console for trusted administrators.">
      {isLoading || !data ? <LoadingState label="Loading admin dashboard" /> : null}
      {error ? (
        <Card>
          <Text style={styles.errorText}>{error}</Text>
        </Card>
      ) : null}

      {data ? (
        <>
          <View style={ui.row}>
            <StatCard label="Users" value={String(data.users.length)} tone={colors.accent} />
            <StatCard label="Projects" value={String(data.projects.length)} tone={colors.luxuryGold} />
          </View>
          <View style={ui.row}>
            <StatCard label="Investments" value={String(data.investments.length)} />
            <StatCard label="Matches" value={String(data.matches.length)} tone={colors.success} />
          </View>

          <AdminSection title="Users">
            {data.users.slice(0, 8).map((user) => (
              <Card key={user.id}>
                <Text style={styles.itemTitle}>{user.displayName ?? user.name}</Text>
                <Text style={styles.itemMeta}>{user.username ?? user.handle} · {user.status ?? 'active'} · {getRoleBadgeLabel(user.role)}</Text>
                <View style={ui.wrap}>
                  <PrimaryButton label="Suspend user" variant="secondary" onPress={() => handleUserStatus(user.id, 'suspended')} />
                  <PrimaryButton label="Ban user" variant="secondary" onPress={() => handleUserStatus(user.id, 'banned')} />
                  <PrimaryButton label="Delete profile" variant="secondary" onPress={() => adminService.deleteUserProfile(user.id)} />
                </View>
              </Card>
            ))}
          </AdminSection>

          <AdminSection title="Projects">
            {data.projects.slice(0, 8).map((project) => (
              <Card key={project.id}>
                <Text style={styles.itemTitle}>{project.title}</Text>
                <Text style={styles.itemMeta}>{project.status} · {formatCurrency(project.goalAmount)}</Text>
                <View style={ui.wrap}>
                  <PrimaryButton label="Approve project" variant="secondary" onPress={() => handleProjectStatus(project.id, 'funding')} />
                  <PrimaryButton label="Reject project" variant="secondary" onPress={() => handleProjectStatus(project.id, 'building')} />
                </View>
              </Card>
            ))}
          </AdminSection>

          <AdminSection title="Investments">
            <Card>
              <Text style={styles.itemTitle}>{formatCurrency(data.portfolioVolume)} total platform volume</Text>
              <Text style={styles.itemMeta}>{data.agreements.length} agreement rooms · {data.matches.length} matches · {data.investments.length} investments</Text>
            </Card>
          </AdminSection>

          <AdminSection title="Revenue">
            <Card>
              <Text style={styles.itemTitle}>{formatCurrency(data.revenue)} estimated platform revenue</Text>
              <Text style={styles.itemMeta}>{formatCurrency(data.portfolioVolume)} total platform volume</Text>
            </Card>
          </AdminSection>

          <AdminSection title="Reports">
            {data.reports.slice(0, 8).map((report) => (
              <Card key={report.id}>
                <Text style={styles.itemTitle}>{report.reason}</Text>
                <Text style={styles.itemMeta}>{report.reportedUid} · {report.status}</Text>
                <PrimaryButton label="Resolve report" variant="secondary" onPress={() => handleResolveReport(report.id)} />
              </Card>
            ))}
          </AdminSection>

          <AdminSection title="Blocked Users">
            <Card>
              <Text style={styles.itemTitle}>{data.blockedUsers.length} active blocks</Text>
              <Text style={styles.itemMeta}>Blocked users cannot message, invest, search, or interact.</Text>
            </Card>
          </AdminSection>

          <AdminSection title="Analytics">
            <Card>
              <Text style={styles.itemTitle}>Platform health</Text>
              <Text style={styles.itemMeta}>
                {data.users.length} users · {data.projects.length} projects · {data.reports.filter((report) => report.status === 'open').length} open reports
              </Text>
            </Card>
          </AdminSection>
        </>
      ) : null}
    </Screen>
  );
}

function AdminSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: 12,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '900',
  },
  itemTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '900',
  },
  itemMeta: {
    color: colors.muted,
    lineHeight: 22,
  },
  errorText: {
    color: colors.danger,
    lineHeight: 22,
  },
});
