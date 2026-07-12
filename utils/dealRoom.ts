import type { DiscussionRoom, InvestmentAgreement } from '@/types/InvestmentFlow';
import type { User } from '@/types/User';
import type { DealPipeline, PipelineStepKey } from '@/utils/investmentPipeline';
import { pipelineSteps } from '@/utils/investmentPipeline';

export function areAllPriorPipelineStepsComplete(pipeline: DealPipeline) {
  return pipelineSteps
    .slice(0, -1)
    .every((prior) => pipeline.completedSteps[prior.key]);
}

export function getPipelineStepDisplayState(pipeline: DealPipeline, stepKey: PipelineStepKey) {
  const allPriorComplete = areAllPriorPipelineStepsComplete(pipeline);
  const completed = pipeline.completedSteps[stepKey]
    || (stepKey === 'completed' && allPriorComplete);
  const isCurrent = !completed && pipeline.currentStep === stepKey;

  return { completed, isCurrent };
}

export type WorkflowAction =
  | 'mark_ready'
  | 'sign_agreement'
  | 'continue_funding_instructions'
  | 'confirm_funding'
  | 'finish_deal';

export type WorkflowStepView = {
  key: PipelineStepKey;
  label: string;
  status: 'completed' | 'active' | 'upcoming';
  title?: string;
  body?: string;
  buttonLabel?: string;
  action?: WorkflowAction;
  waitingMessage?: string;
  detailLines?: string[];
};

export function getWorkflowSteps({
  pipeline,
  room,
  agreement,
  participantRole,
  founderProfile,
}: {
  pipeline: DealPipeline;
  room: DiscussionRoom;
  agreement: InvestmentAgreement | null;
  participantRole: 'founder' | 'investor' | null;
  founderProfile: User | null;
}): WorkflowStepView[] {
  const allPriorComplete = areAllPriorPipelineStepsComplete(pipeline);

  return pipelineSteps.map((step) => {
    const completed = pipeline.completedSteps[step.key]
      || (step.key === 'completed' && allPriorComplete);

    if (step.key === 'completed') {
      return completed
        ? { key: step.key, label: step.label, status: 'completed' }
        : { key: step.key, label: step.label, status: 'upcoming' };
    }

    const currentKey = pipeline.currentStep === 'completed' ? null : pipeline.currentStep;
    const isActive = currentKey !== null && step.key === currentKey;
    const status: WorkflowStepView['status'] = completed
      ? 'completed'
      : isActive
        ? 'active'
        : 'upcoming';

    if (!isActive && !completed) {
      return { key: step.key, label: step.label, status };
    }

    if (completed) {
      return { key: step.key, label: step.label, status: 'completed' };
    }

    return {
      key: step.key,
      label: step.label,
      status: 'active',
      ...getActiveStepContent(step.key, { room, agreement, participantRole, founderProfile }),
    };
  });
}

