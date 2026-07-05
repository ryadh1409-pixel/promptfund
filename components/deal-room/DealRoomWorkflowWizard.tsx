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
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 4,
    paddingBottom: 4,
    paddingHorizontal: spacing.sm,
    paddingTop: 2,
  },
  completedBlock: {
    gap: 2,
  },
  completedRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    height: 38,
    paddingHorizontal: 4,
  },
  completedCheck: {
    color: colors.success,
    fontSize: 13,
    fontWeight: '800',
    width: 14,
  },
  completedLabel: {
    color: colors.muted,
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
  },
  activeCard: {
    backgroundColor: colors.panel,
    borderColor: 'rgba(200, 162, 74, 0.45)',
    borderRadius: radii.sm,
    borderWidth: 1,
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  activeTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
  },
  activeBody: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 16,
  },
  detailLine: {
    color: colors.text,
    fontSize: 11,
    lineHeight: 14,
  },
  waitingText: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: '600',
  },
  button: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colors.accent,
    borderRadius: radii.pill,
    justifyContent: 'center',
    marginTop: 2,
    minHeight: 34,
    minWidth: 120,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonLabel: {
    color: colors.black,
    fontSize: 13,
    fontWeight: '800',
  },
});
