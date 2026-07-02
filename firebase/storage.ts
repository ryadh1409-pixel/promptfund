import * as FileSystem from 'expo-file-system/legacy';
import { getAuth } from 'firebase/auth';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { deleteObject, getStorage, ref } from 'firebase/storage';

import { firebaseConfig, getFirebaseApp } from './config';
import { withFriendlyErrors } from '@/services/errorHandler';

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

type FirebaseStorageRestMetadata = {
  bucket?: string;
  contentType?: string;
  downloadTokens?: string;
  mediaLink?: string;
  name?: string;
  size?: string;
};

async function getCurrentUserIdToken() {
  const user = getAuth(getFirebaseApp()).currentUser;

  if (!user) {
    throw new Error('Sign in before uploading files.');
  }

  return user.getIdToken();
}

function mediaUploadUrl(path: string) {
  return `https://firebasestorage.googleapis.com/v0/b/${firebaseConfig.storageBucket}/o?name=${encodeURIComponent(path)}`;
}

function getFirebaseDownloadUrl(path: string, metadata: FirebaseStorageRestMetadata) {
  if (metadata.downloadTokens) {
    const token = metadata.downloadTokens.split(',')[0];
    return `https://firebasestorage.googleapis.com/v0/b/${metadata.bucket ?? firebaseConfig.storageBucket}/o/${encodeURIComponent(
      path,
    )}?alt=media&token=${token}`;
  }

  if (metadata.mediaLink) {
    return metadata.mediaLink;
  }

  return `https://firebasestorage.googleapis.com/v0/b/${metadata.bucket ?? firebaseConfig.storageBucket}/o/${encodeURIComponent(
    path,
  )}?alt=media`;
}

async function uploadUriWithStorageRest({
  path,
  uri,
  contentType,
}: {
  path: string;
  uri: string;
  contentType: string;
}) {
  const idToken = await getCurrentUserIdToken();

  const response = await FileSystem.uploadAsync(mediaUploadUrl(path), uri, {
    headers: {
      Authorization: `Bearer ${idToken}`,
      'Content-Type': contentType,
    },
    httpMethod: 'POST',
    uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
  });

  if (response.status < 200 || response.status >= 300) {
    throw new Error(`Firebase Storage upload failed: ${response.status} ${response.body}`);
  }

  const metadata = JSON.parse(response.body) as FirebaseStorageRestMetadata;

  return {
    path,
    metadata: {
      bucket: metadata.bucket ?? firebaseConfig.storageBucket,
      fullPath: metadata.name ?? path,
      name: path.split('/').at(-1) ?? path,
      size: Number(metadata.size ?? 0),
      contentType: metadata.contentType ?? contentType,
    },
    downloadUrl: getFirebaseDownloadUrl(path, metadata),
  };
}

async function uploadTextWithStorageRest({
  path,
  value,
  contentType,
}: {
  path: string;
  value: string;
  contentType: string;
}) {
  const idToken = await getCurrentUserIdToken();

  const response = await fetch(mediaUploadUrl(path), {
    body: value,
    headers: {
      Authorization: `Bearer ${idToken}`,
      'Content-Type': contentType,
    },
    method: 'POST',
  });

  if (!response.ok) {
    throw new Error(`Firebase Storage upload failed: ${response.status} ${await response.text()}`);
  }

  const metadata = (await response.json()) as FirebaseStorageRestMetadata;

  return {
    path,
    downloadUrl: getFirebaseDownloadUrl(path, metadata),
  };
}

export async function uploadAgreementArtifactFromUri({
  agreementId,
  kind,
  uri,
  contentType,
}: {
  agreementId: string;
  kind: AgreementArtifactKind;
  uri: string;
  contentType: string;
}): Promise<{ path: string; downloadUrl: string }> {
  return uploadUriWithStorageRest({
    path: getAgreementArtifactPath(agreementId, kind),
    uri,
    contentType,
  });
}

export async function uploadJsonAgreementArtifact({
  agreementId,
  kind,
  value,
}: {
  agreementId: string;
  kind: Extract<AgreementArtifactKind, 'transcript' | 'summary'>;
  value: unknown;
}): Promise<{ path: string; downloadUrl: string }> {
  return uploadTextWithStorageRest({
    path: getAgreementArtifactPath(agreementId, kind),
    value: JSON.stringify(value, null, 2),
    contentType: 'application/json',
  });
}

