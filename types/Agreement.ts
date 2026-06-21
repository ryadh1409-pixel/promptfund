export type AgreementRole = 'founder' | 'investor' | 'admin' | 'agent';
export type AgreementMeetingStatus = 'scheduled' | 'live' | 'processing' | 'completed' | 'archived';
export type AgreementRecordingStatus = 'idle' | 'recording' | 'uploading' | 'stored' | 'failed';
export type AgreementAgentStatus = 'listening' | 'speaking' | 'processing' | 'verified';
export type AgreementPhase = 'phase1Verification' | 'phase2Contract' | 'archived';
export type AgreementVerificationStatus = 'pending' | 'passed' | 'blocked';
export type AgreementStep =
  | 'opening'
  | 'investorIdentity'
  | 'founderIdentity'
  | 'termReview'
  | 'riskAcknowledgement'
  | 'termsAcknowledgement'
  | 'phaseGate'
  | 'contractSigning'
  | 'finalRecord';

export type AgreementRoom = {
  id: string;
  agreementId: string;
  meetingId: string;
  founderId: string;
  investorId: string;
  adminIds: string[];
  projectId?: string;
  status: AgreementMeetingStatus;
  phase: AgreementPhase;
  verificationStatus: AgreementVerificationStatus;
  recordingStatus: AgreementRecordingStatus;
  startedAt?: string;
  endedAt?: string;
  durationSeconds: number;
  participantsVerified: boolean;
  currentStep: AgreementStep;
  founderConfirmed: boolean;
  investorConfirmed: boolean;
  riskAcknowledged: boolean;
  termsAcknowledged: boolean;
  unresolvedDisputes: boolean;
  phaseOneCompletedAt?: string;
  witnessVerification?: string;
  investmentAmount: number;
  equityPercentage: number;
  repaymentTerms: string;
  agreementText: string;
  storagePaths: AgreementStoragePaths;
  investorSigned: boolean;
  founderSigned: boolean;
  investorSignedAt?: string;
  founderSignedAt?: string;
  agreementHash?: string;
};

export type AgreementParticipant = {
  id: string;
  agreementId: string;
  userId: string;
  role: AgreementRole;
  displayName: string;
  verified: boolean;
  joinedAt?: string;
};

export type AgreementMeeting = {
  id: string;
  agreementId: string;
  roomId: string;
  status: AgreementMeetingStatus;
  startedAt: string;
  endedAt?: string;
  durationSeconds: number;
  recordingStatus: AgreementRecordingStatus;
};

export type AgreementTranscript = {
  id: string;
  meetingId: string;
  agreementId: string;
  speaker: AgreementRole | string;
  text: string;
  timestamp: string;
};

export type AgreementSummary = {
  id: string;
  agreementId: string;
  executiveSummary: string;
  investmentAmount: number;
  equityPercentage: number;
  repaymentTerms: string;
  investorConfirmation: string;
  founderConfirmation: string;
  riskAcknowledgement: string;
  meetingOutcome: string;
  generatedAt: string;
};

export type ContractTermType = 'SAFE' | 'Convertible Note' | 'Revenue Share' | 'Custom Terms';

export type InvestmentContract = {
  id: string;
  agreementId: string;
  matchId?: string;
  projectId?: string;
  founderId: string;
  investorId: string;
  investmentAmount: number;
  equityPercentage: number;
  termType: ContractTermType;
  customTerms: string;
  version: number;
  editedBy: string;
  updatedAt: string;
};

export type InvestmentContractVersion = InvestmentContract & {
  contractId: string;
  createdAt: string;
  changeSummary: string;
};

export type AgreementCertificate = {
  id: string;
  agreementId: string;
  identityVerified: boolean;
  meetingRecorded: boolean;
  transcriptGenerated: boolean;
  aiSummaryGenerated: boolean;
  agreementSigned: boolean;
  promptFundWitnessVerified: boolean;
  meetingRecordingId?: string;
  transcriptId?: string;
  agreementVersion?: number;
  timestamp: string;
  agreementHash: string;
  pdfPath?: string;
};

export type AgreementStoragePaths = {
  video: string;
  audio: string;
  transcript: string;
  summary: string;
  contract: string;
};

export type AgreementSignatureInput = {
  agreementId: string;
  userId: string;
  role: Extract<AgreementRole, 'founder' | 'investor'>;
};

export type AgreementRecordInput = {
  agreementId: string;
  room: AgreementRoom;
  transcript: AgreementTranscript[];
  summary: AgreementSummary;
};
