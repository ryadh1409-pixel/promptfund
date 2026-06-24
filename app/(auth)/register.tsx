import { Link } from 'expo-router';
import { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Card, PrimaryButton, Screen } from '@/components/ui/Primitives';
import { colors, radii, spacing } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';

type ImagePickerModule = typeof import('expo-image-picker');

export default function RegisterScreen() {
  const { error, loading, register } = useAuth();
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [bio, setBio] = useState('');
  const [location, setLocation] = useState('');
  const [stack, setStack] = useState('');
  const [profilePhotoUri, setProfilePhotoUri] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [isImagePickerUnavailable, setIsImagePickerUnavailable] = useState(false);

  async function loadImagePicker(): Promise<ImagePickerModule | null> {
    try {
      return await import('expo-image-picker');
    } catch (loadError) {
      console.info('[PromptFund Registration] ImagePicker unavailable', loadError);
      setIsImagePickerUnavailable(true);
      return null;
    }
  }

  async function handleChoosePhoto() {
    setPhotoError(null);
    const ImagePicker = await loadImagePicker();
    if (!ImagePicker) {
      setPhotoError('Profile photo editing temporarily unavailable');
      return;
    }

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setPhotoError('Photo library permission is required to choose a profile photo.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.88,
      mediaTypes: ['images'],
    });

    if (!result.canceled) {
      setProfilePhotoUri(result.assets[0].uri);
    }
  }

  async function handleTakePhoto() {
    setPhotoError(null);
    const ImagePicker = await loadImagePicker();
    if (!ImagePicker) {
      setPhotoError('Profile photo editing temporarily unavailable');
      return;
    }

    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      setPhotoError('Camera permission is required to take a profile photo.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.88,
      mediaTypes: ['images'],
    });

    if (!result.canceled) {
      setProfilePhotoUri(result.assets[0].uri);
    }
  }

  async function handleRegister() {
    const normalizedUsername = username.trim().replace(/^@+/, '');
    const avatar = name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('');

    await register({
      email: email.trim(),
      password,
      displayName: name.trim(),
      name: name.trim(),
      handle: normalizedUsername,
      username: normalizedUsername,
      role: 'angel_investor',
      roles: ['investor'],
      activeRole: 'investor',
      intent: 'investor',
      hasChosenPath: false,
      avatar: avatar || 'PF',
      profilePhotoUri: profilePhotoUri ?? undefined,
      bio: bio.trim(),
      location: location.trim(),
      stack: stack
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
    });
  }

  return (
    <Screen
      eyebrow="Create profile"
      title="Create Account"
      subtitle="Create your PromptFund identity. You will choose your path next."
    >
      <Card>
        <>
            <View style={styles.photoBlock}>
              {profilePhotoUri ? (
                <Image source={{ uri: profilePhotoUri }} style={styles.profilePhoto} />
              ) : (
                <View style={styles.photoPlaceholder}>
                  <Text style={styles.photoPlaceholderText}>PF</Text>
                </View>
              )}
              <Text style={styles.photoLabel}>Professional profile photo</Text>
              <View style={styles.photoActions}>
                <Pressable accessibilityRole="button" onPress={handleTakePhoto} style={styles.photoButton}>
                  <Text style={styles.photoButtonText}>Take Photo</Text>
                </Pressable>
                <Pressable accessibilityRole="button" onPress={handleChoosePhoto} style={styles.photoButton}>
                  <Text style={styles.photoButtonText}>Choose From Library</Text>
                </Pressable>
              </View>
              {photoError || isImagePickerUnavailable ? (
                <Text style={styles.errorText}>{photoError ?? 'Profile photo editing temporarily unavailable'}</Text>
              ) : null}
            </View>
            <TextInput
              placeholder="Full name"
              placeholderTextColor={colors.subtle}
              style={styles.input}
              value={name}
              onChangeText={setName}
            />
            <TextInput
              placeholder="Username"
              placeholderTextColor={colors.subtle}
              style={styles.input}
              value={username}
              autoCapitalize="none"
              onChangeText={(value) => setUsername(value.replace(/^@+/, ''))}
            />
            <TextInput
              placeholder="Email"
              placeholderTextColor={colors.subtle}
              style={styles.input}
              value={email}
              autoCapitalize="none"
              keyboardType="email-address"
              onChangeText={setEmail}
            />
            <TextInput
              placeholder="Password"
              placeholderTextColor={colors.subtle}
              secureTextEntry
              style={styles.input}
              value={password}
              onChangeText={setPassword}
            />
            <TextInput
              placeholder="Location"
              placeholderTextColor={colors.subtle}
              style={styles.input}
              value={location}
              onChangeText={setLocation}
            />
            <TextInput
              placeholder="Bio or startup focus"
              placeholderTextColor={colors.subtle}
              multiline
              style={[styles.input, styles.textArea]}
              value={bio}
              onChangeText={setBio}
            />
            <TextInput
              placeholder="Stack, interests, or sectors, separated by commas"
              placeholderTextColor={colors.subtle}
              style={styles.input}
              value={stack}
              onChangeText={setStack}
            />
        </>
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        <PrimaryButton
          label={loading ? 'Creating account...' : 'Create account'}
          disabled={loading || name.length === 0 || email.length === 0 || password.length === 0}
          onPress={handleRegister}
        />
        <View style={styles.footerRow}>
          <Text style={styles.footerText}>Already registered?</Text>
          <Link href="/login" asChild>
            <Text style={styles.footerLink}>Sign in</Text>
          </Link>
        </View>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  photoBlock: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  profilePhoto: {
    width: 116,
    height: 116,
    borderWidth: 2,
    borderColor: colors.luxuryGold,
    borderRadius: 58,
    backgroundColor: colors.panelMuted,
  },
  photoPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 116,
    height: 116,
    borderWidth: 1,
    borderColor: 'rgba(200, 162, 74, 0.42)',
    borderRadius: 58,
    backgroundColor: colors.panelMuted,
  },
  photoPlaceholderText: {
    color: colors.luxuryGold,
    fontSize: 30,
    fontWeight: '900',
  },
  photoLabel: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '900',
  },
  photoActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    justifyContent: 'center',
  },
  photoButton: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.pill,
    backgroundColor: colors.black,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  photoButtonText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '900',
  },
  input: {
    minHeight: 52,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    backgroundColor: colors.black,
    color: colors.text,
    paddingHorizontal: spacing.md,
    fontSize: 15,
  },
  textArea: {
    minHeight: 96,
    paddingTop: spacing.md,
    textAlignVertical: 'top',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  footerText: {
    color: colors.muted,
  },
  footerLink: {
    color: colors.accent,
    fontWeight: '800',
  },
  errorText: {
    color: colors.danger,
    lineHeight: 20,
  },
});
