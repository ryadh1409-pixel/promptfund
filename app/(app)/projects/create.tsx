import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, TextInput } from 'react-native';

import { Card, FieldPreview, PrimaryButton, Screen } from '@/components/ui/Primitives';
import { colors, radii, spacing } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { projectService } from '@/services/projectService';

export default function CreateProjectScreen() {
  const router = useRouter();
  const { authUser } = useAuth();
  const [title, setTitle] = useState('');
  const [tagline, setTagline] = useState('');
  const [description, setDescription] = useState('');
  const [goalAmount, setGoalAmount] = useState('');
  const [tools, setTools] = useState('');
  const [milestones, setMilestones] = useState('');
  const [nextUpdate, setNextUpdate] = useState('');
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
        tagline: tagline.trim(),
        description: description.trim(),
        goalAmount: Number(goalAmount),
        tools: tools
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean),
        milestones: milestones
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean),
        nextUpdate: nextUpdate.trim(),
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
      eyebrow="PromptFund Project"
      title="Turn a precise tool budget into a funded build"
      subtitle="Package the investor-ready fields that will later save into the `projects` collection."
    >
      <Card>
        <TextInput placeholder="Project title" placeholderTextColor={colors.subtle} value={title} onChangeText={setTitle} style={styles.input} />
        <TextInput
          placeholder="Investor-ready tagline"
          placeholderTextColor={colors.subtle}
          value={tagline}
          onChangeText={setTagline}
          style={styles.input}
        />
        <TextInput
          placeholder="Project description"
          placeholderTextColor={colors.subtle}
          multiline
          value={description}
          onChangeText={setDescription}
          style={[styles.input, styles.textArea]}
        />
        <TextInput
          placeholder="Funding goal, for example 300"
          placeholderTextColor={colors.subtle}
          value={goalAmount}
          keyboardType="numeric"
          onChangeText={setGoalAmount}
          style={styles.input}
        />
        <TextInput
          placeholder="Tools, separated by commas"
          placeholderTextColor={colors.subtle}
          value={tools}
          onChangeText={setTools}
          style={styles.input}
        />
        <TextInput
          placeholder="Milestones, separated by commas"
          placeholderTextColor={colors.subtle}
          value={milestones}
          onChangeText={setMilestones}
          style={styles.input}
        />
        <TextInput
          placeholder="Next investor update"
          placeholderTextColor={colors.subtle}
          value={nextUpdate}
          onChangeText={setNextUpdate}
          style={styles.input}
        />
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        <PrimaryButton
          label={isSaving ? 'Publishing...' : 'Publish PromptFund project'}
          disabled={isSaving || title.length === 0 || goalAmount.length === 0}
          onPress={handleCreateProject}
        />
      </Card>

      <FieldPreview
        label="Firestore target"
        value="projects: title, tagline, description, goalAmount, tools, milestones, status, developerId"
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
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
    minHeight: 132,
    paddingTop: spacing.md,
    textAlignVertical: 'top',
  },
  errorText: {
    color: colors.danger,
    lineHeight: 20,
  },
});
