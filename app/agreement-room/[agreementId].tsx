import { Redirect, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import {
  AgreementCertificatePanel,
  AgreementVideoPane,
  PromptFundWitnessCard,
} from '@/components/agreement/AgreementComponents';
import { Card, LoadingState, Pill, PrimaryButton, Screen, ui } from '@/components/ui/Primitives';
import { colors, radii, spacing } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useAgreementRecording } from '@/hooks/useAgreementRecording';
import { useAgreementRoom } from '@/hooks/useAgreementRoom';
import { useAgreementWebRTC } from '@/hooks/useAgreementWebRTC';
import { agreementService } from '@/services/agreementService';
import type { ContractTermType, InvestmentContractVersion } from '@/types/Agreement';

function formatDuration(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
}

export default function AgreementRoomScreen() {
  const { agreementId } = useLocalSearchParams<{ agreementId: string }>();
  const { authUser, initializing, profile } = useAuth();
  const recording = useAgreementRecording();
  const webrtc = useAgreementWebRTC();
  const agreement = useAgreementRoom({
    agreementId: agreementId ?? 'draft',
    currentUserId: authUser?.uid,
  });
  const [durationSeconds, setDurationSeconds] = useState(0);
  const [chatMessage, setChatMessage] = useState('');
  const [hasJoined, setHasJoined] = useState(false);
  const [contractAmount, setContractAmount] = useState('');
  const [contractEquity, setContractEquity] = useState('');
  const [contractTermType, setContractTermType] = useState<ContractTermType>('SAFE');
  const [customTerms, setCustomTerms] = useState('');
  const [contractVersions, setContractVersions] = useState<InvestmentContractVersion[]>([]);
  const [isSavingContract, setIsSavingContract] = useState(false);
  const meetingDuration = formatDuration(durationSeconds);
  const recordingStatus = recording.isRecording ? 'Recording' : agreement.room?.recordingStatus ?? 'idle';
  const bothSigned = Boolean(agreement.room?.investorSigned && agreement.room?.founderSigned);
  const phaseOnePassed = agreement.room?.verificationStatus === 'passed';

  useEffect(() => {
    if (!hasJoined) {
      return undefined;
    }

    const timer = setInterval(() => {
      setDurationSeconds((value) => value + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [hasJoined]);

  useEffect(() => {
    async function loadContractDraft() {
      if (!agreementId || !agreement.room) {
        return;
      }

      const [contract, versions] = await Promise.all([
        agreementService.getContract(agreementId),
        agreementService.listContractVersions(agreementId),
      ]);
      setContractAmount(String(contract?.investmentAmount ?? agreement.room.investmentAmount ?? 0));
      setContractEquity(String(contract?.equityPercentage ?? agreement.room.equityPercentage ?? 0));
      setContractTermType(contract?.termType ?? 'SAFE');
      setCustomTerms(contract?.customTerms ?? agreement.room.repaymentTerms);
      setContractVersions(versions.sort((a, b) => b.version - a.version));
    }

    loadContractDraft();
  }, [agreement.room, agreementId]);

  const agreementSummary = useMemo(() => {
    const room = agreement.room;

    if (!room) {
      return 'Agreement loading.';
    }

    return `${profile?.name ?? 'Participant'} is reviewing ${room.agreementText} Investment: $${room.investmentAmount}. Equity: ${room.equityPercentage}%.`;
  }, [agreement.room, profile?.name]);

  if (!initializing && !authUser) {
    return <Redirect href="/login" />;
  }

  async function handleJoinSession() {
    try {
      await webrtc.joinMeeting();
      await recording.startRecording();
      setHasJoined(true);
    } catch (joinError) {
      Alert.alert('Unable to join Agreement Room', joinError instanceof Error ? joinError.message : 'Join failed.');
    }
  }

  async function handleSendMessage() {
    const text = chatMessage.trim();
    if (!text) {
      return;
    }

    setChatMessage('');
    await agreement.advanceWitness(text);
  }

  async function handleEndMeeting() {
    try {
      await recording.stopRecording();
      webrtc.leaveMeeting();
      setHasJoined(false);
      await agreement.completeMeeting({
        audioUri: recording.audioUri,
        videoUri: recording.videoUri,
      });
    } catch (endError) {
      Alert.alert('Archive failed', endError instanceof Error ? endError.message : 'Unable to archive meeting.');
    }
  }

  async function handleSaveContract() {
    if (!agreementId || !authUser || !agreement.room) {
      return;
    }

    setIsSavingContract(true);
    try {
      const amount = Number(contractAmount);
      const equity = Number(contractEquity);
      await agreementService.saveContract({
        agreementId,
        matchId: undefined,
        projectId: agreement.room.projectId,
        founderId: agreement.room.founderId,
        investorId: agreement.room.investorId,
        investmentAmount: Number.isFinite(amount) ? amount : 0,
        equityPercentage: Number.isFinite(equity) ? equity : 0,
        termType: contractTermType,
        customTerms: customTerms.trim(),
        editedBy: authUser.uid,
      });
      await agreementService.updateAgreementRoom(agreementId, {
        investmentAmount: Number.isFinite(amount) ? amount : 0,
        equityPercentage: Number.isFinite(equity) ? equity : 0,
        repaymentTerms: customTerms.trim(),
        agreementText: `${contractTermType} investment draft reviewed by Ai PromptFund Witness.`,
      });
      await agreement.reload();
      setContractVersions(await agreementService.listContractVersions(agreementId));
    } finally {
      setIsSavingContract(false);
    }
  }

  if (agreement.isLoading) {
    return (
      <Screen eyebrow="Agreement Room" title="Loading secure room" subtitle="Preparing Ai PromptFund Witness.">
        <LoadingState label="Loading Agreement Room" />
      </Screen>
    );
  }

  return (
    <Screen
      eyebrow="Agreement Room"
      title={`Agreement ${agreementId}`}
      subtitle="AI-mediated investment agreement session."
    >
      {agreement.error ? (
        <Card>
          <Text style={styles.errorText}>{agreement.error}</Text>
        </Card>
      ) : null}

      <Card style={styles.headerCard}>
        <View style={styles.headerGrid}>
          <Metric label="Agreement ID" value={agreementId ?? 'draft'} />
          <Metric label="Recording Status" value={String(recordingStatus)} tone={recording.isRecording ? colors.danger : colors.warning} />
          <Metric label="Meeting Duration" value={meetingDuration} />
          <Metric label="Trust Phase" value={agreement.room?.phase ?? 'phase1Verification'} />
          <Metric
            label="Phase Gate"
            value={agreement.room?.verificationStatus ?? 'pending'}
            tone={phaseOnePassed ? colors.success : colors.warning}
          />
          <Metric
            label="Participants"
            value={agreement.room?.participantsVerified ? 'Verified' : 'Pending'}
            tone={agreement.room?.participantsVerified ? colors.success : colors.warning}
          />
        </View>
      </Card>

      <View style={styles.meetingLayout}>
        <AgreementVideoPane
          title="Investor"
          subtitle="Capital partner"
          verified={Boolean(agreement.room?.investorSigned)}
          stream={agreement.currentRole === 'investor' ? webrtc.localStream : webrtc.remoteStream}
          cameraRef={agreement.currentRole === 'investor' ? recording.cameraRef : undefined}
          cameraEnabled={recording.isCameraEnabled}
        />
        <PromptFundWitnessCard status={agreement.agentStatus} message={agreement.agentMessage}>
          <PrimaryButton label="Next Verification Step" variant="secondary" onPress={agreement.advanceLocalStep} />
        </PromptFundWitnessCard>
        <AgreementVideoPane
          title="Founder"
          subtitle="Company representative"
          verified={Boolean(agreement.room?.founderSigned)}
          stream={agreement.currentRole === 'founder' ? webrtc.localStream : webrtc.remoteStream}
          cameraRef={agreement.currentRole === 'founder' ? recording.cameraRef : undefined}
          cameraEnabled={recording.isCameraEnabled}
        />
      </View>

      <Card>
        <View style={ui.wrap}>
          <Pill label={`Step: ${agreement.room?.currentStep ?? 'loading'}`} tone="rgba(64,156,255,0.2)" />
          <Pill label={phaseOnePassed ? 'Phase 1 Complete' : 'Phase 1 Verification'} tone={phaseOnePassed ? 'rgba(46,125,50,0.24)' : 'rgba(200,162,74,0.18)'} />
          <Pill label={`WebRTC: ${webrtc.connectionState}`} />
          <Pill label={bothSigned ? 'Both signed' : 'Signature pending'} tone={bothSigned ? 'rgba(46,125,50,0.24)' : 'rgba(200,162,74,0.18)'} />
        </View>
        <Text style={styles.sectionTitle}>Agreement Review</Text>
        <Text style={styles.bodyText}>{agreementSummary}</Text>
        <Text style={styles.bodyText}>{agreement.room?.repaymentTerms}</Text>
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>Phase 1 · Agreement Verification Meeting</Text>
        <Text style={styles.bodyText}>
          Ai PromptFund Witness represents Ai PromptFund as meeting moderator, agreement witness, process validator, and neutral platform representative.
        </Text>
        <VerificationRow
          label="Founder confirmed name, startup, and authority"
          value={Boolean(agreement.room?.founderConfirmed)}
          onPress={() => agreement.updateVerification({ founderConfirmed: !agreement.room?.founderConfirmed })}
        />
        <VerificationRow
          label="Investor confirmed name and own-behalf investment"
          value={Boolean(agreement.room?.investorConfirmed)}
          onPress={() => agreement.updateVerification({ investorConfirmed: !agreement.room?.investorConfirmed })}
        />
        <VerificationRow
          label="Both parties acknowledged startup investing risk"
          value={Boolean(agreement.room?.riskAcknowledged)}
          onPress={() => agreement.updateVerification({ riskAcknowledged: !agreement.room?.riskAcknowledged })}
        />
        <VerificationRow
          label="Both parties acknowledged presented terms"
          value={Boolean(agreement.room?.termsAcknowledged)}
          onPress={() => agreement.updateVerification({ termsAcknowledged: !agreement.room?.termsAcknowledged })}
        />
        <VerificationRow
          label="No unresolved disputes"
          value={!agreement.room?.unresolvedDisputes}
          onPress={() => agreement.updateVerification({ unresolvedDisputes: !agreement.room?.unresolvedDisputes })}
        />
        <PrimaryButton
          label={phaseOnePassed ? 'Phase 1 Complete' : 'Run Ai PromptFund Phase Gate'}
          variant={phaseOnePassed ? 'secondary' : 'primary'}
          onPress={agreement.runPhaseGate}
        />
        {agreement.room?.witnessVerification ? (
          <Text style={styles.bodyText}>{agreement.room.witnessVerification}</Text>
        ) : null}
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>Ai PromptFund Witness Term Review</Text>
        <TermLine label="Investment Amount" value={`$${agreement.room?.investmentAmount ?? 0}`} />
        <TermLine label="Equity %" value={`${agreement.room?.equityPercentage ?? 0}%`} />
        <TermLine label="SAFE terms" value={contractTermType === 'SAFE' ? customTerms || 'Draft pending' : 'Not selected'} />
        <TermLine label="Revenue Share terms" value={contractTermType === 'Revenue Share' ? customTerms || 'Draft pending' : 'Not selected'} />
        <TermLine label="Milestones" value="Reviewed in custom terms and meeting transcript." />
        <TermLine label="Repayment conditions" value={agreement.room?.repaymentTerms ?? 'Pending'} />
        <TermLine label="Exit conditions" value="To be confirmed in contract terms." />
        <TermLine label="Use of funds" value="To be confirmed by entrepreneur during verification." />
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>Phase 2 · Contract & Signatures</Text>
        <Text style={styles.bodyText}>
          {phaseOnePassed
            ? 'Verification passed. Founder and investor can finalize official Ai PromptFund Contract terms.'
            : 'Locked until Ai PromptFund Witness marks Phase 1 Complete.'}
        </Text>
        <View style={styles.contractGrid}>
          <TextInput
            placeholder="Investment Amount"
            placeholderTextColor={colors.subtle}
            keyboardType="numeric"
            value={contractAmount}
            onChangeText={setContractAmount}
            style={[styles.input, styles.contractInput]}
          />
          <TextInput
            placeholder="Equity %"
            placeholderTextColor={colors.subtle}
            keyboardType="numeric"
            value={contractEquity}
            onChangeText={setContractEquity}
            style={[styles.input, styles.contractInput]}
          />
        </View>
        <View style={ui.wrap}>
          {(['SAFE', 'Convertible Note', 'Revenue Share', 'Custom Terms'] as ContractTermType[]).map((term) => (
            <Pressable
              key={term}
              accessibilityRole="button"
              onPress={() => setContractTermType(term)}
              style={[styles.termChip, contractTermType === term ? styles.termChipActive : null]}
            >
              <Text style={styles.termChipText}>{term}</Text>
            </Pressable>
          ))}
        </View>
        <TextInput
          placeholder="Custom terms, investor rights, repayment terms, milestones, or exclusions"
          placeholderTextColor={colors.subtle}
          value={customTerms}
          onChangeText={setCustomTerms}
          multiline
          style={[styles.input, styles.termsInput]}
        />
        <PrimaryButton
          label={isSavingContract ? 'Saving Version...' : 'Save Contract Version'}
          disabled={isSavingContract || !phaseOnePassed}
          onPress={handleSaveContract}
        />
        <Text style={styles.versionTitle}>Version History</Text>
        {contractVersions.slice(0, 5).map((version) => (
          <View key={version.id} style={styles.versionRow}>
            <Text style={styles.versionNumber}>v{version.version}</Text>
            <Text style={styles.bodyText}>
              {version.termType} · ${version.investmentAmount} · {version.equityPercentage}% · edited by {version.editedBy}
            </Text>
          </View>
        ))}
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>Live Transcript</Text>
        {agreement.transcript.slice(-5).map((line) => (
          <View key={line.id} style={styles.transcriptLine}>
            <Text style={styles.speaker}>{line.speaker}</Text>
            <Text style={styles.bodyText}>{line.text}</Text>
          </View>
        ))}
        <TextInput
          placeholder="Type meeting note or participant response"
          placeholderTextColor={colors.subtle}
          value={chatMessage}
          onChangeText={setChatMessage}
          style={styles.input}
        />
        <PrimaryButton label="Send to Ai PromptFund Witness" onPress={handleSendMessage} />
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>Digital Signature</Text>
        <Text style={styles.bodyText}>
          By pressing I Agree, you confirm identity, understanding, risk acknowledgement, and agreement accuracy.
        </Text>
        <PrimaryButton
          label={agreement.currentRole === 'founder' ? 'Founder Signature: I Agree' : 'Investor Signature: I Agree'}
          disabled={!phaseOnePassed || (agreement.currentRole === 'founder' ? agreement.room?.founderSigned : agreement.room?.investorSigned)}
          onPress={agreement.sign}
        />
        {!phaseOnePassed ? <Text style={styles.bodyText}>Signatures unlock after Phase 1 Complete.</Text> : null}
      </Card>

      <AgreementCertificatePanel certificate={agreement.certificate} />

      <View style={styles.controls}>
        <ControlButton label={recording.isMicEnabled ? 'Mic' : 'Muted'} onPress={() => recording.setIsMicEnabled((value) => !value)} />
        <ControlButton label={recording.isCameraEnabled ? 'Camera' : 'Video Off'} onPress={() => recording.setIsCameraEnabled((value) => !value)} />
        <ControlButton label={recording.isScreenSharing ? 'Sharing' : 'Screen Share'} onPress={() => recording.setIsScreenSharing((value) => !value)} />
        <ControlButton label="Chat" onPress={() => setChatMessage((value) => value || 'I understand and acknowledge the agreement.')} />
        {hasJoined ? (
          <ControlButton label="End Meeting" danger onPress={handleEndMeeting} />
        ) : (
          <ControlButton label="Join Live Session" onPress={handleJoinSession} />
        )}
      </View>
    </Screen>
  );
}

function Metric({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={[styles.metricValue, tone ? { color: tone } : null]}>{value}</Text>
    </View>
  );
}

function VerificationRow({ label, value, onPress }: { label: string; value: boolean; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.verificationRow}>
      <View style={[styles.checkDot, value ? styles.checkDotComplete : null]}>
        <Text style={styles.checkText}>{value ? '✓' : '!'}</Text>
      </View>
      <Text style={styles.verificationLabel}>{label}</Text>
      <Text style={[styles.verificationStatus, value ? styles.completeText : styles.pendingText]}>
        {value ? 'Complete' : 'Pending'}
      </Text>
    </Pressable>
  );
}

function TermLine({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.termLine}>
      <Text style={styles.termLabel}>{label}</Text>
      <Text style={styles.termValue}>{value}</Text>
    </View>
  );
}

function ControlButton({
  label,
  danger = false,
  onPress,
}: {
  label: string;
  danger?: boolean;
  onPress: () => void | Promise<void>;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={[styles.controlButton, danger ? styles.dangerButton : null]}
    >
      <Text style={styles.controlText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  headerCard: {
    borderColor: 'rgba(64,156,255,0.42)',
  },
  headerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  metric: {
    flexGrow: 1,
    minWidth: '46%',
    gap: spacing.xs,
  },
  metricLabel: {
    color: colors.subtle,
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  metricValue: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '900',
  },
  meetingLayout: {
    gap: spacing.md,
  },
  controls: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    justifyContent: 'center',
  },
  controlButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    borderWidth: 1,
    borderColor: 'rgba(64,156,255,0.42)',
    borderRadius: radii.pill,
    backgroundColor: colors.panel,
    paddingHorizontal: spacing.md,
  },
  dangerButton: {
    borderColor: colors.danger,
    backgroundColor: 'rgba(177,18,38,0.24)',
  },
  controlText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '900',
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '900',
  },
  bodyText: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 22,
  },
  verificationRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(200, 162, 74, 0.22)',
    borderRadius: radii.md,
    backgroundColor: colors.panelMuted,
    padding: spacing.md,
  },
  checkDot: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(200,162,74,0.18)',
  },
  checkDotComplete: {
    backgroundColor: 'rgba(46,125,50,0.34)',
  },
  checkText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '900',
  },
  verificationLabel: {
    flex: 1,
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 20,
  },
  verificationStatus: {
    fontSize: 12,
    fontWeight: '900',
  },
  completeText: {
    color: colors.success,
  },
  pendingText: {
    color: colors.warning,
  },
  termLine: {
    gap: spacing.xs,
    borderLeftWidth: 2,
    borderLeftColor: colors.accent,
    paddingLeft: spacing.sm,
  },
  termLabel: {
    color: colors.subtle,
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  termValue: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 20,
  },
  transcriptLine: {
    gap: spacing.xs,
    borderLeftWidth: 2,
    borderLeftColor: colors.accent,
    paddingLeft: spacing.sm,
  },
  speaker: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  input: {
    minHeight: 52,
    borderWidth: 1,
    borderColor: 'rgba(200, 162, 74, 0.36)',
    borderRadius: radii.md,
    backgroundColor: colors.panelMuted,
    color: colors.text,
    paddingHorizontal: spacing.md,
    fontSize: 15,
  },
  contractGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  contractInput: {
    flex: 1,
  },
  termChip: {
    borderWidth: 1,
    borderColor: 'rgba(200, 162, 74, 0.32)',
    borderRadius: radii.pill,
    backgroundColor: colors.panelMuted,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  termChipActive: {
    borderColor: colors.accent,
    backgroundColor: 'rgba(200, 162, 74, 0.18)',
  },
  termChipText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '900',
  },
  termsInput: {
    minHeight: 118,
    paddingTop: spacing.md,
    textAlignVertical: 'top',
  },
  versionTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  versionRow: {
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: 'rgba(64,156,255,0.26)',
    borderRadius: radii.md,
    backgroundColor: 'rgba(64,156,255,0.08)',
    padding: spacing.md,
  },
  versionNumber: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: '900',
  },
  errorText: {
    color: colors.danger,
    lineHeight: 20,
  },
});
