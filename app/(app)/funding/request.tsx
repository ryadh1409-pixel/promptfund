import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, TextInput } from 'react-native';

import { Card, FieldPreview, PrimaryButton, Screen } from '@/components/ui/Primitives';
import { colors, radii, spacing } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { fundingService } from '@/services/fundingService';
import { projectService } from '@/services/projectService';
import type { Project } from '@/types/Project';

export default function FundingRequestScreen() {
  const router = useRouter();
  const { authUser } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState('');
  const [tool, setTool] = useState('');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadProjects() {
      if (!authUser) {
        return;
      }

      const nextProjects = await projectService.listProjectsByDeveloper(authUser.uid);
      setProjects(nextProjects);
      setProjectId(nextProjects[0]?.id ?? '');
    }

    loadProjects();
  }, [authUser]);

  async function handleCreateRequest() {
    if (!authUser) {
      setError('Sign in before requesting funding.');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      await fundingService.createFundingRequest({
        projectId,
        requestedBy: authUser.uid,
        amount: Number(amount),
        tool: tool.trim(),
        reason: reason.trim(),
        dueDate: dueDate.trim(),
      });
      router.replace('/investor-feed');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to create funding request.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Screen
      eyebrow="Funding Request"
      title="Ask for the exact tool budget you need."
      subtitle="PromptFund keeps requests small, specific, and tied to visible progress."
    >
      <Card>
        <TextInput
          placeholder="Project ID"
          placeholderTextColor={colors.subtle}
          value={projectId}
          onChangeText={setProjectId}
          style={styles.input}
        />
        <TextInput
          placeholder="Tool, for example Claude Max"
          placeholderTextColor={colors.subtle}
          value={tool}
          onChangeText={setTool}
          style={styles.input}
        />
        <TextInput
          placeholder="Amount, for example 100"
          placeholderTextColor={colors.subtle}
          keyboardType="numeric"
          value={amount}
          onChangeText={setAmount}
          style={styles.input}
        />
        <TextInput
          placeholder="Why this funding is needed"
          placeholderTextColor={colors.subtle}
          multiline
          value={reason}
          onChangeText={setReason}
          style={[styles.input, styles.textArea]}
        />
        <TextInput
          placeholder="Due date or milestone"
          placeholderTextColor={colors.subtle}
          value={dueDate}
          onChangeText={setDueDate}
          style={styles.input}
        />
        {projects.length === 0 ? (
          <Text style={styles.helpText}>Create a project first so PromptFund can attach this request to a build.</Text>
        ) : null}
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        <PrimaryButton
          label={isSaving ? 'Posting request...' : 'Post PromptFund request'}
          disabled={isSaving || projectId.length === 0 || amount.length === 0 || tool.length === 0}
          onPress={handleCreateRequest}
        />
      </Card>

      <FieldPreview
        label="Firestore target"
        value="fundingRequests: projectId, requestedBy, amount, tool, reason, status, dueDate"
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
    minHeight: 120,
    paddingTop: spacing.md,
    textAlignVertical: 'top',
  },
  helpText: {
    color: colors.muted,
    lineHeight: 20,
  },
  errorText: {
    color: colors.danger,
    lineHeight: 20,
  },
});
