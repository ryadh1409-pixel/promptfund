import { useCallback, useEffect, useMemo, useState } from 'react';

import { agreementService, hashAgreementRecord } from '@/services/agreementService';
import { generateAgreementPdf } from '@/services/agreementPdfService';
import { askPromptFundWitness } from '@/services/openaiAgreementAgent';
import { generateAgreementSummary } from '@/services/openaiSummary';
import { transcribeAgreementAudio } from '@/services/openaiTranscript';
import { uploadAgreementArtifactFromUri, uploadJsonAgreementArtifact } from '@/firebase/storage';
import type {
  AgreementAgentStatus,
  AgreementCertificate,
  AgreementRole,
  AgreementRoom,
  AgreementStep,
  AgreementSummary,
  AgreementTranscript,
} from '@/types/Agreement';

const stepOrder: AgreementStep[] = [
  'opening',
  'founderIdentity',
  'investorIdentity',
  'termReview',
  'riskAcknowledgement',
  'termsAcknowledgement',
  'phaseGate',
  'contractSigning',
  'finalRecord',
];

const openingStatement = `Welcome to Ai PromptFund Agreement Room.

I am Ai PromptFund Witness, the official AI representative of Ai PromptFund.

This meeting is being recorded.

My role is to verify that both parties understand the proposed agreement before moving to the contract stage.`;

