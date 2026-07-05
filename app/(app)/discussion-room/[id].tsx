import { doc, onSnapshot } from 'firebase/firestore';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { DealRoomHeader } from '@/components/deal-room/DealRoomHeader';
import { DealRoomProgressStepper } from '@/components/deal-room/DealRoomProgressStepper';
import { DealRoomWorkflowWizard } from '@/components/deal-room/DealRoomWorkflowWizard';
import { InvestmentChatPanel } from '@/components/investment-chat/InvestmentChatPanel';
import { BlockUserControl } from '@/components/safety/BlockUserControl';
import { LoadingState, PrimaryButton } from '@/components/ui/Primitives';
import { colors, radii, spacing } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useBlockStatus } from '@/hooks/useBlockStatus';
import { firestoreCollections, getPromptFundFirestore } from '@/firebase/firestore';
import { getFriendlyErrorMessage } from '@/services/errorHandler';
import { investmentChatService } from '@/services/investmentChatService';
import { investmentFlowService } from '@/services/investmentFlowService';
import { userService } from '@/services/userService';
import type { WorkflowAction } from '@/utils/dealRoom';
import { getWorkflowSteps } from '@/utils/dealRoom';
import { buildDealPipelineFromEntities } from '@/utils/investmentPipeline';
import type { DiscussionRoom, InvestmentAgreement, V5Investment } from '@/types/InvestmentFlow';
import type { DiscussionReportReason, User } from '@/types/User';

const reportReasons: DiscussionReportReason[] = [
  'Spam',
  'Scam or Fraud',
  'Bad language',
  'False Investment Information',
  'Other',
];

function nowIso() {
  return new Date().toISOString();
}

