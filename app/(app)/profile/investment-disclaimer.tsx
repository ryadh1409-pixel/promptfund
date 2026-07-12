import { LegalDocumentView } from '@/components/legal/LegalDocumentView';
import { Screen } from '@/components/ui/Primitives';
import { legalDocuments } from '@/constants/legal';

export default function InvestmentDisclaimerScreen() {
  return (
    <Screen eyebrow="Legal" title="Investment Disclaimer" subtitle="Important limits on Ai PromptFund’s role.">
      <LegalDocumentView document={legalDocuments.investmentDisclaimer} />
    </Screen>
  );
}
