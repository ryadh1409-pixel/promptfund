import { collection, deleteDoc, doc, getDoc, getDocs, onSnapshot, query, runTransaction, serverTimestamp, updateDoc, where, writeBatch, type Unsubscribe } from 'firebase/firestore';

import { firestoreCollections, getPromptFundFirestore } from '@/firebase/firestore';
import { adminDocumentPath } from '@/utils/adminFirestoreAudit';
import type { SupportTicket, SupportTicketAttachment, SupportTicketCategory, SupportTicketMessage } from '@/types/User';

function dateKeyForTicket(date = new Date()) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('');
}

function ticketNumberFromSequence(dateKey: string, sequence: number) {
  return `PF-${dateKey}-${String(sequence).padStart(6, '0')}`;
}

function compareTickets(left: SupportTicket, right: SupportTicket) {
  const leftTime = typeof left.updatedAt === 'object' && left.updatedAt && 'toMillis' in left.updatedAt
    ? (left.updatedAt as { toMillis: () => number }).toMillis()
    : 0;
  const rightTime = typeof right.updatedAt === 'object' && right.updatedAt && 'toMillis' in right.updatedAt
    ? (right.updatedAt as { toMillis: () => number }).toMillis()
    : 0;

  return rightTime - leftTime;
}

function compareMessages(left: SupportTicketMessage, right: SupportTicketMessage) {
  const leftTime = typeof left.createdAt === 'object' && left.createdAt && 'toMillis' in left.createdAt
    ? (left.createdAt as { toMillis: () => number }).toMillis()
    : 0;
  const rightTime = typeof right.createdAt === 'object' && right.createdAt && 'toMillis' in right.createdAt
    ? (right.createdAt as { toMillis: () => number }).toMillis()
    : 0;

  return leftTime - rightTime;
}

