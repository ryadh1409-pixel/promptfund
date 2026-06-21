import { useState } from 'react';
import { StyleSheet, Text, TextInput } from 'react-native';

import { Card, PrimaryButton, Screen } from '@/components/ui/Primitives';
import { colors, radii, spacing } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { userService } from '@/services/userService';

export default function ReportUserScreen() {
  const { authUser } = useAuth();
  const [reportedUid, setReportedUid] = useState('');
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  async function handleReport() {
    if (!authUser) {
      return;
    }

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
  }

  return (
    <Screen eyebrow="Safety" title="Report a User" subtitle="Reports are reviewed by PromptFund admins.">
      <Card>
        <TextInput placeholder="Reported user UID" placeholderTextColor={colors.subtle} value={reportedUid} onChangeText={setReportedUid} autoCapitalize="none" style={styles.input} />
        <TextInput placeholder="Reason" placeholderTextColor={colors.subtle} value={reason} onChangeText={setReason} style={styles.input} />
        <TextInput placeholder="Details" placeholderTextColor={colors.subtle} value={details} onChangeText={setDetails} multiline style={[styles.input, styles.textArea]} />
        {message ? <Text style={styles.success}>{message}</Text> : null}
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
  success: {
    color: colors.success,
    fontWeight: '800',
  },
});
