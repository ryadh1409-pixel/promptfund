import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { addDoc, collection, getDoc, serverTimestamp } from 'firebase/firestore';
import { useState } from 'react';
import { Alert, Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { StartupPlayingCard } from '@/components/cards/StartupPlayingCard';
import { Card, PrimaryButton, Screen } from '@/components/ui/Primitives';
import { colors, radii, spacing } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { getPromptFundFirestore } from '@/firebase/firestore';
import { uploadStartupImage } from '@/firebase/storage';

function getExactFirebaseErrorMessage(error: unknown) {
  if (typeof error === 'object' && error !== null) {
    const code = 'code' in error ? String((error as { code?: unknown }).code ?? '') : '';
    const message = 'message' in error ? String((error as { message?: unknown }).message ?? '') : '';

    if (code && message) {
      return `${code}: ${message}`;
    }

    if (message) {
      return message;
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return String(error ?? 'Unknown Firebase error');
}

export default function CreateProjectScreen() {
  const router = useRouter();
  const { authUser, profile } = useAuth();
  const [title, setTitle] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handlePickImage() {
    setError(null);

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError('Photo library permission is required to upload an app screenshot.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      quality: 0.8,
      mediaTypes: ['images'],
    });

    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
    }
  }

  async function handleCreateProject() {
    const startupName = title.trim();
    const shortDescription = description.trim();
    const uid = authUser?.uid ?? null;

    console.log('[Publish] startupName', startupName);
    console.log('[Publish] description', shortDescription);
    console.log('[Publish] imageUri', imageUri);
    console.log('[Publish] uid', uid);

    setIsSaving(true);
    setError(null);

    if (!uid) {
      console.error('[Auth User Lookup Error]', { authUser });
      setError('Auth user lookup failed: no current Firebase user.');
      setIsSaving(false);
      return;
    }

    if (!imageUri) {
      setError('Upload an app screenshot before publishing.');
      setIsSaving(false);
      return;
    }

    let downloadUrl: string;

    try {
      const uploadResult = await uploadStartupImage({
        userId: uid,
        uri: imageUri,
      });

      console.log('[Publish] Firebase Storage upload result', {
        path: uploadResult.path,
        bucket: uploadResult.metadata.bucket,
        fullPath: uploadResult.metadata.fullPath,
        name: uploadResult.metadata.name,
        size: uploadResult.metadata.size,
        contentType: uploadResult.metadata.contentType,
      });
      downloadUrl = uploadResult.downloadUrl;
      console.log('[Storage] Download URL created', downloadUrl);
      console.log('[Publish] download URL', downloadUrl);
    } catch (storageError) {
      console.error('[Storage Upload Error]', storageError);
      setError(`Image upload failed: ${getExactFirebaseErrorMessage(storageError)}`);
      setIsSaving(false);
      return;
    }

    try {
      const payload = {
        startupName,
        description: shortDescription,
        ownerId: uid,
        imageUrl: downloadUrl,
        createdAt: serverTimestamp(),
      };
      console.log('[Publish] Firestore payload', payload);

      const reference = await addDoc(collection(getPromptFundFirestore(), 'projects'), payload);
      console.log('[Publish] Firestore write result', {
        id: reference.id,
        path: reference.path,
      });

      const createdDocument = await getDoc(reference);
      console.log('[Publish] Firestore document exists', {
        exists: createdDocument.exists(),
        path: reference.path,
      });

      if (!createdDocument.exists()) {
        throw new Error(`Firestore document was not found after create: ${reference.path}`);
      }

      Alert.alert('Startup card published', 'Your startup card was saved to My Cards.');
      router.replace('/deck');
    } catch (firestoreError) {
      console.error('[Firestore Create Error]', firestoreError);
      setError(`Firestore document creation failed: ${getExactFirebaseErrorMessage(firestoreError)}`);
      setIsSaving(false);
      return;
    }

    setIsSaving(false);
  }

  return (
    <Screen
      eyebrow="Entrepreneur"
      title="Create a startup card in 10 seconds."
      subtitle="Startup name. App screenshot. Short description. Publish."
    >
      <Card>
        <TextInput placeholder="Startup Name" placeholderTextColor={colors.subtle} value={title} onChangeText={setTitle} style={styles.input} />
        <Text style={styles.fieldLabel}>App Screenshot</Text>
        <Pressable accessibilityRole="button" onPress={handlePickImage} style={styles.uploadButton}>
          <Text style={styles.uploadText}>{imageUri ? 'Change App Screenshot' : 'Upload App Screenshot'}</Text>
        </Pressable>
        {imageUri ? <Image source={{ uri: imageUri }} style={styles.previewImage} /> : null}
        <TextInput
          placeholder="Short Description"
          placeholderTextColor={colors.subtle}
          multiline
          value={description}
          onChangeText={setDescription}
          style={[styles.input, styles.textArea]}
        />
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        <PrimaryButton
          label={isSaving ? 'Publishing...' : 'Publish Card'}
          disabled={isSaving || title.trim().length === 0 || !imageUri || description.trim().length === 0}
          onPress={handleCreateProject}
        />
      </Card>

      <View style={styles.preview}>
        <StartupPlayingCard
          card={{
            id: 'preview',
            title: title || 'Startup Name',
            tagline: description || 'Short description',
            description: description || 'Short description',
            goalAmount: 0,
            coverImage: imageUri ?? undefined,
            founderName: profile?.name ?? 'Entrepreneur',
            founderAvatar: profile?.avatar ?? 'PF',
            founderVerified: true,
            rank: 'J',
          }}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  input: {
    minHeight: 52,
    borderWidth: 1,
    borderColor: 'rgba(200, 162, 74, 0.36)',
    borderRadius: radii.md,
    backgroundColor: colors.panelMuted,
    color: colors.text,
    paddingHorizontal: spacing.md,
    fontSize: 15,
  },
  fieldLabel: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '900',
  },
  uploadButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
    borderWidth: 1,
    borderColor: colors.luxuryGold,
    borderRadius: radii.md,
    backgroundColor: 'rgba(200, 162, 74, 0.14)',
    paddingHorizontal: spacing.md,
  },
  uploadText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '900',
  },
  previewImage: {
    width: '100%',
    height: 220,
    borderRadius: radii.lg,
    backgroundColor: colors.panelMuted,
  },
  textArea: {
    minHeight: 132,
    paddingTop: spacing.md,
    textAlignVertical: 'top',
  },
  errorText: {
    color: colors.danger,
    lineHeight: 20,
  },
  preview: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: 360,
  },
});