export function getUserProfilePhotoPath(userId: string) {
  return `users/${userId}/profile.jpg`;
}

export function getStartupImagePath(userId: string) {
  return `startup-images/${userId}/${Date.now()}.jpg`;
}

function sanitizeStorageName(value: string) {
  return value
    .trim()
    .replace(/[^A-Za-z0-9._-]/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 120) || 'attachment';
}

function extensionForContentType(contentType: string) {
  if (contentType.includes('png')) return 'png';
  if (contentType.includes('webp')) return 'webp';
  if (contentType.includes('gif')) return 'gif';
  return 'jpg';
}

export function getDiscussionAttachmentPath({
  roomId,
  userId,
  fileName,
}: {
  roomId: string;
  userId: string;
  fileName: string;
}) {
  return `discussion-attachments/${roomId}/${userId}/${Date.now()}-${sanitizeStorageName(fileName)}`;
}

export function getSupportScreenshotPath({
  ticketId,
  userId,
  fileName,
}: {
  ticketId: string;
  userId: string;
  fileName: string;
}) {
  return `support-tickets/${userId}/${ticketId}/${Date.now()}-${sanitizeStorageName(fileName)}`;
}

export async function uploadUserProfilePhoto({
  userId,
  uri,
}: {
  userId: string;
  uri: string;
}): Promise<{ path: string; downloadUrl: string }> {
  const upload = await withFriendlyErrors(async () => {
    return uploadUriWithStorageRest({
      path: getUserProfilePhotoPath(userId),
      uri,
      contentType: 'image/jpeg',
    });
  });

  return {
    path: upload.path,
    downloadUrl: upload.downloadUrl,
  };
}

export async function uploadStartupImage({
  userId,
  uri,
}: {
  userId: string;
  uri: string;
}): Promise<{ path: string; downloadUrl: string }> {
  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  const fileName = `${Date.now()}.jpg`;

  try {
    const callUpload = httpsCallable(getFunctions(getFirebaseApp(), 'us-central1'), 'uploadStartupImage');
    const result = await callUpload({ base64, fileName, contentType: 'image/jpeg', userId });
    const { downloadURL, path } = result.data as { downloadURL: string; path: string };
    return { path, downloadUrl: downloadURL };
  } catch (error) {
    console.error('[Storage Upload Error]', error);
    if (error instanceof Error) console.error('[Storage Upload Error Stack]', error.stack);
    throw error;
  }
}

export async function uploadDiscussionImageAttachment({
  roomId,
  userId,
  uri,
  contentType = 'image/jpeg',
}: {
  roomId: string;
  userId: string;
  uri: string;
  contentType?: string;
}) {
  const path = getDiscussionAttachmentPath({
    roomId,
    userId,
    fileName: `photo.${extensionForContentType(contentType)}`,
  });

  return uploadUriWithStorageRest({
    path,
    uri,
    contentType,
  });
}

export async function uploadDiscussionDocumentAttachment({
  roomId,
  userId,
  uri,
  fileName,
  contentType,
}: {
  roomId: string;
  userId: string;
  uri: string;
  fileName: string;
  contentType: string;
}) {
  const path = getDiscussionAttachmentPath({
    roomId,
    userId,
    fileName,
  });

  return uploadUriWithStorageRest({
    path,
    uri,
    contentType,
  });
}

export async function uploadSupportScreenshot({
  ticketId,
  userId,
  uri,
  contentType = 'image/jpeg',
}: {
  ticketId: string;
  userId: string;
  uri: string;
  contentType?: string;
}) {
  return uploadUriWithStorageRest({
    path: getSupportScreenshotPath({
      ticketId,
      userId,
      fileName: `screenshot.${extensionForContentType(contentType)}`,
    }),
    uri,
    contentType,
  });
}

export async function deleteUserProfilePhoto(userId: string) {
  try {
    await withFriendlyErrors(async () => {
      await deleteObject(ref(getPromptFundStorage(), getUserProfilePhotoPath(userId)));
    });
  } catch (error) {
    // Missing profile photos should not block account deletion.
    console.info('[PromptFund Storage] profile photo delete skipped', { userId, error });
  }
}
