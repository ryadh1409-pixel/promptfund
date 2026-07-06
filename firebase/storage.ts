import * as FileSystem from 'expo-file-system/legacy';
import { deleteObject, getStorage, ref } from 'firebase/storage';

import { doc, getDoc } from 'firebase/firestore';

import { requireCurrentFirebaseUser } from './auth';
import { firebaseConfig, getFirebaseApp } from './config';
import { firestoreCollections, getPromptFundFirestore } from './firestore';
import { withFriendlyErrors } from '@/services/errorHandler';
import { logChatUploadError, logChatUploadStep } from '@/utils/chatUpload';

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
  const user = await requireCurrentFirebaseUser();
  return user.getIdToken();
}

function mediaUploadUrl(path: string) {
  return `https://firebasestorage.googleapis.com/v0/b/${firebaseConfig.storageBucket}/o?uploadType=media&name=${encodeURIComponent(path)}`;
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

async function ensureUploadableUri(uri: string, fileName: string) {
  if (uri.startsWith('file://')) {
    const info = await FileSystem.getInfoAsync(uri);
    if (info.exists) {
      return uri;
    }
  }

  const extension = fileName.includes('.') ? fileName.split('.').pop() : 'bin';
  const destination = `${FileSystem.cacheDirectory}chat-upload-${Date.now()}.${extension}`;
  logChatUploadStep('2a. Copying asset to cache', { sourceUri: uri, destination });
  await FileSystem.copyAsync({ from: uri, to: destination });
  return destination;
}

export async function uploadUriWithStorageRest({
  path,
  uri,
  contentType,
  fileName = 'attachment',
}: {
  path: string;
  uri: string;
  contentType: string;
  fileName?: string;
}) {
  logChatUploadStep('2. Uploading to Firebase Storage', { path, contentType, uri });
  const uploadableUri = await ensureUploadableUri(uri, fileName);
  const idToken = await getCurrentUserIdToken();

  const response = await FileSystem.uploadAsync(mediaUploadUrl(path), uploadableUri, {
    headers: {
      Authorization: `Bearer ${idToken}`,
      'Content-Type': contentType,
    },
    httpMethod: 'POST',
    uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
  });

  if (response.status < 200 || response.status >= 300) {
    const error = new Error(`Firebase Storage upload failed: ${response.status} ${response.body}`);
    logChatUploadError('2. Uploading to Firebase Storage', error);
    throw error;
  }

  const metadata = JSON.parse(response.body) as FirebaseStorageRestMetadata;
  const downloadUrl = getFirebaseDownloadUrl(path, metadata);
  logChatUploadStep('3. downloadURL returned', { path, downloadUrl });

  return {
    path,
    metadata: {
      bucket: metadata.bucket ?? firebaseConfig.storageBucket,
      fullPath: metadata.name ?? path,
      name: path.split('/').at(-1) ?? path,
      size: Number(metadata.size ?? 0),
      contentType: metadata.contentType ?? contentType,
    },
    downloadUrl,
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

async function assertDiscussionRoomUploadAccess(roomId: string, uploaderId: string) {
  const snapshot = await getDoc(doc(getPromptFundFirestore(), firestoreCollections.discussionRooms, roomId));
  if (!snapshot.exists()) {
    throw new Error(`Discussion room not found for upload (roomId=${roomId}).`);
  }

  const room = snapshot.data() as { founderId?: string; investorId?: string };
  const isParticipant = room.founderId === uploaderId || room.investorId === uploaderId;
  if (!isParticipant) {
    throw new Error(
      `Permission denied: user ${uploaderId} is not the founder or investor for discussion room ${roomId}.`,
    );
  }

  logChatUploadStep('2b. Discussion room participant verified', {
    roomId,
    uploaderId,
    founderId: room.founderId,
    investorId: room.investorId,
  });
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
  const path = getStartupImagePath(userId);
  try {
    return await uploadUriWithStorageRest({
      path,
      uri,
      contentType: 'image/jpeg',
    });
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
  const authUser = await requireCurrentFirebaseUser();
  const uploaderId = authUser.uid;
  if (userId !== uploaderId) {
    logChatUploadStep('Upload userId mismatch; using auth uid for storage path', { userId, uploaderId, roomId });
  }
  const fileName = `photo.${extensionForContentType(contentType)}`;
  const path = getDiscussionAttachmentPath({
    roomId,
    userId: uploaderId,
    fileName,
  });
  await assertDiscussionRoomUploadAccess(roomId, uploaderId);

  return uploadUriWithStorageRest({
    path,
    uri,
    contentType,
    fileName,
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
  const authUser = await requireCurrentFirebaseUser();
  const uploaderId = authUser.uid;
  if (userId !== uploaderId) {
    logChatUploadStep('Upload userId mismatch; using auth uid for storage path', { userId, uploaderId, roomId });
  }
  const path = getDiscussionAttachmentPath({
    roomId,
    userId: uploaderId,
    fileName,
  });
  await assertDiscussionRoomUploadAccess(roomId, uploaderId);

  return uploadUriWithStorageRest({
    path,
    uri,
    contentType,
    fileName,
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
  const path = getUserProfilePhotoPath(userId);
  console.info('[PromptFund DeleteAccount]', { operation: 'deleteObject', path: `storage://${path}`, status: 'start' });
  try {
    await withFriendlyErrors(async () => {
      await deleteObject(ref(getPromptFundStorage(), path));
    });
    console.info('[PromptFund DeleteAccount]', {
      operation: 'deleteObject',
      path: `storage://${path}`,
      status: 'success',
      success: true,
    });
  } catch (error) {
    const code = error && typeof error === 'object' && 'code' in error
      ? String((error as { code: string }).code)
      : 'unknown';
    const message = error instanceof Error ? error.message : String(error);

    if (code === 'storage/object-not-found') {
      console.info('[PromptFund DeleteAccount]', {
        operation: 'deleteObject',
        path: `storage://${path}`,
        status: 'skipped',
        success: true,
        errorCode: code,
        errorMessage: message,
      });
      return;
    }

    console.error('[PromptFund DeleteAccount]', {
      operation: 'deleteObject',
      path: `storage://${path}`,
      status: 'error',
      success: false,
      errorCode: code,
      errorMessage: message,
    });
    throw error;
  }
}
