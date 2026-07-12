import { digestStringAsync, CryptoDigestAlgorithm } from 'expo-crypto';

import { firestoreAdapter } from '@/firebase/firestore';
import { getAgreementArtifactPath } from '@/firebase/storage';
import type {
  AgreementCertificate,
  AgreementParticipant,
  AgreementRecordInput,
  AgreementRoom,
  AgreementSignatureInput,
  AgreementStoragePaths,
  AgreementSummary,
  AgreementTranscript,
  InvestmentContract,
  InvestmentContractVersion,
} from '@/types/Agreement';

function nowIso() {
  return new Date().toISOString();
}

export function buildAgreementStoragePaths(agreementId: string): AgreementStoragePaths {
  return {
    video: getAgreementArtifactPath(agreementId, 'video'),
    audio: getAgreementArtifactPath(agreementId, 'audio'),
    transcript: getAgreementArtifactPath(agreementId, 'transcript'),
    summary: getAgreementArtifactPath(agreementId, 'summary'),
    contract: getAgreementArtifactPath(agreementId, 'contract'),
  };
}

export async function hashAgreementRecord(input: AgreementRecordInput) {
  return digestStringAsync(
    CryptoDigestAlgorithm.SHA256,
    JSON.stringify({
      agreementId: input.agreementId,
      room: input.room,
      transcript: input.transcript,
      summary: input.summary,
    }),
  );
}

export const agreementService = {
  async getAgreementRoom(agreementId: string): Promise<AgreementRoom | null> {
    return firestoreAdapter.getById<AgreementRoom>('agreementRooms', agreementId);
  },

  async createAgreementRoom(input: Omit<AgreementRoom, 'id' | 'storagePaths'>): Promise<AgreementRoom> {
    return firestoreAdapter.setWithId<Omit<AgreementRoom, 'id'>>('agreementRooms', input.agreementId, {
      ...input,
      storagePaths: buildAgreementStoragePaths(input.agreementId),
    });
  },

  async ensureAgreementRoom({
    agreementId,
    currentUserId,
  }: {
    agreementId: string;
    currentUserId: string;
  }): Promise<AgreementRoom> {
    const existing = await this.getAgreementRoom(agreementId);

    if (existing) {
      return existing;
    }

    return this.createAgreementRoom({
      agreementId,
      meetingId: `meeting-${agreementId}`,
      founderId: currentUserId,
      investorId: currentUserId,
      adminIds: [],
      status: 'live',
      phase: 'phase1Verification',
      verificationStatus: 'pending',
      recordingStatus: 'idle',
      startedAt: nowIso(),
      durationSeconds: 0,
      participantsVerified: false,
      currentStep: 'opening',
      founderConfirmed: false,
      investorConfirmed: false,
      riskAcknowledged: false,
      termsAcknowledged: false,
      unresolvedDisputes: false,
      investmentAmount: 0,
      equityPercentage: 0,
      repaymentTerms: 'To be confirmed in the Agreement Room.',
      agreementText: 'Ai PromptFund investment agreement pending participant confirmation.',
      investorSigned: false,
      founderSigned: false,
    });
  },

  async updateAgreementRoom(agreementId: string, input: Partial<AgreementRoom>) {
    return firestoreAdapter.update<AgreementRoom>('agreementRooms', agreementId, input);
  },

  async getContract(agreementId: string): Promise<InvestmentContract | null> {
    return firestoreAdapter.getById<InvestmentContract>('investmentContracts', agreementId);
  },

  async saveContract(input: Omit<InvestmentContract, 'id' | 'updatedAt' | 'version'> & { version?: number }) {
    const existing = await this.getContract(input.agreementId);
    const nextVersion = input.version ?? (existing ? existing.version + 1 : 1);
    const updatedAt = nowIso();
    const contract = await firestoreAdapter.setWithId<Omit<InvestmentContract, 'id'>>(
      'investmentContracts',
      input.agreementId,
      {
        ...input,
        version: nextVersion,
        updatedAt,
      },
    );

    const { id: _contractDocumentId, ...contractVersionInput } = contract;

    await firestoreAdapter.create<Omit<InvestmentContractVersion, 'id'>>('investmentContractVersions', {
      ...contractVersionInput,
      contractId: input.agreementId,
      createdAt: updatedAt,
      changeSummary: existing ? `Updated contract to version ${nextVersion}.` : 'Initial contract draft created.',
    });

    return contract;
  },

  async listContractVersions(agreementId: string): Promise<InvestmentContractVersion[]> {
    return firestoreAdapter.queryByField<InvestmentContractVersion>(
      'investmentContractVersions',
      'agreementId',
      agreementId,
    );
  },

  async addParticipant(input: Omit<AgreementParticipant, 'id'>) {
    return firestoreAdapter.create<Omit<AgreementParticipant, 'id'>>('agreementParticipants', input);
  },

  async addTranscript(input: Omit<AgreementTranscript, 'id'>) {
    return firestoreAdapter.create<Omit<AgreementTranscript, 'id'>>('agreementTranscripts', input);
  },

  async listTranscripts(agreementId: string) {
    return firestoreAdapter.queryByField<AgreementTranscript>('agreementTranscripts', 'agreementId', agreementId);
  },

  async saveSummary(agreementId: string, input: Omit<AgreementSummary, 'id' | 'agreementId' | 'generatedAt'>) {
    return firestoreAdapter.setWithId<Omit<AgreementSummary, 'id'>>('agreementSummaries', agreementId, {
      agreementId,
      ...input,
      generatedAt: nowIso(),
    });
  },

  async signAgreement({ agreementId, role }: AgreementSignatureInput) {
    const signedAt = nowIso();

    return firestoreAdapter.update<AgreementRoom>('agreementRooms', agreementId, {
      ...(role === 'investor'
        ? { investorSigned: true, investorSignedAt: signedAt }
        : { founderSigned: true, founderSignedAt: signedAt }),
    });
  },

  async saveCertificate(agreementId: string, input: Omit<AgreementCertificate, 'id' | 'agreementId'>) {
    return firestoreAdapter.setWithId<Omit<AgreementCertificate, 'id'>>('agreementCertificates', agreementId, {
      agreementId,
      ...input,
    });
  },
};
