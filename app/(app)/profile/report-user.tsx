import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Card, PrimaryButton, Screen } from '@/components/ui/Primitives';
import { colors, radii, spacing } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { getFriendlyErrorMessage } from '@/services/errorHandler';
import { userService } from '@/services/userService';

const reportReasons = ['Spam', 'Fraud', 'Harassment', 'Abuse', 'Scam', 'Fake Startup', 'Other'];

export default function ReportUserScreen() {
  const { authUser } = useAuth();
  const [reportedUid, setReportedUid] = useState('');
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleReport() {
    if (!authUser) {
      return;
    }

    try {
      setError(null);
      await userService.reportUser({
        reporterUid: authUser.uid,
        reportedUid: reportedUid.trim(),
        reason: reason.trim(),
        details: details.trim(),
      });
      setMessage('Report submitted for admin review.');
      setReportedUid('');
      setReason('');
      setDetails('');
    } catch (reportError) {
      setError(getFriendlyErrorMessage(reportError));
    }
  }

  return (
    <Screen eyebrow="Safety" title="Report a User" subtitle="Reports are reviewed by Ai PromptFund admins.">
      <Card>
        <TextInput placeholder="Reported user UID" placeholderTextColor={colors.subtle} value={reportedUid} onChangeText={setReportedUid} autoCapitalize="none" style={styles.input} />
        <View style={styles.reasonGrid}>
          {reportReasons.map((item) => (
            <Pressable
              key={item}
              onPress={() => setReason(item)}
              style={[styles.reasonChip, reason === item ? styles.reasonChipActive : null]}
            >
              <Text style={styles.reasonText}>{item}</Text>
            </Pressable>
          ))}
        </View>
        <TextInput placeholder="Details" placeholderTextColor={colors.subtle} value={details} onChangeText={setDetails} multiline style={[styles.input, styles.textArea]} />
        {message ? <Text style={styles.success}>{message}</Text> : null}
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        <PrimaryButton label="Submit Report" disabled={reportedUid.length === 0 || reason.length === 0} onPress={handleReport} />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  input: {
    minHeight: 52,
    borderWidth: 1,
    borderColor: 'rgba(200, 162, 74, 0.36)',
    borderRadius: radii.md,
    backgroundColor: colors.panelMuted,
    color: colors.text,
    paddingHorizontal: spacing.md,
    fontSize: 15,
  },
  textArea: {
    minHeight: 132,
    paddingTop: spacing.md,
    textAlignVertical: 'top',
  },
  reasonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  reasonChip: {
    borderWidth: 1,
    borderColor: 'rgba(200, 162, 74, 0.36)',
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.black,
  },
  reasonChipActive: {
    borderColor: colors.luxuryGold,
    backgroundColor: 'rgba(200, 162, 74, 0.16)',
  },
  reasonText: {
    color: colors.text,
    fontWeight: '900',
  },
  success: {
    color: colors.success,
    fontWeight: '800',
  },
  errorText: {
    color: colors.danger,
    lineHeight: 20,
  },
});
