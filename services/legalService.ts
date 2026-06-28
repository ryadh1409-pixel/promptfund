import { doc, getDoc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';

import { defaultLegalVersions } from '@/constants/legal';
import { firestoreCollections, getPromptFundFirestore } from '@/firebase/firestore';
import type { LegalDocumentVersions } from '@/types/User';

const legalConfigId = 'current';

export const legalService = {
  async getCurrentVersions(): Promise<LegalDocumentVersions> {
    const snapshot = await getDoc(doc(getPromptFundFirestore(), firestoreCollections.legalConfig, legalConfigId));
    if (!snapshot.exists()) {
      return defaultLegalVersions;
    }

    return {
      ...defaultLegalVersions,
      ...(snapshot.data() as Partial<LegalDocumentVersions>),
    };
  },

  async acceptLegal(userId: string, versions: LegalDocumentVersions) {
    await updateDoc(doc(getPromptFundFirestore(), firestoreCollections.users, userId), {
      legalAcceptance: {
        accepted: true,
        acceptedAt: serverTimestamp(),
        ...versions,
      },
      legalOnboardingRequired: false,
    });
  },

  async updateVersions(versions: LegalDocumentVersions) {
    await setDoc(doc(getPromptFundFirestore(), firestoreCollections.legalConfig, legalConfigId), versions, { merge: true });
  },
};
