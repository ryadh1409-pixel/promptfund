import { assertFirebaseEnabled } from './config';

export const firestoreCollections = {
  users: 'users',
  projects: 'projects',
  fundingRequests: 'fundingRequests',
  fundings: 'fundings',
  expenses: 'expenses',
  fundPoints: 'fundPoints',
} as const;

export type FirestoreCollectionName = keyof typeof firestoreCollections;

export type FirestoreDocument<T> = T & {
  id: string;
  createdAt?: string;
  updatedAt?: string;
};

export type FirestoreAdapter = {
  list: <T>(collectionName: FirestoreCollectionName) => Promise<Array<FirestoreDocument<T>>>;
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
};

export const firestoreAdapter: FirestoreAdapter = {
  async list() {
    assertFirebaseEnabled();
    throw new Error('Live Firestore list adapter is not implemented yet.');
  },
  async getById() {
    assertFirebaseEnabled();
    throw new Error('Live Firestore getById adapter is not implemented yet.');
  },
  async create() {
    assertFirebaseEnabled();
    throw new Error('Live Firestore create adapter is not implemented yet.');
  },
  async update() {
    assertFirebaseEnabled();
    throw new Error('Live Firestore update adapter is not implemented yet.');
  },
};
