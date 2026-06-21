import { deleteObject, getDownloadURL, getStorage, ref, uploadBytes } from 'firebase/storage';

import { getFirebaseApp } from './config';

export type AgreementArtifactKind = 'video' | 'audio' | 'transcript' | 'summary' | 'contract';

export const agreementArtifactNames: Record<AgreementArtifactKind, string> = {
  video: 'video.mp4',
  audio: 'audio.m4a',
  transcript: 'transcript.json',
  summary: 'summary.json',
  contract: 'contract.pdf',
};

export function getPromptFundStorage() {
  return getStorage(getFirebaseApp());
}

export function getAgreementArtifactPath(agreementId: string, kind: AgreementArtifactKind) {
  return `agreements/${agreementId}/${agreementArtifactNames[kind]}`;
}

export async function uploadAgreementArtifact({
  agreementId,
  kind,
  blob,
  contentType,
}: {
  agreementId: string;
  kind: AgreementArtifactKind;
  blob: Blob;
  contentType: string;
}) {
  const path = getAgreementArtifactPath(agreementId, kind);
  const reference = ref(getPromptFundStorage(), path);

  await uploadBytes(reference, blob, {
    contentType,
    customMetadata: {
      agreementId,
      artifactKind: kind,
    },
  });

  return {
    path,
    downloadUrl: await getDownloadURL(reference),
  };
}

export async function uploadJsonAgreementArtifact({
  agreementId,
  kind,
  value,
}: {
  agreementId: string;
  kind: Extract<AgreementArtifactKind, 'transcript' | 'summary'>;
  value: unknown;
}) {
  const blob = new Blob([JSON.stringify(value, null, 2)], {
    type: 'application/json',
  });

  return uploadAgreementArtifact({
    agreementId,
    kind,
    blob,
    contentType: 'application/json',
  });
}

export function getUserProfilePhotoPath(userId: string) {
  return `users/${userId}/profile.jpg`;
}

export async function uploadUserProfilePhoto({
  userId,
  uri,
}: {
  userId: string;
  uri: string;
}) {
  const response = await fetch(uri);
  const blob = await response.blob();
  const path = getUserProfilePhotoPath(userId);
  const reference = ref(getPromptFundStorage(), path);

  await uploadBytes(reference, blob, {
    contentType: 'image/jpeg',
    customMetadata: {
      userId,
      artifactKind: 'profilePhoto',
    },
  });

  return {
    path,
    downloadUrl: await getDownloadURL(reference),
  };
}

export async function deleteUserProfilePhoto(userId: string) {
  try {
    await deleteObject(ref(getPromptFundStorage(), getUserProfilePhotoPath(userId)));
  } catch (error) {
    // Missing profile photos should not block account deletion.
    console.info('[PromptFund Storage] profile photo delete skipped', { userId, error });
  }
}