function getActiveStepContent(
  stepKey: PipelineStepKey,
  {
    room,
    agreement,
    participantRole,
    founderProfile,
  }: {
    room: DiscussionRoom;
    agreement: InvestmentAgreement | null;
    participantRole: 'founder' | 'investor' | null;
    founderProfile: User | null;
  },
): Pick<WorkflowStepView, 'title' | 'body' | 'buttonLabel' | 'action' | 'waitingMessage' | 'detailLines'> {
  if (stepKey === 'interest' || stepKey === 'match') {
    return {
      title: stepKey === 'interest' ? 'Interest Received' : 'Match Created',
      body: 'This step is complete.',
    };
  }

  if (stepKey === 'discussion') {
    const roleReady = participantRole === 'founder' ? room.founderReady : room.investorReady;
    const bothReady = room.founderReady && room.investorReady;
    if (bothReady) {
      return {
        title: 'Investment Chat Started',
        body: 'Both parties are ready. The agreement is being prepared.',
        waitingMessage: 'Preparing investment agreement...',
      };
    }
    if (roleReady) {
      return {
        title: 'Investment Chat Started',
        body: 'You are ready. Waiting for the other party to continue.',
        waitingMessage: 'Waiting for counterparty readiness...',
      };
    }
    return {
      title: 'Investment Chat Started',
      body: 'Confirm you are ready to move forward with the investment agreement.',
      buttonLabel: 'Continue',
      action: 'mark_ready',
    };
  }

  if (stepKey === 'agreement') {
    const roleAccepted = participantRole === 'founder'
      ? agreement?.founderAccepted
      : agreement?.investorAccepted;
    const bothAccepted = agreement?.founderAccepted && agreement?.investorAccepted;
    if (bothAccepted) {
      return {
        title: 'Agreement Signed',
        body: 'Both parties signed the agreement.',
        waitingMessage: 'Proceeding to funding instructions...',
      };
    }
    if (roleAccepted) {
      return {
        title: 'Agreement Signed',
        body: 'You signed the agreement. Waiting for the other party.',
        waitingMessage: 'Waiting for counterparty signature...',
      };
    }
    return {
      title: 'Agreement Signed',
      body: 'Review and accept the investment agreement.',
      buttonLabel: 'Sign Agreement',
      action: 'sign_agreement',
    };
  }

  if (stepKey === 'funding_instructions') {
    const contactLines = formatContactLines(founderProfile, agreement);
    return {
      title: 'Funding Instructions',
      body: 'Transfer instructions are now available. Arrange funding directly outside Ai PromptFund.',
      buttonLabel: 'Continue',
      action: 'continue_funding_instructions',
      detailLines: contactLines,
    };
  }

  if (stepKey === 'funding_confirmed') {
    if (participantRole === 'investor' && agreement?.status === 'awaiting_funding') {
      return {
        title: 'Funding Confirmed',
        body: 'Please confirm funding has been arranged with the Founder.',
        buttonLabel: 'Confirm Funding',
        action: 'confirm_funding',
      };
    }
    if (participantRole === 'founder' && agreement?.status === 'funding_arranged') {
      return {
        title: 'Funding Confirmed',
        body: 'Please confirm the funds have been received.',
        buttonLabel: 'Confirm Funding',
        action: 'confirm_funding',
      };
    }
    if (participantRole === 'founder' && agreement?.status === 'awaiting_funding') {
      return {
        title: 'Funding Confirmed',
        body: 'Waiting for the Angel Investor to confirm funding arrangements.',
        waitingMessage: 'Waiting for investor confirmation...',
      };
    }
    if (participantRole === 'investor' && agreement?.status === 'funding_arranged') {
      return {
        title: 'Funding Confirmed',
        body: 'Waiting for the Founder to confirm receipt of funds.',
        waitingMessage: 'Waiting for founder confirmation...',
      };
    }
    return {
      title: 'Funding Confirmed',
      body: 'Confirm funding status to continue.',
      buttonLabel: 'Confirm Funding',
      action: 'confirm_funding',
    };
  }

  return {
    title: 'Deal Completed',
    body: 'Congratulations. The investment has been completed successfully.',
    buttonLabel: 'Finish Deal',
    action: 'finish_deal',
  };
}

function formatContactLines(founderProfile: User | null, agreement: InvestmentAgreement | null) {
  if (!founderProfile || !agreement?.founderAccepted || !agreement.investorAccepted) {
    return ['Founder contact details unlock after the agreement is signed.'];
  }
  if (!founderProfile.shareFundingContactInfo) {
    return ['The founder has not shared funding contact details yet.'];
  }
  return [
    founderProfile.email ? `Email: ${founderProfile.email}` : null,
    founderProfile.phone ? `Phone: ${founderProfile.phone}` : null,
    founderProfile.linkedIn ? `LinkedIn: ${founderProfile.linkedIn}` : null,
    founderProfile.website ? `Website: ${founderProfile.website}` : null,
  ].filter((line): line is string => Boolean(line));
}
