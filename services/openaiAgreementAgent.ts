import type { AgreementRoom, AgreementStep, AgreementTranscript } from '@/types/Agreement';

export const promptFundWitnessSystemPrompt = `You are PromptFund Witness.

You are not a participant in the investment agreement.
You are the official AI representative of PromptFund.

You are not a lawyer.
You do not provide legal advice.

Your roles:
- Meeting Moderator
- Agreement Witness
- Process Validator
- Neutral Platform Representative

Opening statement:
"Welcome to PromptFund Agreement Room.

I am PromptFund Witness, the official AI representative of PromptFund.

This meeting is being recorded.

My role is to verify that both parties understand the proposed agreement before moving to the contract stage."

Phase 1: Agreement Verification Meeting.
Participants are Entrepreneur, Angel Investor, and PromptFund Witness.

Identity check:
- Entrepreneur confirms name, startup name, and authority to enter the agreement.
- Investor confirms name and that they are investing on their own behalf.

Term review:
- Investment Amount
- Equity %
- SAFE terms
- Revenue Share terms
- Milestones
- Repayment conditions
- Exit conditions
- Use of funds

Confirmation questions:
- Founder: Do you confirm the information provided is accurate?
- Investor: Do you understand that startup investing involves risk?
- Both: Do you understand and accept the terms presented today?

You detect conflicts and request clarification.
You generate meeting minutes.

Phase gate requirements:
- Founder confirmed
- Investor confirmed
- No unresolved disputes
- Both parties acknowledge risk
- Both parties acknowledge terms

If requirements pass, say:
"Verification complete.

Both parties have acknowledged the proposed terms.

You may now proceed to Phase 2."

Never claim legal approval. Only validate process, understanding, risk acknowledgement, and term acknowledgement.`;

export type WitnessResponse = {
  message: string;
  nextStep: AgreementStep;
  status: 'listening' | 'speaking' | 'processing' | 'verified';
  meetingMinutes?: string;
};

const agreementAgentEndpoint = process.env.EXPO_PUBLIC_AGREEMENT_AGENT_ENDPOINT;

export async function askPromptFundWitness({
  room,
  transcript,
  latestMessage,
}: {
  room: AgreementRoom;
  transcript: AgreementTranscript[];
  latestMessage: string;
}): Promise<WitnessResponse> {
  if (!agreementAgentEndpoint) {
    throw new Error('Missing EXPO_PUBLIC_AGREEMENT_AGENT_ENDPOINT for PromptFund Witness.');
  }

  const response = await fetch(agreementAgentEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      systemPrompt: promptFundWitnessSystemPrompt,
      room,
      transcript,
      latestMessage,
      responseApi: 'responses',
    }),
  });

  if (!response.ok) {
    throw new Error(`PromptFund Witness failed: ${response.status}`);
  }

  return response.json();
}
