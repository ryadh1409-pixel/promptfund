import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radii, spacing } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { announcementService } from '@/services/announcementService';
import { getFriendlyErrorMessage } from '@/services/errorHandler';
import type { AdminAnnouncement } from '@/types/User';

export function AnnouncementGate() {
  const { authUser } = useAuth();
  const [queue, setQueue] = useState<AdminAnnouncement[]>([]);
  const [isWorking, setIsWorking] = useState(false);

  useEffect(() => {
    if (!authUser?.uid) {
      setQueue([]);
      return;
    }

    let isMounted = true;
    announcementService.listUnreadForUser(authUser.uid)
      .then((announcements) => {
        if (isMounted) {
          setQueue(announcements);
        }
      })
      .catch((error) => {
        console.info('[PromptFund Announcements] load skipped', getFriendlyErrorMessage(error));
      });

    return () => {
      isMounted = false;
    };
  }, [authUser?.uid]);

  const current = queue[0] ?? null;

  async function handleDismiss() {
    if (!current || !authUser?.uid || isWorking) {
      return;
    }

    try {
      setIsWorking(true);
      await announcementService.markAsRead(current.id, authUser.uid);
      setQueue((existing) => existing.filter((announcement) => announcement.id !== current.id));
    } catch (error) {
      console.info('[PromptFund Announcements] mark read failed', getFriendlyErrorMessage(error));
      setQueue((existing) => existing.filter((announcement) => announcement.id !== current.id));
    } finally {
      setIsWorking(false);
    }
  }

  if (!current) {
    return null;
  }

  return (
    <Modal visible transparent animationType="fade" onRequestClose={handleDismiss}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.eyebrow}>Ai PromptFund Announcement</Text>
          <Text style={styles.title}>{current.title}</Text>
          <Text style={styles.body}>{current.body}</Text>
          <Pressable
            accessibilityRole="button"
            disabled={isWorking}
            onPress={handleDismiss}
            style={[styles.button, isWorking ? styles.buttonDisabled : null]}
          >
            <Text style={styles.buttonLabel}>{isWorking ? 'Saving...' : 'Got it'}</Text>
          </Pressable>
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
    maxWidth: 520,
    padding: spacing.lg,
    width: '100%',
  },
  eyebrow: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  title: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '900',
  },
  body: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 22,
  },
  button: {
    alignItems: 'center',
    alignSelf: 'flex-end',
    backgroundColor: colors.accent,
    borderRadius: radii.pill,
    minWidth: 120,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonLabel: {
    color: colors.black,
    fontSize: 14,
    fontWeight: '800',
  },
});
