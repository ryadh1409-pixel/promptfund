"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.onNotificationCreated = exports.uploadStartupImage = void 0;
const admin = __importStar(require("firebase-admin"));
const firestore_1 = require("firebase-functions/v2/firestore");
const https_1 = require("firebase-functions/v2/https");
admin.initializeApp();
const maxStartupImageBytes = 5 * 1024 * 1024;
function assertString(value, fieldName) {
    if (typeof value !== 'string' || value.trim().length === 0) {
        throw new https_1.HttpsError('invalid-argument', `${fieldName} is required.`);
    }
    return value.trim();
}
function sanitizeFileName(fileName) {
    return fileName.replace(/[^a-zA-Z0-9._-]/g, '-');
}
exports.uploadStartupImage = (0, https_1.onCall)(async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'Sign in before uploading a startup image.');
    }
    const input = request.data;
    const base64 = assertString(input.base64, 'base64');
    const fileName = sanitizeFileName(assertString(input.fileName, 'fileName'));
    const contentType = assertString(input.contentType, 'contentType');
    const userId = assertString(input.userId, 'userId');
    if (request.auth.uid !== userId) {
        throw new https_1.HttpsError('permission-denied', 'You can only upload startup images for your own account.');
    }
    if (!contentType.startsWith('image/')) {
        throw new https_1.HttpsError('invalid-argument', 'contentType must be an image type.');
    }
    const buffer = Buffer.from(base64, 'base64');
    if (buffer.byteLength > maxStartupImageBytes) {
        throw new https_1.HttpsError('invalid-argument', 'Startup image must be 5MB or smaller.');
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
    }
    catch (error) {
        console.error('[Storage Upload Error]', error);
        throw new https_1.HttpsError('internal', 'Unable to upload startup image.');
    }
});
exports.onNotificationCreated = (0, firestore_1.onDocumentCreated)('notifications/{notificationId}', async (event) => {
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
    }
    catch (error) {
        console.error('[Push Notification Error]', error);
    }
});
//# sourceMappingURL=index.js.map