export const supportService = {
  createTicketRef() {
    return doc(collection(getPromptFundFirestore(), firestoreCollections.supportTickets));
  },

  ticketNumberFromSequence,

  async createTicket({
    ticketId,
    userId,
    userName,
    userEmail,
    subject,
    category,
    message,
    attachments,
  }: {
    ticketId: string;
    userId: string;
    userName: string;
    userEmail: string;
    subject: string;
    category: SupportTicketCategory;
    message: string;
    attachments: SupportTicketAttachment[];
  }) {
    const db = getPromptFundFirestore();
    const ticketRef = doc(db, firestoreCollections.supportTickets, ticketId);
    const messageRef = doc(collection(ticketRef, 'messages'));
    const dateKey = dateKeyForTicket();
    const counterRef = doc(db, 'supportTicketCounters', dateKey);

    const ticket = await runTransaction(db, async (transaction) => {
      const counterSnapshot = await transaction.get(counterRef);
      const nextSequence = counterSnapshot.exists() ? Number(counterSnapshot.data().count ?? 0) + 1 : 1;
      const ticketNumber = ticketNumberFromSequence(dateKey, nextSequence);
      const payload = {
        ticketNumber,
        userId,
        userName,
        userEmail,
        subject: subject.trim(),
        category,
        message: message.trim(),
        attachments,
        status: 'Open' as const,
        priority: 'Normal' as const,
        unreadByAdmin: true,
        unreadByUser: false,
        lastMessageAt: serverTimestamp(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      transaction.set(counterRef, {
        count: nextSequence,
        updatedAt: serverTimestamp(),
      }, { merge: true });
      transaction.set(ticketRef, payload);
      transaction.set(messageRef, {
        senderId: userId,
        senderRole: 'user' as const,
        text: message.trim(),
        attachments,
        createdAt: serverTimestamp(),
      });

      return {
        id: ticketId,
        ...payload,
      };
    });

    return ticket;
  },

  subscribeUserTickets(userId: string, onChange: (tickets: SupportTicket[]) => void): Unsubscribe {
    return onSnapshot(
      query(collection(getPromptFundFirestore(), firestoreCollections.supportTickets), where('userId', '==', userId)),
      (snapshot) => {
        onChange(
          snapshot.docs
            .map((item) => ({
              id: item.id,
              ...(item.data() as Omit<SupportTicket, 'id'>),
            }))
            .sort(compareTickets),
        );
      },
    );
  },

  subscribeTicket(ticketId: string, onChange: (ticket: SupportTicket | null) => void): Unsubscribe {
    return onSnapshot(doc(getPromptFundFirestore(), firestoreCollections.supportTickets, ticketId), (snapshot) => {
      onChange(snapshot.exists() ? {
        id: snapshot.id,
        ...(snapshot.data() as Omit<SupportTicket, 'id'>),
      } : null);
    });
  },

  subscribeTicketMessages(ticketId: string, onChange: (messages: SupportTicketMessage[]) => void): Unsubscribe {
    return onSnapshot(
      collection(getPromptFundFirestore(), firestoreCollections.supportTickets, ticketId, 'messages'),
      (snapshot) => {
        onChange(
          snapshot.docs
            .map((item) => ({
              id: item.id,
              ...(item.data() as Omit<SupportTicketMessage, 'id'>),
            }))
            .sort(compareMessages),
        );
      },
    );
  },

  async addMessage({
    ticketId,
    senderId,
    senderRole,
    body,
    attachments = [],
  }: {
    ticketId: string;
    senderId: string;
    senderRole: 'user' | 'admin';
    body: string;
    attachments?: SupportTicketAttachment[];
  }) {
    const db = getPromptFundFirestore();
    const messageRef = doc(collection(db, firestoreCollections.supportTickets, ticketId, 'messages'));
    const ticketRef = doc(db, firestoreCollections.supportTickets, ticketId);
    const nextStatus = senderRole === 'admin' ? 'Waiting for User' : 'Open';
    const batch = writeBatch(db);

    batch.set(messageRef, {
      senderId,
      senderRole,
      text: body.trim(),
      attachments,
      createdAt: serverTimestamp(),
    });
    batch.update(ticketRef, {
      status: nextStatus,
      unreadByAdmin: senderRole === 'user',
      unreadByUser: senderRole === 'admin',
      lastMessageAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    await batch.commit();
  },

  async markTicketRead(ticketId: string, role: 'user' | 'admin') {
    const unreadField = role === 'admin' ? 'unreadByAdmin' : 'unreadByUser';
    await updateDoc(doc(getPromptFundFirestore(), firestoreCollections.supportTickets, ticketId), {
      [unreadField]: false,
    });
  },

  async updateTicketStatus(ticketId: string, status: SupportTicket['status']) {
    await updateDoc(doc(getPromptFundFirestore(), firestoreCollections.supportTickets, ticketId), {
      status,
      updatedAt: serverTimestamp(),
    });
  },

  async deleteTicket(ticketId: string) {
    const db = getPromptFundFirestore();
    const ticketRef = doc(db, firestoreCollections.supportTickets, ticketId);
    const messagesSnapshot = await getDocs(collection(ticketRef, 'messages'));

    for (const message of messagesSnapshot.docs) {
      const path = adminDocumentPath(`${firestoreCollections.supportTickets}/${ticketId}/messages`, message.id);
      console.info('[PromptFund Admin Firestore] write start', { operation: 'delete', path });
      try {
        await deleteDoc(message.ref);
        console.info('[PromptFund Admin Firestore] write success', { operation: 'delete', path });
      } catch (error) {
        console.error('[PromptFund Admin Firestore] permission failure', { operation: 'delete', path, error });
        throw error;
      }
    }

    const ticketPath = adminDocumentPath(firestoreCollections.supportTickets, ticketId);
    console.info('[PromptFund Admin Firestore] write start', { operation: 'delete', path: ticketPath });
    try {
      await deleteDoc(ticketRef);
      console.info('[PromptFund Admin Firestore] write success', { operation: 'delete', path: ticketPath });
    } catch (error) {
      console.error('[PromptFund Admin Firestore] permission failure', { operation: 'delete', path: ticketPath, error });
      throw error;
    }
  },

  async getTicket(ticketId: string): Promise<SupportTicket | null> {
    const snapshot = await getDoc(doc(getPromptFundFirestore(), firestoreCollections.supportTickets, ticketId));
    return snapshot.exists() ? {
      id: snapshot.id,
      ...(snapshot.data() as Omit<SupportTicket, 'id'>),
    } : null;
  },
};