export default function DiscussionRoomScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { authUser, profile } = useAuth();
  const insets = useSafeAreaInsets();
  const [room, setRoom] = useState<DiscussionRoom | null>(null);
  const [agreement, setAgreement] = useState<InvestmentAgreement | null>(null);
  const [investment, setInvestment] = useState<V5Investment | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isWorkflowSaving, setIsWorkflowSaving] = useState(false);
  const [counterpartyProfile, setCounterpartyProfile] = useState<User | null>(null);
  const [founderProfile, setFounderProfile] = useState<User | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isSafetyVisible, setIsSafetyVisible] = useState(false);
  const [isReportModalVisible, setIsReportModalVisible] = useState(false);
  const [reportReason, setReportReason] = useState<DiscussionReportReason>('Spam');
  const [reportDetails, setReportDetails] = useState('');
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const roomId = typeof id === 'string' ? id : '';

  const participantRole = useMemo(() => {
    if (!authUser?.uid || !room) return null;
    if (authUser.uid === room.founderId) return 'founder';
    if (authUser.uid === room.investorId) return 'investor';
    return null;
  }, [authUser?.uid, room?.founderId, room?.investorId]);

  const pipeline = useMemo(
    () => buildDealPipelineFromEntities({ room: room ?? undefined, agreement: agreement ?? undefined, investment: investment ?? undefined }),
    [agreement, investment, room],
  );

  const workflowSteps = useMemo(() => {
    if (!room) return [];
    return getWorkflowSteps({
      pipeline,
      room,
      agreement,
      participantRole,
      founderProfile,
    });
  }, [agreement, founderProfile, participantRole, pipeline, room]);

  useEffect(() => {
    if (!roomId) return undefined;
    const unsubscribe = investmentChatService.subscribeToRoom(
      roomId,
      (nextRoom) => {
        setRoom(nextRoom);
        setIsLoading(false);
      },
      (error) => {
        setNotice(getFriendlyErrorMessage(error));
        setIsLoading(false);
      },
    );
    return unsubscribe;
  }, [roomId]);

  const agreementId = room?.agreementId ?? (room ? `agreement-${room.id}` : null);

  useEffect(() => {
    if (!agreementId) {
      setAgreement(null);
      return undefined;
    }

    const unsubscribe = onSnapshot(
      doc(getPromptFundFirestore(), firestoreCollections.agreements, agreementId),
      (snapshot) => {
        setAgreement(snapshot.exists() ? ({ ...snapshot.data(), id: snapshot.id } as InvestmentAgreement) : null);
      },
      (error) => setNotice(getFriendlyErrorMessage(error)),
    );
    return unsubscribe;
  }, [agreementId]);

  useEffect(() => {
    if (!agreementId) {
      setInvestment(null);
      return undefined;
    }

    const unsubscribe = onSnapshot(
      doc(getPromptFundFirestore(), firestoreCollections.investments, agreementId),
      (snapshot) => {
        setInvestment(snapshot.exists() ? ({ ...snapshot.data(), id: snapshot.id } as V5Investment) : null);
      },
      () => setInvestment(null),
    );
    return unsubscribe;
  }, [agreementId]);

  const counterpartyId = authUser?.uid && room
    ? authUser.uid === room.founderId ? room.investorId : room.founderId
    : null;
  const counterpartyName = authUser?.uid && room
    ? authUser.uid === room.founderId ? room.investorName : room.founderName
    : 'this user';
  const { blockStatus } = useBlockStatus(authUser?.uid, counterpartyId);

  useEffect(() => {
    if (!counterpartyId) {
      setCounterpartyProfile(null);
      return undefined;
    }
    let isMounted = true;
    userService.getUserById(counterpartyId)
      .then((user) => { if (isMounted) setCounterpartyProfile(user); })
      .catch((error) => setNotice(getFriendlyErrorMessage(error)));
    return () => { isMounted = false; };
  }, [counterpartyId]);

  useEffect(() => {
    if (!room?.founderId) {
      setFounderProfile(null);
      return undefined;
    }
    let isMounted = true;
    userService.getUserById(room.founderId)
      .then((user) => { if (isMounted) setFounderProfile(user); })
      .catch(() => undefined);
    return () => { isMounted = false; };
  }, [room?.founderId]);

  async function handleWorkflowAction(action: WorkflowAction) {
    if (isWorkflowSaving || !room || !participantRole) return;

    const previousRoom = room;
    const previousAgreement = agreement;

    try {
      setIsWorkflowSaving(true);

      if (action === 'mark_ready') {
        const readyField = participantRole === 'founder' ? 'founderReady' : 'investorReady';
        const nextFounderReady = participantRole === 'founder' ? true : room.founderReady;
        const nextInvestorReady = participantRole === 'investor' ? true : room.investorReady;
        setRoom({
          ...room,
          [readyField]: true,
          founderReady: nextFounderReady,
          investorReady: nextInvestorReady,
          status: nextFounderReady && nextInvestorReady ? 'ready' : room.status,
        });
        await investmentFlowService.setReady(room, participantRole);
        return;
      }

      if (action === 'sign_agreement') {
        let activeAgreement = agreement;
        if (!activeAgreement && room.founderReady && room.investorReady) {
          activeAgreement = await investmentFlowService.generateAgreement(room);
          setAgreement(activeAgreement);
        }
        if (!activeAgreement) return;

        const alreadyAccepted = participantRole === 'founder'
          ? activeAgreement.founderAccepted
          : activeAgreement.investorAccepted;
        if (alreadyAccepted) return;

        const acceptedAt = nowIso();
        setAgreement({
          ...activeAgreement,
          founderAccepted: participantRole === 'founder' ? true : activeAgreement.founderAccepted,
          investorAccepted: participantRole === 'investor' ? true : activeAgreement.investorAccepted,
          status: participantRole === 'founder' && activeAgreement.investorAccepted
            || participantRole === 'investor' && activeAgreement.founderAccepted
            ? 'awaiting_funding'
            : activeAgreement.status,
          updatedAt: acceptedAt,
        });
        await investmentFlowService.acceptAgreement(activeAgreement, participantRole);
        return;
      }

      if (action === 'continue_funding_instructions') {
        if (!agreement || !authUser?.uid) return;
        const acknowledgedAt = nowIso();
        setAgreement({
          ...agreement,
          fundingInstructionsAcknowledgedAt: acknowledgedAt,
        });
        await investmentFlowService.acknowledgeFundingInstructions(agreement, authUser.uid);
        return;
      }

      if (action === 'confirm_funding') {
        if (!agreement) return;
        if (participantRole === 'investor' && agreement.status === 'awaiting_funding') {
          setAgreement({
            ...agreement,
            status: 'funding_arranged',
            fundingArrangedAt: nowIso(),
          });
          await investmentFlowService.markFundingArrangedOutsidePromptFund(agreement);
          return;
        }
        if (participantRole === 'founder' && agreement.status === 'funding_arranged') {
          setAgreement({
            ...agreement,
            status: 'completed',
            completedAt: nowIso(),
          });
          await investmentFlowService.confirmFundingArrangement(agreement);
          return;
        }
      }

      if (action === 'finish_deal') {
        router.back();
      }
    } catch (error) {
      setRoom(previousRoom);
      setAgreement(previousAgreement);
      setNotice(getFriendlyErrorMessage(error));
    } finally {
      setIsWorkflowSaving(false);
    }
  }

  function handleReportConversation() {
    setIsSafetyVisible(false);
    setReportReason('Spam');
    setReportDetails('');
    setIsReportModalVisible(true);
  }

  async function handleSubmitReport() {
    if (!room || !authUser?.uid || !counterpartyId || isSubmittingReport) return;
    if (reportReason === 'Other' && !reportDetails.trim()) {
      setNotice('Describe what happened before submitting the report.');
      return;
    }
    try {
      setIsSubmittingReport(true);
      const result = await userService.submitDiscussionReport({
        reporterUid: authUser.uid,
        reportedUid: counterpartyId,
        discussionRoomId: room.id,
        reason: reportReason,
        details: reportDetails.trim(),
      });
      setIsReportModalVisible(false);
      setNotice(result.alreadyExists
        ? 'You have already submitted a report for this conversation.'
        : 'Thank you. Your report has been submitted for review.');
    } catch (error) {
      setNotice(getFriendlyErrorMessage(error));
    } finally {
      setIsSubmittingReport(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top : 0}
        style={styles.keyboardAvoiding}
      >
        {isLoading ? (
          <View style={styles.centeredState}>
            <LoadingState label="Loading Deal Room" />
          </View>
        ) : null}

        {notice ? (
          <View style={styles.noticeBanner}>
            <Text style={styles.noticeText}>{notice}</Text>
            <Pressable onPress={() => setNotice(null)}>
              <Text style={styles.noticeDismiss}>Dismiss</Text>
            </Pressable>
          </View>
        ) : null}

        {!isLoading && !room ? (
          <View style={styles.centeredState}>
            <Text style={styles.noticeText}>Deal Room not found.</Text>
          </View>
        ) : null}

        {room && profile ? (
          <View style={styles.dealRoom}>
            <View style={styles.workflowZone}>
              <DealRoomHeader startupName={room.startupName} onSafetyPress={() => setIsSafetyVisible(true)} />
              <DealRoomProgressStepper pipeline={pipeline} />
              <DealRoomWorkflowWizard
                steps={workflowSteps}
                isSaving={isWorkflowSaving}
                onAction={handleWorkflowAction}
              />
            </View>

            <InvestmentChatPanel
              room={room}
              embedded
              currentUser={{
                id: authUser?.uid ?? profile.id,
                displayName: profile.displayName,
                name: profile.name,
                username: profile.username,
                handle: profile.handle,
              }}
              participantRole={participantRole}
              blockStatus={blockStatus}
              bottomInset={insets.bottom}
              onNotice={setNotice}
              style={styles.chatPanel}
            />
          </View>
        ) : null}
      </KeyboardAvoidingView>

      <SafetyModal
        visible={isSafetyVisible}
        authUserId={authUser?.uid}
        counterpartyId={counterpartyId}
        counterpartyName={counterpartyName}
        profile={profile ?? null}
        counterpartyProfile={counterpartyProfile}
        onClose={() => setIsSafetyVisible(false)}
        onReport={handleReportConversation}
      />

      <ReportUserModal
        visible={isReportModalVisible}
        reason={reportReason}
        details={reportDetails}
        isSubmitting={isSubmittingReport}
        onChangeReason={setReportReason}
        onChangeDetails={setReportDetails}
        onCancel={() => setIsReportModalVisible(false)}
        onSubmit={handleSubmitReport}
      />
    </SafeAreaView>
  );
}

