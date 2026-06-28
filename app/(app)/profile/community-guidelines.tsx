import { LegalDocumentView } from '@/components/legal/LegalDocumentView';
import { Screen } from '@/components/ui/Primitives';
import { legalDocuments } from '@/constants/legal';

export default function CommunityGuidelinesScreen() {
  return (
    <Screen eyebrow="Legal" title="Community Guidelines" subtitle="Rules for professional founder and angel investor interaction.">
      <LegalDocumentView document={legalDocuments.community} />
    </Screen>
  );
}
