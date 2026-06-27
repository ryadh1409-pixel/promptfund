import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  deleteDoc,
  where,
  type DocumentData,
  type QueryConstraint,
} from 'firebase/firestore';

import { getFirebaseApp } from './config';
import { withFriendlyErrors } from '@/services/errorHandler';

export const firestoreCollections = {
  users: 'users',
  projects: 'projects',
  fundingRequests: 'fundingRequests',
  investments: 'investments',
  startupOpportunities: 'startupOpportunities',
  interests: 'interests',
  investmentOpportunities: 'investmentOpportunities',
  investmentInterests: 'investmentInterests',
  matches: 'matches',
  discussionRooms: 'discussionRooms',
  discussionMessages: 'discussionMessages',
  agreements: 'agreements',
  expenses: 'expenses',
  agreementRooms: 'agreementRooms',
  investmentContracts: 'investmentContracts',
  investmentContractVersions: 'investmentContractVersions',
  agreementMeetings: 'agreementMeetings',
  agreementParticipants: 'agreementParticipants',
  agreementTranscripts: 'agreementTranscripts',
  agreementSummaries: 'agreementSummaries',
  agreementCertificates: 'agreementCertificates',
  blockedUsers: 'blockedUsers',
  userReports: 'userReports',
  moderationFlags: 'moderationFlags',
  adminAnnouncements: 'adminAnnouncements',
  activityTimeline: 'activityTimeline',
  notifications: 'notifications',
  pushTokens: 'pushTokens',
  founderUpdates: 'founderUpdates',
  founderUpdateComments: 'founderUpdateComments',
  aiUsage: 'aiUsage',
} as const;

export type FirestoreCollectionName = keyof typeof firestoreCollections;

export type FirestoreDocument<T> = T & {
  id: string;
  createdAt?: string;
  updatedAt?: string;
};

export type FirestoreAdapter = {
  list: <T>(collectionName: FirestoreCollectionName) => Promise<Array<FirestoreDocument<T>>>;
  queryByField: <T>(
    collectionName: FirestoreCollectionName,
    field: string,
    value: string,
  ) => Promise<Array<FirestoreDocument<T>>>;
  queryByFields: <T>(
    collectionName: FirestoreCollectionName,
    filters: Array<{ field: string; value: string }>,
  ) => Promise<Array<FirestoreDocument<T>>>;
  getById: <T>(
    collectionName: FirestoreCollectionName,
    id: string,
  ) => Promise<FirestoreDocument<T> | null>;
  create: <T>(
    collectionName: FirestoreCollectionName,
    input: T,
  ) => Promise<FirestoreDocument<T>>;
  update: <T>(
    collectionName: FirestoreCollectionName,
    id: string,
    input: Partial<T>,
  ) => Promise<FirestoreDocument<T>>;
  setWithId: <T>(
    collectionName: FirestoreCollectionName,
    id: string,
    input: T,
  ) => Promise<FirestoreDocument<T>>;
  deleteById: (
    collectionName: FirestoreCollectionName,
    id: string,
  ) => Promise<void>;
};

export function getPromptFundFirestore() {
  return getFirestore(getFirebaseApp());
}

function collectionRef(collectionName: FirestoreCollectionName) {
  return collection(getPromptFundFirestore(), firestoreCollections[collectionName]);
}

function mapDocument<T>(id: string, data: DocumentData): FirestoreDocument<T> {
  return {
    ...(data as T),
    id,
  };
}

function omitUndefined(input: object) {
  return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined));
}

function withWriteMetadata<T extends object>(input: T) {
  return {
    ...omitUndefined(input),
    updatedAt: serverTimestamp(),
  };
}

async function listWithConstraints<T>(
  collectionName: FirestoreCollectionName,
  constraints: QueryConstraint[] = [],
): Promise<Array<FirestoreDocument<T>>> {
  const path = `${firestoreCollections[collectionName]}/*`;
  console.info('[PromptFund Firestore] read start', { path, operation: 'getDocs' });
  return withFriendlyErrors(async () => {
    try {
      const snapshot = await getDocs(query(collectionRef(collectionName), ...constraints));
      console.info('[PromptFund Firestore] read success', {
        path,
        operation: 'getDocs',
        count: snapshot.docs.length,
      });
      return snapshot.docs.map((item) => mapDocument<T>(item.id, item.data()));
    } catch (error) {
      console.error('[PromptFund Firestore] read failure', { path, operation: 'getDocs', error });
      throw error;
    }
  });
}

export const firestoreAdapter: FirestoreAdapter = {
  async list(collectionName) {
    return listWithConstraints(collectionName);
  },
  async queryByField(collectionName, field, value) {
    return listWithConstraints(collectionName, [where(field, '==', value)]);
  },
  async queryByFields(collectionName, filters) {
    return listWithConstraints(collectionName, filters.map((filter) => where(filter.field, '==', filter.value)));
  },
  async getById(collectionName, id) {
    const path = `${firestoreCollections[collectionName]}/${id}`;
    console.info('[PromptFund Firestore] read start', { path, operation: 'getDoc' });
    const snapshot = await withFriendlyErrors(async () => {
      try {
        const result = await getDoc(doc(getPromptFundFirestore(), firestoreCollections[collectionName], id));
        console.info('[PromptFund Firestore] read success', {
          path,
          operation: 'getDoc',
          exists: result.exists(),
        });
        return result;
      } catch (error) {
        console.error('[PromptFund Firestore] read failure', { path, operation: 'getDoc', error });
        throw error;
      }
    });

    if (!snapshot.exists()) {
      return null;
    }

    return mapDocument(snapshot.id, snapshot.data());
  },
  async create(collectionName, input) {
    const payload = {
      ...withWriteMetadata(input as object),
      createdAt: serverTimestamp(),
    };
    const reference = await withFriendlyErrors(async () => addDoc(collectionRef(collectionName), payload));
    return {
      ...(input as object),
      id: reference.id,
    } as FirestoreDocument<typeof input>;
  },
  async update<T>(
    collectionName: FirestoreCollectionName,
    id: string,
    input: Partial<T>,
  ): Promise<FirestoreDocument<T>> {
    const reference = doc(getPromptFundFirestore(), firestoreCollections[collectionName], id);
    await withFriendlyErrors(async () => {
      await updateDoc(reference, withWriteMetadata(input as object));
    });
    const updated = await this.getById<T>(collectionName, id);

    if (!updated) {
      throw new Error(`Unable to load updated document ${collectionName}/${id}`);
    }

    return updated;
  },
  async setWithId(collectionName, id, input) {
    const reference = doc(getPromptFundFirestore(), firestoreCollections[collectionName], id);
    const path = `${firestoreCollections[collectionName]}/${id}`;

    try {
      console.info('[PromptFund Firestore] setWithId start', { path });
      await withFriendlyErrors(async () => {
        await setDoc(reference, {
          ...omitUndefined(input as object),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      });
      console.info('[PromptFund Firestore] setWithId success', { path });
    } catch (error) {
      console.error('[PromptFund Firestore] setWithId failure', { path, error });
      throw error;
    }

    return {
      ...input,
      id,
    };
  },
  async deleteById(collectionName, id) {
    await withFriendlyErrors(async () => {
      await deleteDoc(doc(getPromptFundFirestore(), firestoreCollections[collectionName], id));
    });
  },
};
