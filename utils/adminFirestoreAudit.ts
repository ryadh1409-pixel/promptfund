import { deleteDoc, doc, type DocumentData } from 'firebase/firestore';

import { firestoreAdapter, firestoreCollections, getPromptFundFirestore, type FirestoreCollectionName } from '@/firebase/firestore';

export class AdminFirestorePermissionError extends Error {
  readonly path: string;
  readonly operation: 'create' | 'update' | 'delete';
  readonly causeCode: string;

  constructor(path: string, operation: 'create' | 'update' | 'delete', cause: unknown) {
    const causeCode = typeof cause === 'object' && cause && 'code' in cause
      ? String((cause as { code: unknown }).code)
      : 'unknown';
    super(`Firestore permission denied for admin ${operation} at ${path} (${causeCode})`);
    this.name = 'AdminFirestorePermissionError';
    this.path = path;
    this.operation = operation;
    this.causeCode = causeCode;
  }
}

export function adminDocumentPath(collection: string, id: string) {
  return `${collection}/${id}`;
}

function logAdminWriteStart(operation: 'create' | 'update' | 'delete', path: string) {
  console.info('[PromptFund Admin Firestore] write start', { operation, path });
}

function logAdminWriteSuccess(operation: 'create' | 'update' | 'delete', path: string) {
  console.info('[PromptFund Admin Firestore] write success', { operation, path });
}

function logAdminWriteFailure(operation: 'create' | 'update' | 'delete', path: string, error: unknown) {
  const code = typeof error === 'object' && error && 'code' in error
    ? String((error as { code: unknown }).code)
    : 'unknown';
  console.error('[PromptFund Admin Firestore] permission failure', { operation, path, code, error });
}

async function runAdminWrite<T>(
  operation: 'create' | 'update' | 'delete',
  path: string,
  fn: () => Promise<T>,
): Promise<T> {
  logAdminWriteStart(operation, path);
  try {
    const result = await fn();
    logAdminWriteSuccess(operation, path);
    return result;
  } catch (error) {
    logAdminWriteFailure(operation, path, error);
    throw new AdminFirestorePermissionError(path, operation, error);
  }
}

export const adminFirestore = {
  async update<T extends DocumentData>(
    collectionName: FirestoreCollectionName,
    id: string,
    input: Partial<T>,
  ) {
    const path = adminDocumentPath(firestoreCollections[collectionName], id);
    return runAdminWrite('update', path, () => firestoreAdapter.update<T>(collectionName, id, input));
  },

  async create<T extends DocumentData>(
    collectionName: FirestoreCollectionName,
    input: T,
  ) {
    const path = `${firestoreCollections[collectionName]}/*`;
    return runAdminWrite('create', path, () => firestoreAdapter.create<T>(collectionName, input));
  },

  async delete(collectionName: FirestoreCollectionName, id: string) {
    const path = adminDocumentPath(firestoreCollections[collectionName], id);
    return runAdminWrite('delete', path, () => firestoreAdapter.deleteById(collectionName, id));
  },

  async deleteRaw(collection: string, id: string) {
    const path = adminDocumentPath(collection, id);
    return runAdminWrite('delete', path, () => deleteDoc(doc(getPromptFundFirestore(), collection, id)));
  },

  async deleteMany(deletes: Array<{ collection: FirestoreCollectionName | string; id: string }>) {
    for (const item of deletes) {
      const collectionPath = item.collection in firestoreCollections
        ? firestoreCollections[item.collection as FirestoreCollectionName]
        : item.collection;
      const path = adminDocumentPath(collectionPath, item.id);
      logAdminWriteStart('delete', path);
      try {
        await deleteDoc(doc(getPromptFundFirestore(), collectionPath, item.id));
        logAdminWriteSuccess('delete', path);
      } catch (error) {
        logAdminWriteFailure('delete', path, error);
        throw new AdminFirestorePermissionError(path, 'delete', error);
      }
    }
  },
};