function SafetyModal({
  visible,
  authUserId,
  counterpartyId,
  counterpartyName,
  profile,
  counterpartyProfile,
  onClose,
  onReport,
}: {
  visible: boolean;
  authUserId?: string | null;
  counterpartyId: string | null;
  counterpartyName: string;
  profile: User | null;
  counterpartyProfile: User | null;
  onClose: () => void;
  onReport: () => void;
}) {
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.modalSafeArea} edges={['top', 'left', 'right', 'bottom']}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalHeaderTitle}>Safety & Trust</Text>
          <Pressable onPress={onClose}>
            <Text style={styles.modalHeaderAction}>Done</Text>
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={styles.modalContent}>
          <BlockUserControl
            currentUserId={authUserId}
            targetUserId={counterpartyId}
            currentUser={profile}
            targetUser={counterpartyProfile}
            targetName={counterpartyName}
            onReport={onReport}
            showReport
          />
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

function ReportUserModal({
  visible,
  reason,
  details,
  isSubmitting,
  onChangeReason,
  onChangeDetails,
  onCancel,
  onSubmit,
}: {
  visible: boolean;
  reason: DiscussionReportReason;
  details: string;
  isSubmitting: boolean;
  onChangeReason: (reason: DiscussionReportReason) => void;
  onChangeDetails: (details: string) => void;
  onCancel: () => void;
  onSubmit: () => void | Promise<void>;
}) {
  const requiresDetails = reason === 'Other';
  const canSubmit = !isSubmitting && (!requiresDetails || details.trim().length > 0);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>Report User</Text>
          <Text style={styles.modalSubtitle}>
            Help us understand what happened. Reports are reviewed by the PromptFund Trust & Safety team.
          </Text>
          <View style={styles.reasonList}>
            {reportReasons.map((item) => (
              <Pressable
                key={item}
                accessibilityRole="radio"
                accessibilityState={{ checked: reason === item }}
                onPress={() => onChangeReason(item)}
                style={[styles.reasonOption, reason === item ? styles.reasonOptionActive : null]}
              >
                <View style={[styles.radioDot, reason === item ? styles.radioDotActive : null]} />
                <Text style={styles.reasonText}>{item}</Text>
              </Pressable>
            ))}
          </View>
          {requiresDetails ? (
            <TextInput
              multiline
              placeholder="Describe what happened..."
              placeholderTextColor={colors.subtle}
              value={details}
              onChangeText={onChangeDetails}
              style={styles.reportTextArea}
            />
          ) : null}
          <View style={styles.modalActions}>
            <PrimaryButton label="Cancel" variant="secondary" onPress={onCancel} disabled={isSubmitting} />
            <PrimaryButton label={isSubmitting ? 'Submitting...' : 'Submit Report'} onPress={onSubmit} disabled={!canSubmit} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: colors.background,
    flex: 1,
  },
  keyboardAvoiding: {
    flex: 1,
  },
  dealRoom: {
    flex: 1,
  },
  workflowZone: {
    flexShrink: 0,
  },
  chatPanel: {
    flex: 1,
    minHeight: 0,
  },
  centeredState: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  noticeBanner: {
    alignItems: 'center',
    backgroundColor: colors.panel,
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  noticeText: {
    color: colors.text,
    flex: 1,
    lineHeight: 20,
  },
  noticeDismiss: {
    color: colors.accent,
    fontWeight: '700',
  },
  modalSafeArea: {
    backgroundColor: colors.background,
    flex: 1,
  },
  modalHeader: {
    alignItems: 'center',
    borderBottomColor: 'rgba(216, 201, 163, 0.18)',
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  modalHeaderTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '800',
  },
  modalHeaderAction: {
    color: colors.accent,
    fontSize: 16,
    fontWeight: '700',
  },
  modalContent: {
    padding: spacing.md,
  },
  modalBackdrop: {
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.72)',
    flex: 1,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  modalCard: {
    backgroundColor: colors.panel,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.lg,
    width: '100%',
  },
  modalTitle: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '900',
  },
  modalSubtitle: {
    color: colors.muted,
    lineHeight: 22,
  },
  reasonList: {
    gap: spacing.sm,
  },
  reasonOption: {
    alignItems: 'center',
    borderColor: 'rgba(216, 201, 163, 0.22)',
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
  },
  reasonOptionActive: {
    backgroundColor: 'rgba(200, 162, 74, 0.08)',
    borderColor: colors.accent,
  },
  radioDot: {
    borderColor: colors.muted,
    borderRadius: 999,
    borderWidth: 2,
    height: 18,
    width: 18,
  },
  radioDotActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  reasonText: {
    color: colors.text,
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
  },
  reportTextArea: {
    backgroundColor: colors.black,
    borderColor: 'rgba(216, 201, 163, 0.24)',
    borderRadius: radii.md,
    borderWidth: 1,
    color: colors.text,
    minHeight: 120,
    padding: spacing.md,
    textAlignVertical: 'top',
  },
  modalActions: {
    gap: spacing.sm,
  },
});
