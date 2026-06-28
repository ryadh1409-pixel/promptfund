import { LegalDocumentView } from '@/components/legal/LegalDocumentView';
import { Screen } from '@/components/ui/Primitives';
import { legalDocuments } from '@/constants/legal';

export default function AiDisclosureScreen() {
  return (
    <Screen eyebrow="Legal" title="AI Disclosure" subtitle="How AI-supported features should be understood.">
      <LegalDocumentView document={legalDocuments.aiDisclosure} />
    </Screen>
  );
}
