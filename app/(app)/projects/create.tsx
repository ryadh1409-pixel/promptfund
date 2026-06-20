import { StyleSheet, TextInput } from 'react-native';

import { Card, FieldPreview, PrimaryLink, Screen } from '@/components/ui/Primitives';
import { colors, radii, spacing } from '@/constants/theme';

export default function CreateProjectScreen() {
  return (
    <Screen
      eyebrow="Create Project"
      title="Turn a small tool budget into a funded build."
      subtitle="This mock form previews the fields that will later save into the `projects` collection."
    >
      <Card>
        <TextInput editable={false} value="AI Changelog Copilot" style={styles.input} />
        <TextInput
          editable={false}
          value="Summarize commits into investor-friendly progress updates."
          style={styles.input}
        />
        <TextInput
          editable={false}
          multiline
          value="I need funding for Cursor, Claude, and a small hosting plan to build an MVP that watches GitHub commits and drafts weekly updates."
          style={[styles.input, styles.textArea]}
        />
        <TextInput editable={false} value="$300 goal" style={styles.input} />
        <PrimaryLink href="/dashboard" label="Publish mock project" />
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
});
