import * as admin from 'firebase-admin';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';

admin.initializeApp();

const maxStartupImageBytes = 5 * 1024 * 1024;

type UploadStartupImageInput = {
  base64?: unknown;
  fileName?: unknown;
  contentType?: unknown;
  userId?: unknown;
};

function assertString(value: unknown, fieldName: string) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new HttpsError('invalid-argument', `${fieldName} is required.`);
  }

  return value.trim();
}

function sanitizeFileName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, '-');
}

export const uploadStartupImage = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Sign in before uploading a startup image.');
  }

  const input = request.data as UploadStartupImageInput;
  const base64 = assertString(input.base64, 'base64');
  const fileName = sanitizeFileName(assertString(input.fileName, 'fileName'));
  const contentType = assertString(input.contentType, 'contentType');
  const userId = assertString(input.userId, 'userId');

  if (request.auth.uid !== userId) {
    throw new HttpsError('permission-denied', 'You can only upload startup images for your own account.');
  }

  if (!contentType.startsWith('image/')) {
    throw new HttpsError('invalid-argument', 'contentType must be an image type.');
  }

  const buffer = Buffer.from(base64, 'base64');

  if (buffer.byteLength > maxStartupImageBytes) {
    throw new HttpsError('invalid-argument', 'Startup image must be 5MB or smaller.');
  }

  const bucket = admin.storage().bucket();
  const path = `startup-images/${userId}/${fileName}`;

  try {
    await bucket.file(path).save(buffer, {
      metadata: {
        contentType,
      },
    });

    const [downloadURL] = await bucket.file(path).getSignedUrl({
      action: 'read',
      expires: '03-01-2500',
    });

    return {
      downloadURL,
      path,
    };
  } catch (error) {
    console.error('[Storage Upload Error]', error);
    throw new HttpsError('internal', 'Unable to upload startup image.');
  }
});

export const onNotificationCreated = onDocumentCreated('notifications/{notificationId}', async (event) => {
  const notification = event.data?.data();
  if (!notification?.userId || !notification?.title || !notification?.body) {
    return;
  }

  const tokenSnapshot = await admin
    .firestore()
    .collection('pushTokens')
    .where('userId', '==', notification.userId)
    .get();

  if (tokenSnapshot.empty) {
    return;
  }

  const messages = tokenSnapshot.docs.map((tokenDoc) => ({
    to: tokenDoc.data().token,
    sound: 'default',
    title: notification.title,
    body: notification.body,
    data: notification.data ?? {},
  }));

  try {
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messages),
    });
  } catch (error) {
    console.error('[Push Notification Error]', error);
  }
});
