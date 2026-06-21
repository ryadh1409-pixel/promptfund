import type { AgreementRoom, AgreementSummary, AgreementTranscript } from '@/types/Agreement';

const summaryEndpoint = process.env.EXPO_PUBLIC_AGREEMENT_SUMMARY_ENDPOINT;

export async function generateAgreementSummary({
  room,
  transcript,
}: {
  room: AgreementRoom;
  transcript: AgreementTranscript[];
}): Promise<Omit<AgreementSummary, 'id' | 'agreementId' | 'generatedAt'>> {
  if (!summaryEndpoint) {
    throw new Error('Missing EXPO_PUBLIC_AGREEMENT_SUMMARY_ENDPOINT for OpenAI summary generation.');
  }

  const response = await fetch(summaryEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      room,
      transcript,
      requiredSections: [
        'Executive Summary',
        'Investment Amount',
        'Equity Percentage',
        'Repayment Terms',
        'Investor Confirmation',
        'Founder Confirmation',
        'Risk Acknowledgement',
        'Meeting Outcome',
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`Agreement summary generation failed: ${response.status}`);
  }

  return response.json();
}
