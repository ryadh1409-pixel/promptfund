import { router } from 'expo-router';
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Card, PrimaryButton, Screen } from '@/components/ui/Primitives';
import { colors, radii, spacing } from '@/constants/theme';
import { uploadSupportScreenshot } from '@/firebase/storage';
import { supportService } from '@/services/supportService';
import type { SupportTicket, SupportTicketAttachment, SupportTicketCategory } from '@/types/User';
import { useAuth } from '@/context/AuthContext';

type ImagePickerModule = typeof import('expo-image-picker');

const categories: SupportTicketCategory[] = [
  'Account',
  'Verification',
  'Funding',
  'Investments',
  'Payments',
  'Technical Issue',
  'Report a User',
  'Report a Bug',
  'Feature Request',
  'Other',
];

function errorMessage(error: unknown) {
  console.error('[PromptFund Support] Firebase support workflow error', error);
  const code = typeof error === 'object' && error && 'code' in error ? String((error as { code: unknown }).code) : null;
  const message = error instanceof Error ? error.message : String(error);

  if (code === 'permission-denied') {
    return `Firestore permission denied while saving your support request. Check supportTickets/messages security rules for the signed-in user. Firebase: ${message}`;
  }

  return code ? `${code}: ${message}` : message;
}

function formatSuccessDate(value: Date) {
  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(value);
}

