import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { StartupPlayingCard } from '@/components/cards/StartupPlayingCard';
import { Card, PrimaryButton, Screen } from '@/components/ui/Primitives';
import { colors, radii, spacing } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { projectService } from '@/services/projectService';

export default function CreateProjectScreen() {
  const router = useRouter();
  const { authUser, profile } = useAuth();
  const [title, setTitle] = useState('');
  const [coverImage, setCoverImage] = useState('');
  const [description, setDescription] = useState('');
  const [goalAmount, setGoalAmount] = useState('');
  const [equityOffered, setEquityOffered] = useState('');
  const [metric, setMetric] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreateProject() {
    if (!authUser) {
      setError('Sign in before creating a project.');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const project = await projectService.createProject({
        developerId: authUser.uid,
        ownerId: authUser.uid,
        title: title.trim(),
        tagline: metric.trim(),
        description: description.trim(),
        goalAmount: Number(goalAmount),
        equityOffered: Number(equityOffered),
        metric: metric.trim(),
        coverImage: coverImage.trim(),
        founderName: profile?.name ?? 'Entrepreneur',
        founderAvatar: profile?.avatar ?? 'PF',
        founderVerified: true,
        rank: 'J',
        tools: ['Startup Card'],
        milestones: ['Start discussion', 'Agree terms', 'Close deal'],
        nextUpdate: 'Ready for investor discussion',
      });
      router.replace(`/projects/${project.id}`);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Unable to create project.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Screen
      eyebrow="Entrepreneur"
      title="My Startup"
      subtitle="Create your startup card, raise capital, and track investor matches."
    >
      <Card>
        <TextInput placeholder="Startup Name" placeholderTextColor={colors.subtle} value={title} onChangeText={setTitle} style={styles.input} />
        <TextInput
          placeholder="Cover Image URL"
          placeholderTextColor={colors.subtle}
          value={coverImage}
          onChangeText={setCoverImage}
          style={styles.input}
        />
        <TextInput
          placeholder="Funding Goal"
          placeholderTextColor={colors.subtle}
          value={goalAmount}
          keyboardType="numeric"
          onChangeText={setGoalAmount}
          style={styles.input}
        />
        <TextInput
          placeholder="Equity Offered"
          placeholderTextColor={colors.subtle}
          value={equityOffered}
          keyboardType="numeric"
          onChangeText={setEquityOffered}
          style={styles.input}
        />
        <TextInput
          placeholder="Short Description"
          placeholderTextColor={colors.subtle}
          multiline
          value={description}
          onChangeText={setDescription}
          style={[styles.input, styles.textArea]}
        />
        <TextInput
          placeholder="One Metric, for example 1,200 Active Users"
          placeholderTextColor={colors.subtle}
          value={metric}
          onChangeText={setMetric}
          style={styles.input}
        />
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        <PrimaryButton
          label={isSaving ? 'Publishing...' : 'Publish'}
          disabled={isSaving || title.length === 0 || goalAmount.length === 0 || metric.length === 0}
          onPress={handleCreateProject}
        />
      </Card>

      <View style={styles.preview}>
        <StartupPlayingCard
          card={{
            id: 'preview',
            title: title || 'Startup Name',
            tagline: metric || 'One traction metric',
            description: description || 'Short description',
            goalAmount: Number(goalAmount) || 50000,
            equityOffered: Number(equityOffered) || 4,
            metric: metric || '1,200 Active Users',
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
