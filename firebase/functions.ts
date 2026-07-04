import { getFunctions, type Functions } from 'firebase/functions';

import { requireCurrentFirebaseUser } from './auth';
import { firebaseConfig, getFirebaseApp } from './config';

export const PROMPTFUND_FUNCTIONS_REGION = 'us-central1';

/**
 * Returns the Functions instance only after Auth has restored and a fresh ID token
 * is available. The first getFunctions() call must happen after Auth registers its
 * interop provider, otherwise httpsCallable silently omits the Authorization header.
 */
export async function ensurePromptFundFunctions(): Promise<Functions> {
  const user = await requireCurrentFirebaseUser();
  await user.getIdToken();

  return getFunctions(getFirebaseApp(), PROMPTFUND_FUNCTIONS_REGION);
}

export function getCallableUploadDiagnostics() {
  return {
    functionsRegion: PROMPTFUND_FUNCTIONS_REGION,
    projectId: firebaseConfig.projectId,
  };
}
