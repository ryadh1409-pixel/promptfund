import { LegalDocumentView } from '@/components/legal/LegalDocumentView';
import { Screen } from '@/components/ui/Primitives';
import { legalDocuments } from '@/constants/legal';

export default function PrivacyScreen() {
  return (
    <Screen eyebrow="Legal" title="Privacy Policy" subtitle="How PromptFund handles account and agreement data.">
      <LegalDocumentView document={legalDocuments.privacy} />
    </Screen>
  );
}
