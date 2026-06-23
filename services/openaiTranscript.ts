import type { AgreementTranscript } from '@/types/Agreement';

const transcriptEndpoint = process.env.EXPO_PUBLIC_AGREEMENT_TRANSCRIPT_ENDPOINT;
type FormDataValue = Parameters<FormData['append']>[1];

export async function transcribeAgreementAudio({
  agreementId,
  meetingId,
  audioUri,
}: {
  agreementId: string;
  meetingId: string;
  audioUri: string;
}): Promise<AgreementTranscript[]> {
  if (!transcriptEndpoint) {
    throw new Error('Missing EXPO_PUBLIC_AGREEMENT_TRANSCRIPT_ENDPOINT for OpenAI transcription.');
  }

  const formData = new FormData();
  formData.append('agreementId', agreementId);
  formData.append('meetingId', meetingId);
  formData.append('audio', {
    uri: audioUri,
    name: 'audio.m4a',
    type: 'audio/m4a',
  } as unknown as FormDataValue);

  const response = await fetch(transcriptEndpoint, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Agreement transcription failed: ${response.status}`);
  }

  return response.json();
}
