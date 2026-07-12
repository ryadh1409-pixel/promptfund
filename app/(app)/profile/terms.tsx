import { LegalDocumentView } from '@/components/legal/LegalDocumentView';
import { Screen } from '@/components/ui/Primitives';
import { legalDocuments } from '@/constants/legal';

export default function TermsScreen() {
  return (
    <Screen eyebrow="Legal" title="Terms of Service" subtitle="Ai PromptFund platform terms.">
      <LegalDocumentView document={legalDocuments.terms} />
    </Screen>
  );
}
