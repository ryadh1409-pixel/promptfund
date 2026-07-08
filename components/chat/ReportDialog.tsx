import { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { MESSAGE_REPORT_REASONS } from '@/firebase/chatSafety';
import { colors, radii, spacing } from '@/constants/theme';
import { PrimaryButton } from '@/components/ui/Primitives';
import type { MessageReportReason } from '@/types/ChatSafety';

type ReportDialogProps = {
  visible: boolean;
  isSubmitting?: boolean;
  onClose: () => void;
  onSubmit: (input: { reason: MessageReportReason; details?: string }) => void | Promise<void>;
};

export function ReportDialog({
  visible,
  isSubmitting = false,
  onClose,
  onSubmit,
}: ReportDialogProps) {
  const [reason, setReason] = useState<MessageReportReason>('Harassment');
  const [details, setDetails] = useState('');

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>Report Message</Text>
          <Text style={styles.subtitle}>
            Reports are reviewed by the PromptFund Trust & Safety team.
          </Text>
          <ScrollView style={styles.reasonList}>
            {MESSAGE_REPORT_REASONS.map((item) => (
              <Pressable
                key={item}
                accessibilityRole="radio"
                accessibilityState={{ checked: reason === item }}
                onPress={() => setReason(item)}
                style={[styles.reasonOption, reason === item ? styles.reasonOptionActive : null]}
              >
                <View style={[styles.radio, reason === item ? styles.radioActive : null]} />
                <Text style={styles.reasonLabel}>{item}</Text>
              </Pressable>
            ))}
          </ScrollView>
          {reason === 'Other' ? (
            <TextInput
              multiline
              value={details}
              onChangeText={setDetails}
              placeholder="Describe what happened..."
              placeholderTextColor={colors.subtle}
              style={styles.detailsInput}
            />
          ) : null}
          {isSubmitting ? <ActivityIndicator color={colors.accent} /> : null}
          <View style={styles.actions}>
            <PrimaryButton label="Cancel" variant="secondary" onPress={onClose} disabled={isSubmitting} />
            <PrimaryButton
              label={isSubmitting ? 'Submitting...' : 'Submit Report'}
              onPress={() => onSubmit({ reason, details: details.trim() || undefined })}
              disabled={isSubmitting || (reason === 'Other' && details.trim().length === 0)}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.72)',
    flex: 1,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  card: {
    backgroundColor: colors.panel,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    gap: spacing.md,
    maxHeight: '85%',
    padding: spacing.lg,
    width: '100%',
  },
  title: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '800',
  },
  subtitle: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  reasonList: {
    maxHeight: 260,
  },
  reasonOption: {
    alignItems: 'center',
    borderColor: 'rgba(216, 201, 163, 0.18)',
    borderRadius: radii.sm,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.xs,
    padding: spacing.sm,
  },
  reasonOptionActive: {
    borderColor: colors.accent,
    backgroundColor: 'rgba(200, 162, 74, 0.12)',
  },
  radio: {
    borderColor: colors.accent,
    borderRadius: 999,
    borderWidth: 1,
    height: 18,
    width: 18,
  },
  radioActive: {
    backgroundColor: colors.accent,
  },
  reasonLabel: {
    color: colors.text,
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
  },
  detailsInput: {
    backgroundColor: colors.panelMuted,
    borderColor: colors.border,
    borderRadius: radii.sm,
    borderWidth: 1,
    color: colors.text,
    minHeight: 96,
    padding: spacing.sm,
    textAlignVertical: 'top',
  },
  actions: {
    gap: spacing.sm,
  },
});