export default function ContactSupportScreen() {
  const { authUser, profile } = useAuth();
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState<SupportTicketCategory>('Account');
  const [message, setMessage] = useState('');
  const [screenshot, setScreenshot] = useState<{ uri: string; contentType: string; name: string } | null>(null);
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [submittedTicket, setSubmittedTicket] = useState<{ ticket: SupportTicket; createdAt: Date } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const canSubmit = subject.trim().length > 0 && message.trim().length > 0 && !isSubmitting;

  async function loadImagePicker(): Promise<ImagePickerModule | null> {
    try {
      return await import('expo-image-picker');
    } catch (loadError) {
      setNotice(errorMessage(loadError));
      return null;
    }
  }

  async function handleAttachScreenshot() {
    setNotice(null);
    const ImagePicker = await loadImagePicker();
    if (!ImagePicker) {
      return;
    }

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setNotice('Allow photo access to attach a screenshot.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: false,
      mediaTypes: ['images'],
      quality: 0.82,
    });

    if (result.canceled || !result.assets[0]) {
      return;
    }

    const asset = result.assets[0];
    setScreenshot({
      uri: asset.uri,
      contentType: asset.mimeType ?? 'image/jpeg',
      name: asset.fileName ?? 'screenshot.jpg',
    });
    setNotice(null);
  }

  async function handleSubmit() {
    if (isSubmitting) {
      return;
    }

    if (!authUser?.uid) {
      setNotice('You must be signed in to contact PromptFund Support.');
      return;
    }

    if (!subject.trim()) {
      setNotice('Subject is required.');
      return;
    }

    if (!message.trim()) {
      setNotice('Message is required.');
      return;
    }

    const ticketRef = supportService.createTicketRef();
    const attachments: SupportTicketAttachment[] = [];

    try {
      setIsSubmitting(true);
      setNotice(null);

      if (screenshot) {
        try {
          const upload = await uploadSupportScreenshot({
            ticketId: ticketRef.id,
            userId: authUser.uid,
            uri: screenshot.uri,
            contentType: screenshot.contentType,
          });
          attachments.push({
            name: screenshot.name,
            path: upload.path,
            downloadUrl: upload.downloadUrl,
            contentType: screenshot.contentType,
          });
        } catch (uploadError) {
          console.error('[PromptFund Support] optional screenshot upload failed; creating ticket without attachment', uploadError);
        }
      }

      const ticket = await supportService.createTicket({
        ticketId: ticketRef.id,
        userId: authUser.uid,
        userName: profile?.displayName ?? profile?.name ?? authUser.displayName ?? 'PromptFund Member',
        userEmail: profile?.email ?? authUser.email ?? '',
        subject,
        category,
        message,
        attachments,
      });

      const createdAt = new Date();
      setSubmittedTicket({ ticket, createdAt });
      setSubject('');
      setMessage('');
      setScreenshot(null);
      setTimeout(() => {
        router.replace(`/profile/support-ticket/${ticket.id}`);
      }, 1400);
    } catch (error) {
      setNotice(errorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Screen eyebrow="Support" title="Support" subtitle="Need help? Send a message to the PromptFund team.">
      {submittedTicket ? (
        <Card style={styles.successCard}>
          <Text style={styles.successTitle}>✓ Support request submitted successfully</Text>
          <Text style={styles.copy}>Ticket: {submittedTicket.ticket.ticketNumber}</Text>
          <Text style={styles.copy}>Status: {submittedTicket.ticket.status}</Text>
          <Text style={styles.copy}>Created: {formatSuccessDate(submittedTicket.createdAt)}</Text>
        </Card>
      ) : null}

      {notice ? (
        <Card>
          <Text style={styles.notice}>{notice}</Text>
        </Card>
      ) : null}

      <Card style={styles.formCard}>
        <Text style={styles.label}>Subject *</Text>
        <TextInput
          value={subject}
          onChangeText={setSubject}
          placeholder="Briefly describe the issue"
          placeholderTextColor={colors.subtle}
          style={styles.input}
        />

        <Text style={styles.label}>Category *</Text>
        <Pressable accessibilityRole="button" onPress={() => setIsCategoryOpen(true)} style={styles.dropdown}>
          <Text style={styles.dropdownText}>{category}</Text>
          <Text style={styles.dropdownChevron}>⌄</Text>
        </Pressable>

        <Text style={styles.label}>Message *</Text>
        <TextInput
          value={message}
          onChangeText={setMessage}
          multiline
          placeholder="Tell us what happened and include any relevant details."
          placeholderTextColor={colors.subtle}
          style={[styles.input, styles.messageInput]}
        />

        <PrimaryButton
          label={screenshot ? `Screenshot attached: ${screenshot.name}` : 'Attach Screenshot'}
          variant="secondary"
          onPress={handleAttachScreenshot}
          disabled={isSubmitting}
        />
        {screenshot ? <PrimaryButton label="Remove Screenshot" variant="secondary" onPress={() => setScreenshot(null)} disabled={isSubmitting} /> : null}
        <PrimaryButton label={isSubmitting ? 'Sending...' : 'Send Message'} onPress={handleSubmit} disabled={!canSubmit} />
      </Card>

      <Card style={styles.formCard}>
        <Text style={styles.sectionTitle}>My Support Tickets</Text>
        <Text style={styles.copy}>View ticket status, unread replies, and previous support conversations.</Text>
        <PrimaryButton label="Open My Support Tickets" variant="secondary" onPress={() => router.push('/profile/support-tickets')} />
      </Card>

      <Modal visible={isCategoryOpen} transparent animationType="fade" onRequestClose={() => setIsCategoryOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setIsCategoryOpen(false)}>
          <View style={styles.dropdownMenu}>
            <Text style={styles.sectionTitle}>Category</Text>
            {categories.map((item) => (
              <Pressable
                key={item}
                accessibilityRole="button"
                onPress={() => {
                  setCategory(item);
                  setIsCategoryOpen(false);
                }}
                style={styles.dropdownItem}
              >
                <Text style={[styles.dropdownItemText, category === item ? styles.dropdownItemTextActive : null]}>{item}</Text>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  formCard: {
    gap: spacing.md,
  },
  successCard: {
    gap: spacing.sm,
    borderColor: 'rgba(70, 211, 143, 0.42)',
  },
  successTitle: {
    color: colors.success,
    fontSize: 18,
    fontWeight: '900',
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '900',
  },
  label: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '900',
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    backgroundColor: colors.black,
    color: colors.text,
    fontSize: 15,
    padding: spacing.md,
  },
  messageInput: {
    minHeight: 130,
    textAlignVertical: 'top',
  },
  dropdown: {
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: colors.black,
    padding: spacing.md,
  },
  dropdownText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
  },
  dropdownChevron: {
    color: colors.luxuryGold,
    fontSize: 18,
    fontWeight: '900',
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: spacing.lg,
  },
  dropdownMenu: {
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(200, 162, 74, 0.42)',
    borderRadius: radii.lg,
    backgroundColor: colors.panel,
    padding: spacing.lg,
  },
  dropdownItem: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(216, 201, 163, 0.1)',
    paddingVertical: spacing.sm,
  },
  dropdownItemText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
  },
  dropdownItemTextActive: {
    color: colors.luxuryGold,
  },
  copy: {
    color: colors.muted,
    lineHeight: 22,
  },
  notice: {
    color: colors.danger,
    lineHeight: 22,
  },
});
