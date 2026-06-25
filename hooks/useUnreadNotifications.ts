import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { useEffect, useState } from 'react';

import { firestoreCollections, getPromptFundFirestore } from '@/firebase/firestore';
import type { AppNotification } from '@/types/User';

export function useUnreadNotifications(userId: string | null | undefined) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!userId) {
      setCount(0);
      return;
    }

    const notificationsQuery = query(
      collection(getPromptFundFirestore(), firestoreCollections.notifications),
      where('userId', '==', userId),
    );

    const unsubscribe = onSnapshot(notificationsQuery, (snapshot) => {
      const unread = snapshot.docs
        .map((item) => ({ ...item.data(), id: item.id }) as AppNotification)
        .filter((notification) => !notification.readAt).length;
      setCount(unread);
    });

    return unsubscribe;
  }, [userId]);

  return count;
}
