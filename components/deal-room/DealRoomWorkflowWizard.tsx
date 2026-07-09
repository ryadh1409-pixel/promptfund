import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radii, spacing } from '@/constants/theme';
import type { WorkflowAction, WorkflowStepView } from '@/utils/dealRoom';

type DealRoomWorkflowWizardProps = {
  steps: WorkflowStepView[];
  isSaving: boolean;
  onAction: (action: WorkflowAction) => void | Promise<void>;
};

export function DealRoomWorkflowWizard({ steps, isSaving, onAction }: DealRoomWorkflowWizardProps) {
  const completedSteps = steps.filter((step) => step.status === 'completed');
  const activeStep = steps.find((step) => step.status === 'active');

  return (
    <View style={styles.wrap}>
      <Text style={styles.sectionTitle}>Investment Progress</Text>
      <View style={styles.progressCard}>
        {completedSteps.length > 0 ? (
          <View style={styles.completedBlock}>
            {completedSteps.map((step) => (
              <View key={step.key} style={styles.completedRow}>
                <Text style={styles.completedCheck}>✓</Text>
                <Text style={styles.completedLabel} numberOfLines={1}>{step.label}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {activeStep ? (
          <View style={styles.activeCard}>
            <Text style={styles.activeTitle} numberOfLines={1}>
              {activeStep.title ?? activeStep.label}
            </Text>
            {activeStep.body ? (
              <Text style={styles.activeBody} numberOfLines={2}>{activeStep.body}</Text>
            ) : null}
            {activeStep.detailLines?.slice(0, 2).map((line) => (
              <Text key={line} style={styles.detailLine} numberOfLines={1}>{line}</Text>
            ))}
            {activeStep.waitingMessage ? (
              <Text style={styles.waitingText} numberOfLines={1}>
                ⏳ {activeStep.waitingMessage}
              </Text>
            ) : null}
            {activeStep.buttonLabel && activeStep.action ? (
              <Pressable
                accessibilityRole="button"
                disabled={isSaving}
                onPress={() => onAction(activeStep.action as WorkflowAction)}
                style={[styles.button, isSaving ? styles.buttonDisabled : null]}
              >
                {isSaving ? (
                  <ActivityIndicator color={colors.black} size="small" />
                ) : (
                  <Text style={styles.buttonLabel}>{activeStep.buttonLabel}</Text>
                )}
              </Pressable>
            ) : null}
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 4,
    paddingHorizontal: spacing.md,
  },
  sectionTitle: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  progressCard: {
    backgroundColor: colors.panel,
    borderColor: 'rgba(216, 201, 163, 0.18)',
    borderRadius: radii.sm,
    borderWidth: 1,
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  completedBlock: {
    gap: 0,
  },
  completedRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 5,
    minHeight: 22,
    paddingHorizontal: 2,
  },
  completedCheck: {
    color: colors.success,
    fontSize: 10,
    fontWeight: '800',
    lineHeight: 12,
    width: 11,
  },
  completedLabel: {
    color: colors.muted,
    flex: 1,
    fontSize: 11,
    fontWeight: '600',
    lineHeight: 14,
  },
  activeCard: {
    backgroundColor: 'rgba(200, 162, 74, 0.08)',
    borderColor: 'rgba(200, 162, 74, 0.28)',
    borderRadius: radii.sm - 2,
    borderWidth: 1,
    gap: 2,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  activeTitle: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '700',
  },
  activeBody: {
    color: colors.muted,
    fontSize: 11,
    lineHeight: 14,
  },
  detailLine: {
    color: colors.text,
    fontSize: 10,
    lineHeight: 13,
  },
  waitingText: {
    color: colors.accent,
    fontSize: 10,
    fontWeight: '600',
  },
  button: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colors.accent,
    borderRadius: radii.pill,
    justifyContent: 'center',
    marginTop: 2,
    minHeight: 28,
    minWidth: 108,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonLabel: {
    color: colors.black,
    fontSize: 12,
    fontWeight: '800',
  },
});
