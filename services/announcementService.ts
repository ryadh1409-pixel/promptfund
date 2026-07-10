import { arrayUnion, collection, doc, getDocs, updateDoc } from 'firebase/firestore';

import { firestoreAdapter, firestoreCollections, getPromptFundFirestore } from '@/firebase/firestore';
import type { AdminAnnouncement } from '@/types/User';

function announcementTimestamp(value: unknown) {
  if (typeof value === 'string') {
    return value;
  }

  if (typeof value === 'object' && value && 'toDate' in value) {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }

  return '';
}

function sortAnnouncements(left: AdminAnnouncement, right: AdminAnnouncement) {
  return announcementTimestamp(right.createdAt).localeCompare(announcementTimestamp(left.createdAt));
}

export const announcementService = {
  async listAnnouncements(): Promise<AdminAnnouncement[]> {
    return firestoreAdapter.list<AdminAnnouncement>('adminAnnouncements');
  },

  async listUnreadForUser(userId: string): Promise<AdminAnnouncement[]> {
    const announcements = await this.listAnnouncements();
    return announcements
      .filter((announcement) => !(announcement.readBy ?? []).includes(userId))
      .sort(sortAnnouncements);
  },

  async markAsRead(announcementId: string, userId: string) {
    await updateDoc(doc(getPromptFundFirestore(), firestoreCollections.adminAnnouncements, announcementId), {
      readBy: arrayUnion(userId),
    });
  },

  subscribeAnnouncements(onChange: (announcements: AdminAnnouncement[]) => void) {
    return getDocs(collection(getPromptFundFirestore(), firestoreCollections.adminAnnouncements))
      .then((snapshot) => {
        onChange(
          snapshot.docs
            .map((item) => ({
              id: item.id,
              ...(item.data() as Omit<AdminAnnouncement, 'id'>),
            }))
            .sort(sortAnnouncements),
        );
      });
  },
};
