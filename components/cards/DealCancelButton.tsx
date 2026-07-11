import { useState } from 'react';
import { Alert } from 'react-native';

import { PrimaryButton } from '@/components/ui/Primitives';
import { investmentFlowService } from '@/services/investmentFlowService';
import { getFriendlyErrorMessage } from '@/services/errorHandler';
import type { DealPipeline } from '@/utils/investmentPipeline';
import { getPipelineDiscussionRoomId } from '@/utils/investmentPipeline';

export function DealCancelButton({
  pipeline,
  founderMode,
  userId,
  onCancelled,
  onError,
}: {
  pipeline: DealPipeline;
  founderMode: boolean;
  userId: string;
  onCancelled?: () => void;
  onError?: (message: string) => void;
}) {
  const [isCancelling, setIsCancelling] = useState(false);

  if (pipeline.completedSteps.completed || !userId) {
    return null;
  }

  const opportunityId = pipeline.opportunity?.id ?? pipeline.id;
  const roomId = getPipelineDiscussionRoomId(pipeline);

  function confirmCancel() {
    Alert.alert(
      founderMode ? 'Cancel funding request?' : 'Cancel investment?',
      founderMode
        ? 'This will archive your startup funding request before the deal is completed.'
        : 'This will withdraw your investment before the deal is completed.',
      [
        { text: 'Keep Deal', style: 'cancel' },
        {
          text: founderMode ? 'Cancel Funding Request' : 'Cancel Investment',
          style: 'destructive',
          onPress: () => {
            void handleCancel();
          },
        },
      ],
    );
  }

  async function handleCancel() {
    try {
      setIsCancelling(true);
      if (founderMode) {
        await investmentFlowService.cancelFounderFundingRequest({
          opportunityId,
          founderId: userId,
        });
      } else {
        await investmentFlowService.cancelInvestorParticipation({
          interestId: pipeline.interest?.id,
          roomId: roomId ?? undefined,
          investorId: userId,
          opportunityId,
        });
      }
      onCancelled?.();
    } catch (error) {
      onError?.(getFriendlyErrorMessage(error));
    } finally {
      setIsCancelling(false);
    }
  }

  return (
    <PrimaryButton
      label={isCancelling ? 'Cancelling...' : founderMode ? 'Cancel Funding Request' : 'Cancel Investment'}
      variant="secondary"
      disabled={isCancelling}
      onPress={confirmCancel}
    />
  );
}
