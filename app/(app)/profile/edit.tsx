import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Image, StyleSheet, Text, TextInput, View } from 'react-native';

import { Card, LoadingState, PrimaryButton, Screen } from '@/components/ui/Primitives';
import { colors, radii, spacing } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { firebaseAuth } from '@/firebase/auth';
import { userService } from '@/services/userService';

type ImagePickerModule = typeof import('expo-image-picker');

export default function EditProfileScreen() {
  const router = useRouter();
  const { authUser, profile, refreshProfile } = useAuth();
  const [displayName, setDisplayName] = useState(profile?.displayName ?? profile?.name ?? '');
  const [username, setUsername] = useState(profile?.username ?? profile?.handle ?? '');
  const [photoURL, setPhotoURL] = useState(profile?.photoURL ?? '');
  const [bio, setBio] = useState(profile?.bio ?? '');
  const [location, setLocation] = useState(profile?.location ?? '');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isImagePickerUnavailable, setIsImagePickerUnavailable] = useState(false);

  async function loadImagePicker(): Promise<ImagePickerModule | null> {
    try {
      return await import('expo-image-picker');
    } catch (loadError) {
      console.info('[PromptFund Profile] ImagePicker unavailable', loadError);
      setIsImagePickerUnavailable(true);
      return null;
    }
  }

  async function handlePickImage() {
    if (!authUser) {
      return;
    }

    const ImagePicker = await loadImagePicker();
    if (!ImagePicker) {
      setError('Profile photo editing temporarily unavailable');
      return;
    }

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError('Photo library permission is required to change your profile photo.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.88,
      mediaTypes: ['images'],
    });

    if (!result.canceled) {
      setIsSaving(true);
      try {
        const nextPhotoURL = await userService.uploadProfilePhoto(authUser.uid, result.assets[0].uri);
        setPhotoURL(nextPhotoURL);
        await firebaseAuth.updateProfile({ photoURL: nextPhotoURL });
        await refreshProfile();
      } catch (uploadError) {
        setError(uploadError instanceof Error ? uploadError.message : 'Unable to upload profile photo.');
      } finally {
        setIsSaving(false);
      }
    }
  }

  async function handleSave() {
    if (!authUser) {
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const normalizedUsername = username.trim().replace(/^@+/, '');
      await userService.updateProfile(authUser.uid, {
        displayName: displayName.trim(),
        username: normalizedUsername.trim(),
        photoURL,
        bio: bio.trim(),
        location: location.trim(),
      });
      await firebaseAuth.updateProfile({
        displayName: displayName.trim(),
        photoURL: photoURL || undefined,
      });
      await refreshProfile();
      router.back();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save profile.');
    } finally {
      setIsSaving(false);
    }
  }

  if (!profile) {
    return (
      <Screen eyebrow="Account" title="Edit Profile" subtitle="Loading your profile.">
        <LoadingState label="Loading profile" />
      </Screen>
    );
  }

  return (
    <Screen eyebrow="Account" title="Edit Profile" subtitle="Manage your public Ai PromptFund identity.">
      <Card>
        <View style={styles.photoRow}>
          {photoURL ? (
            <Image source={{ uri: photoURL }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarFallback}>
              <Text style={styles.avatarText}>{profile.avatar}</Text>
            </View>
          )}
          <View style={styles.photoActions}>
            <PrimaryButton label={isSaving ? 'Uploading...' : 'Change Photo'} variant="secondary" onPress={handlePickImage} />
            {isImagePickerUnavailable ? (
              <Text style={styles.unavailableText}>Profile photo editing temporarily unavailable</Text>
            ) : null}
          </View>
        </View>
        <TextInput placeholder="Full Name" placeholderTextColor={colors.subtle} value={displayName} onChangeText={setDisplayName} style={styles.input} />
        <TextInput placeholder="Username" placeholderTextColor={colors.subtle} value={username} onChangeText={setUsername} autoCapitalize="none" style={styles.input} />
        <TextInput placeholder="Bio" placeholderTextColor={colors.subtle} value={bio} onChangeText={setBio} multiline style={[styles.input, styles.textArea]} />
        <TextInput placeholder="Location" placeholderTextColor={colors.subtle} value={location} onChangeText={setLocation} style={styles.input} />
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        <PrimaryButton label={isSaving ? 'Saving...' : 'Save Profile'} disabled={isSaving || displayName.length === 0 || username.length === 0} onPress={handleSave} />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  photoRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
  },
  avatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.pokerRed,
  },
  avatarText: {
    color: colors.text,
    fontSize: 26,
    fontWeight: '900',
  },
  photoActions: {
    flex: 1,
    gap: spacing.sm,
  },
  unavailableText: {
    color: colors.warning,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
  },
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
  textArea: {
    minHeight: 112,
    paddingTop: spacing.md,
    textAlignVertical: 'top',
  },
  errorText: {
    color: colors.danger,
    lineHeight: 20,
  },
});