export function useAgreementRoom({
  agreementId,
  currentUserId,
}: {
  agreementId: string;
  currentUserId: string | undefined;
}) {
  const [room, setRoom] = useState<AgreementRoom | null>(null);
  const [transcript, setTranscript] = useState<AgreementTranscript[]>([]);
  const [summary, setSummary] = useState<AgreementSummary | null>(null);
  const [certificate, setCertificate] = useState<AgreementCertificate | null>(null);
  const [agentStatus, setAgentStatus] = useState<AgreementAgentStatus>('listening');
  const [agentMessage, setAgentMessage] = useState(openingStatement);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const currentRole = useMemo<Extract<AgreementRole, 'founder' | 'investor'>>(() => {
    if (!room || !currentUserId) {
      return 'investor';
    }

    return room.founderId === currentUserId ? 'founder' : 'investor';
  }, [currentUserId, room]);

  const reload = useCallback(async () => {
    if (!currentUserId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const nextRoom = await agreementService.ensureAgreementRoom({ agreementId, currentUserId });
      const nextTranscript = await agreementService.listTranscripts(agreementId);
      setRoom(nextRoom);
      setTranscript(nextTranscript);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load Agreement Room.');
    } finally {
      setIsLoading(false);
    }
  }, [agreementId, currentUserId]);

  useEffect(() => {
    reload();
  }, [reload]);

  const addTranscriptLine = useCallback(
    async ({ speaker, text }: { speaker: AgreementRole | string; text: string }) => {
      if (!room) {
        throw new Error('Agreement Room is not loaded.');
      }

      const line = await agreementService.addTranscript({
        agreementId,
        meetingId: room.meetingId,
        speaker,
        text,
        timestamp: new Date().toISOString(),
      });
      setTranscript((items) => [...items, line]);
      return line;
    },
    [agreementId, room],
  );

  const advanceWitness = useCallback(
    async (latestMessage: string) => {
      if (!room) {
        return;
      }

      setAgentStatus('processing');
      await addTranscriptLine({ speaker: currentRole, text: latestMessage });

      try {
        const witness = await askPromptFundWitness({
          room,
          transcript,
          latestMessage,
        });
        setAgentMessage(witness.message);
        setAgentStatus(witness.status);
        await addTranscriptLine({ speaker: 'agent', text: witness.message });
        const updatedRoom = await agreementService.updateAgreementRoom(agreementId, {
          currentStep: witness.nextStep,
        });
        if (updatedRoom) {
          setRoom(updatedRoom);
        }
      } catch (witnessError) {
        setAgentStatus('listening');
        setError(witnessError instanceof Error ? witnessError.message : 'Ai PromptFund Witness failed.');
      }
    },
    [addTranscriptLine, agreementId, currentRole, room, transcript],
  );

  const advanceLocalStep = useCallback(async () => {
    if (!room) {
      return;
    }

    const index = stepOrder.indexOf(room.currentStep);
    const nextStep = stepOrder[Math.min(index + 1, stepOrder.length - 1)];
    const updatedRoom = await agreementService.updateAgreementRoom(agreementId, {
      currentStep: nextStep,
    });
    if (updatedRoom) {
      setRoom(updatedRoom);
    }
  }, [agreementId, room]);

  const updateVerification = useCallback(
    async (
      input: Partial<
        Pick<
          AgreementRoom,
          'founderConfirmed' | 'investorConfirmed' | 'riskAcknowledged' | 'termsAcknowledged' | 'unresolvedDisputes'
        >
      >,
    ) => {
      if (!room) {
        return;
      }

      const updatedRoom = await agreementService.updateAgreementRoom(agreementId, input);
      if (updatedRoom) {
        setRoom(updatedRoom);
      }
    },
    [agreementId, room],
  );

  const runPhaseGate = useCallback(async () => {
    if (!room) {
      return;
    }

    const passed =
      room.founderConfirmed &&
      room.investorConfirmed &&
      room.riskAcknowledged &&
      room.termsAcknowledged &&
      !room.unresolvedDisputes;

    const updatedRoom = await agreementService.updateAgreementRoom(agreementId, {
      phase: passed ? 'phase2Contract' : 'phase1Verification',
      verificationStatus: passed ? 'passed' : 'blocked',
      participantsVerified: passed,
      currentStep: passed ? 'contractSigning' : 'phaseGate',
      phaseOneCompletedAt: passed ? new Date().toISOString() : undefined,
      witnessVerification: passed
        ? 'Ai PromptFund Witness verified identity confirmation, risk acknowledgement, terms acknowledgement, and no unresolved disputes.'
        : 'Ai PromptFund Witness blocked Phase 2 because verification requirements are incomplete or disputed.',
    });

    if (updatedRoom) {
      setRoom(updatedRoom);
    }
    setAgentStatus(passed ? 'verified' : 'listening');
    setAgentMessage(
      passed
        ? `Verification complete.

Both parties have acknowledged the proposed terms.

You may now proceed to Phase 2.`
        : 'Phase 1 is not complete. Resolve missing confirmations or disputes before moving to the contract stage.',
    );
  }, [agreementId, room]);

  const sign = useCallback(async () => {
    if (!currentUserId) {
      return;
    }

    const updatedRoom = await agreementService.signAgreement({
      agreementId,
      userId: currentUserId,
      role: currentRole,
    });

    if (updatedRoom) {
      setRoom(updatedRoom);
    }
  }, [agreementId, currentRole, currentUserId]);

  const completeMeeting = useCallback(
    async ({ audioUri, videoUri }: { audioUri: string | null; videoUri: string | null }) => {
      if (!room) {
        return;
      }

      setAgentStatus('processing');

      let finalTranscript = transcript;
      if (audioUri) {
        finalTranscript = await transcribeAgreementAudio({
          agreementId,
          meetingId: room.meetingId,
          audioUri,
        });
        await uploadJsonAgreementArtifact({ agreementId, kind: 'transcript', value: finalTranscript });
      }

      if (audioUri) {
        await uploadAgreementArtifactFromUri({
          agreementId,
          kind: 'audio',
          uri: audioUri,
          contentType: 'audio/m4a',
        });
      }

      if (videoUri) {
        await uploadAgreementArtifactFromUri({
          agreementId,
          kind: 'video',
          uri: videoUri,
          contentType: 'video/mp4',
        });
      }

      const summaryInput = await generateAgreementSummary({ room, transcript: finalTranscript });
      const savedSummary = await agreementService.saveSummary(agreementId, summaryInput);
      await uploadJsonAgreementArtifact({ agreementId, kind: 'summary', value: savedSummary });

      const agreementHash = await hashAgreementRecord({
        agreementId,
        room,
        transcript: finalTranscript,
        summary: savedSummary,
      });
      const savedCertificate = await agreementService.saveCertificate(agreementId, {
        identityVerified: room.participantsVerified,
        meetingRecorded: Boolean(audioUri || videoUri),
        transcriptGenerated: finalTranscript.length > 0,
        aiSummaryGenerated: true,
        agreementSigned: room.investorSigned && room.founderSigned,
        promptFundWitnessVerified: room.verificationStatus === 'passed',
        meetingRecordingId: room.meetingId,
        transcriptId: finalTranscript[0]?.meetingId ?? room.meetingId,
        agreementVersion: 1,
        timestamp: new Date().toISOString(),
        agreementHash,
      });
      const pdf = await generateAgreementPdf({
        room,
        transcript: finalTranscript,
        summary: savedSummary,
        certificate: savedCertificate,
      });
      await uploadAgreementArtifactFromUri({
        agreementId,
        kind: 'contract',
        uri: pdf.uri,
        contentType: 'application/pdf',
      });
      const archivedRoom = await agreementService.updateAgreementRoom(agreementId, {
        status: 'archived',
        recordingStatus: 'stored',
        endedAt: new Date().toISOString(),
        agreementHash,
        phase: 'archived',
      });

      setSummary(savedSummary);
      setCertificate(savedCertificate);
      if (archivedRoom) {
        setRoom(archivedRoom);
      }
      setAgentStatus('verified');
    },
    [agreementId, room, transcript],
  );

  return {
    room,
    transcript,
    summary,
    certificate,
    currentRole,
    agentStatus,
    agentMessage,
    isLoading,
    error,
    reload,
    addTranscriptLine,
    advanceWitness,
    advanceLocalStep,
    updateVerification,
    runPhaseGate,
    sign,
    completeMeeting,
  };
}
