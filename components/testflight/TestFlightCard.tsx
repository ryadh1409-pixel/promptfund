import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/ui/Primitives';
import { colors, radii, spacing } from '@/constants/theme';
import type { DiscussionRoom } from '@/types/InvestmentFlow';

type TestFlightRole = 'founder' | 'investor';

export function TestFlightCard({
  room,
  role,
  isSaving,
  onToggle,
}: {
  room: DiscussionRoom;
  role: TestFlightRole | null;
  isSaving?: boolean;
  onToggle: (nextReady: boolean) => void | Promise<void>;
}) {
  const founderReady = room.founderTestFlightReady === true;
  const investorReady = room.investorTestFlightReady === true;
  const currentReady = role === 'founder' ? founderReady : role === 'investor' ? investorReady : false;
  const bothReady = founderReady && investorReady;

  return (
    <Card style={styles.card}>
      <Text style={styles.title}>TestFlight</Text>
      <Text style={styles.subtitle}>Ready for TestFlight</Text>
      <Pressable
        accessibilityRole="button"
        onPress={() => onToggle(!currentReady)}
        disabled={!role || isSaving}
        style={[
          styles.button,
          currentReady ? styles.buttonJoined : null,
          !role || isSaving ? styles.buttonDisabled : null,
        ]}
      >
        <Text style={styles.buttonText}>{currentReady ? '✓ Joined TestFlight' : 'Join TestFlight'}</Text>
      </Pressable>
      {bothReady ? <Text style={styles.success}>✅ Both parties joined TestFlight.</Text> : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.md,
  },
  title: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '900',
  },
  subtitle: {
    color: colors.muted,
    fontSize: 15,
    fontWeight: '800',
  },
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 58,
    borderWidth: 1,
    borderColor: colors.luxuryGold,
    borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.black,
  },
  buttonJoined: {
    borderColor: colors.success,
    backgroundColor: colors.success,
  },
  buttonDisabled: {
    opacity: 0.55,
  },
  buttonText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '900',
  },
  success: {
    color: colors.success,
    fontSize: 15,
    fontWeight: '900',
    textAlign: 'center',
  },
});
