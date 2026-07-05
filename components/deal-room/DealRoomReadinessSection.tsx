import { StyleSheet, Text, View } from 'react-native';

import { FieldPreview, PrimaryButton } from '@/components/ui/Primitives';
import { TestFlightCard } from '@/components/testflight/TestFlightCard';
import { colors, radii, spacing } from '@/constants/theme';
import type { DiscussionRoom } from '@/types/InvestmentFlow';
import { safeCurrency, safePercent } from '@/utils/safeFormat';

type DealRoomReadinessSectionProps = {
  room: DiscussionRoom;
  participantRole: 'founder' | 'investor' | null;
  isSavingTestFlight: boolean;
  onReady: (role: 'founder' | 'investor') => void;
  onToggleTestFlight: (nextReady: boolean) => void;
  onGenerateAgreement: () => void;
};

export function DealRoomReadinessSection({
  room,
  participantRole,
  isSavingTestFlight,
  onReady,
  onToggleTestFlight,
  onGenerateAgreement,
}: DealRoomReadinessSectionProps) {
  return (
    <View style={styles.wrap}>
      <View style={styles.summary}>
        <Text style={styles.title}>{room.startupName}</Text>
        <View style={styles.grid}>
          <FieldPreview label="Founder" value={room.founderName} />
          <FieldPreview label="Angel Investor" value={room.investorName} />
          <FieldPreview label="Investment Amount" value={safeCurrency(room.investmentAmount)} />
          <FieldPreview label="Allocation" value={safePercent(room.investorAllocation)} />
        </View>
      </View>

      <TestFlightCard
        room={room}
        role={participantRole}
        isSaving={isSavingTestFlight}
        onToggle={onToggleTestFlight}
      />

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Readiness</Text>
        <View style={styles.readyRow}>
          <ReadyBadge label="Founder Ready" ready={room.founderReady} />
          <ReadyBadge label="Investor Ready" ready={room.investorReady} />
        </View>
        <View style={styles.actions}>
          <PrimaryButton
            label="Founder Ready"
            variant="secondary"
            onPress={() => onReady('founder')}
            disabled={participantRole !== 'founder' || room.founderReady}
          />
          <PrimaryButton
            label="Investor Ready"
            variant="secondary"
            onPress={() => onReady('investor')}
            disabled={participantRole !== 'investor' || room.investorReady}
          />
        </View>
        {(room.founderReady || room.investorReady) && room.status !== 'ready' ? (
          <Text style={styles.waiting}>Waiting for the other party.</Text>
        ) : null}
        {room.founderReady && room.investorReady ? (
          <PrimaryButton label="Generate Agreement" onPress={onGenerateAgreement} />
        ) : null}
      </View>
    </View>
  );
}

function ReadyBadge({ label, ready }: { label: string; ready: boolean }) {
  return (
    <View style={[styles.readyBadge, ready ? styles.readyBadgeActive : null]}>
      <Text style={styles.readyLabel}>{label}</Text>
      <Text style={styles.readyValue}>{ready ? 'Ready' : 'Pending'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.sm,
    paddingBottom: spacing.sm,
  },
  summary: {
    backgroundColor: colors.panel,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    gap: spacing.sm,
    marginHorizontal: spacing.md,
    padding: spacing.md,
  },
  title: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '900',
  },
  grid: {
    gap: spacing.md,
  },
  card: {
    backgroundColor: colors.panel,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    gap: spacing.sm,
    marginHorizontal: spacing.md,
    padding: spacing.md,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
  },
  readyRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  readyBadge: {
    borderColor: 'rgba(216, 201, 163, 0.24)',
    borderRadius: radii.md,
    borderWidth: 1,
    flex: 1,
    gap: 4,
    padding: spacing.sm,
  },
  readyBadgeActive: {
    backgroundColor: 'rgba(200, 162, 74, 0.08)',
    borderColor: colors.accent,
  },
  readyLabel: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  readyValue: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
  },
  actions: {
    gap: spacing.sm,
  },
  waiting: {
    color: colors.muted,
    lineHeight: 20,
  },
});
