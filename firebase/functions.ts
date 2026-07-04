import { getFunctions, type Functions } from 'firebase/functions';

import { getFirebaseAuth } from './auth';
import { firebaseConfig, getFirebaseApp } from './config';

export const PROMPTFUND_FUNCTIONS_REGION = 'us-central1';

let promptFundFunctions: Functions | null = null;

/**
 * Returns the shared Functions instance for this app/region.
 * Auth must be initialized first so the Functions SDK can attach the auth interop.
 */
export function getPromptFundFunctions(): Functions {
  getFirebaseAuth();
  if (!promptFundFunctions) {
    promptFundFunctions = getFunctions(getFirebaseApp(), PROMPTFUND_FUNCTIONS_REGION);
  }
  return promptFundFunctions;
}

export function getCallableUploadDiagnostics() {
  return {
    functionsRegion: PROMPTFUND_FUNCTIONS_REGION,
    projectId: firebaseConfig.projectId,
  };
}
