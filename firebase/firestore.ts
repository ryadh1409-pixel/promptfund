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

export const firestoreCollections = {
  users: 'users',
  projects: 'projects',
  fundingRequests: 'fundingRequests',
  investments: 'investments',
  investmentInterests: 'investmentInterests',
  matches: 'matches',
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

function withWriteMetadata<T extends object>(input: T) {
  return {
    ...input,
    updatedAt: serverTimestamp(),
  };
}

async function listWithConstraints<T>(
  collectionName: FirestoreCollectionName,
  constraints: QueryConstraint[] = [],
): Promise<Array<FirestoreDocument<T>>> {
  const snapshot = await getDocs(query(collectionRef(collectionName), ...constraints));
  return snapshot.docs.map((item) => mapDocument<T>(item.id, item.data()));
}

export const firestoreAdapter: FirestoreAdapter = {
  async list(collectionName) {
    return listWithConstraints(collectionName);
  },
  async queryByField(collectionName, field, value) {
    return listWithConstraints(collectionName, [where(field, '==', value)]);
  },
  async getById(collectionName, id) {
    const snapshot = await getDoc(doc(getPromptFundFirestore(), firestoreCollections[collectionName], id));

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
    const reference = await addDoc(collectionRef(collectionName), payload);
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
    await updateDoc(reference, withWriteMetadata(input as object));
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
      await setDoc(reference, {
        ...input,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
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
    await deleteDoc(doc(getPromptFundFirestore(), firestoreCollections[collectionName], id));
  },
};
