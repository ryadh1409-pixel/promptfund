import type { InvestmentInterest, Match } from '@/types/FundingRequest';
import type { DiscussionRoom, InvestmentAgreement, InvestmentOpportunity, V5Investment } from '@/types/InvestmentFlow';

export type OpportunityMap = Record<string, InvestmentOpportunity>;
export type PipelineStepKey =
  | 'interest'
  | 'match'
  | 'discussion'
  | 'agreement'
  | 'funding_instructions'
  | 'funding_confirmed'
  | 'completed';

export type DealPipeline = {
  id: string;
  opportunity?: InvestmentOpportunity;
  interest?: InvestmentInterest;
  match?: Match;
  room?: DiscussionRoom;
  agreement?: InvestmentAgreement;
  investment?: V5Investment;
  currentStep: PipelineStepKey | 'completed';
  completedSteps: Record<PipelineStepKey, boolean>;
};

type DealPipelineDraft = Partial<Omit<DealPipeline, 'completedSteps' | 'currentStep'>> & { id: string };

export const pipelineSteps: Array<{ key: PipelineStepKey; label: string; badgeColor: string; badgeIcon: string }> = [
  { key: 'interest', label: 'Interest Received', badgeColor: '#C8A24A', badgeIcon: '●' },
  { key: 'match', label: 'Match Created', badgeColor: '#409CFF', badgeIcon: '●' },
  { key: 'discussion', label: 'Investment Chat Started', badgeColor: '#8D5CF6', badgeIcon: '●' },
  { key: 'agreement', label: 'Agreement Signed', badgeColor: '#D77A22', badgeIcon: '●' },
  { key: 'funding_instructions', label: 'Funding Instructions', badgeColor: '#C8A24A', badgeIcon: '●' },
  { key: 'funding_confirmed', label: 'Funding Confirmed', badgeColor: '#409CFF', badgeIcon: '●' },
  { key: 'completed', label: 'Deal Completed', badgeColor: '#2E7D32', badgeIcon: '●' },
];

export function getPipelineStageMeta(pipeline: DealPipeline) {
  if (pipeline.currentStep === 'completed') {
    const finalStep = pipelineSteps[pipelineSteps.length - 1];
    return {
      ...finalStep,
      stageNumber: pipelineSteps.length,
      label: finalStep.label,
      badge: `Stage ${pipelineSteps.length} of ${pipelineSteps.length} • ${finalStep.label}`,
    };
  }

  const index = pipelineSteps.findIndex((step) => step.key === pipeline.currentStep);
  const safeIndex = index >= 0 ? index : 0;
  const step = pipelineSteps[safeIndex];

  return {
    ...step,
    stageNumber: safeIndex + 1,
    badge: `Stage ${safeIndex + 1} of ${pipelineSteps.length} • ${step.label}`,
  };
}

export function splitPipelinesByActivity(pipelines: DealPipeline[]) {
  return {
    activePipelines: pipelines.filter((pipeline) => !pipeline.completedSteps.completed),
    archivedPipelines: pipelines.filter((pipeline) => pipeline.completedSteps.completed),
  };
}

export function getPipelineDiscussionRoomId(pipeline: Pick<DealPipeline, 'room' | 'agreement' | 'investment'>) {
  return pipeline.room?.id
    ?? pipeline.agreement?.discussionRoomId
    ?? pipeline.investment?.discussionRoomId;
}

export function buildDealPipelines({
  founderCards,
  interests,
  matches,
  discussionRooms,
  agreements,
  investments,
  opportunities,
  includeFounderCards,
}: {
  founderCards: InvestmentOpportunity[];
  interests: InvestmentInterest[];
  matches: Match[];
  discussionRooms: DiscussionRoom[];
  agreements: InvestmentAgreement[];
  investments: V5Investment[];
  opportunities: OpportunityMap;
  includeFounderCards: boolean;
}) {
  const pipelines = new Map<string, DealPipelineDraft>();
  const agreementById = new Map(agreements.map((agreement) => [agreement.id, agreement]));

  function ensurePipeline(startupId: string) {
    const existing = pipelines.get(startupId);
    if (existing) {
      return existing;
    }

    const next: DealPipelineDraft = {
      id: startupId,
      opportunity: opportunities[startupId],
    };
    pipelines.set(startupId, next);
    return next;
  }

  if (includeFounderCards) {
    founderCards.forEach((opportunity) => {
      const pipeline = ensurePipeline(opportunity.id);
      pipeline.opportunity = opportunity;
    });
  }

  interests.forEach((interest) => {
    const pipeline = ensurePipeline(interest.startupId);
    pipeline.interest = pipeline.interest ?? interest;
  });

  matches.forEach((match) => {
    const pipeline = ensurePipeline(match.startupId);
    pipeline.match = pipeline.match ?? match;
  });

  discussionRooms.forEach((room) => {
    const pipeline = ensurePipeline(room.opportunityId);
    pipeline.room = pipeline.room ?? room;
  });

  agreements.forEach((agreement) => {
    const pipeline = ensurePipeline(agreement.opportunityId);
    pipeline.agreement = pipeline.agreement ?? agreement;
  });

  investments.forEach((investment) => {
    const agreement = investment.agreementId ? agreementById.get(investment.agreementId) : undefined;
    const startupId = investment.opportunityId ?? agreement?.opportunityId ?? investment.projectId ?? investment.id;
    const pipeline = ensurePipeline(startupId);
    pipeline.investment = pipeline.investment ?? investment;
  });

  return Array.from(pipelines.values()).map((pipeline) => {
    const completedSteps = getCompletedPipelineSteps(pipeline);
    const currentStep: DealPipeline['currentStep'] = pipelineSteps.find((step) => !completedSteps[step.key])?.key ?? 'completed';

    return {
      id: pipeline.id,
      opportunity: pipeline.opportunity,
      interest: pipeline.interest,
      match: pipeline.match,
      room: pipeline.room,
      agreement: pipeline.agreement,
      investment: pipeline.investment,
      completedSteps,
      currentStep,
    };
  });
}

export function getCompletedPipelineSteps(pipeline: Partial<DealPipeline>) {
  const investment = pipeline.investment;
  const hasInvestment = Boolean(investment);
  const isFundingConfirmed = investment?.status === 'funding_confirmed'
    || pipeline.agreement?.status === 'completed';
  const isDealCompleted = investment?.status === 'completed' || pipeline.agreement?.status === 'completed';
  const agreementSigned = hasInvestment
    || pipeline.agreement?.status === 'awaiting_funding'
    || pipeline.agreement?.status === 'funding_arranged'
    || pipeline.agreement?.status === 'completed'
    || (pipeline.agreement?.founderAccepted === true && pipeline.agreement?.investorAccepted === true);

  return {
    interest: Boolean(pipeline.interest || pipeline.match || pipeline.room || pipeline.agreement || hasInvestment),
    match: Boolean(pipeline.match || pipeline.room || pipeline.agreement || hasInvestment),
    discussion: Boolean(
      (pipeline.room?.founderReady && pipeline.room?.investorReady)
      || pipeline.agreement
      || hasInvestment
    ),
    agreement: agreementSigned,
    funding_instructions: Boolean(
      pipeline.agreement?.fundingInstructionsAcknowledgedAt
      || hasInvestment
      || pipeline.agreement?.status === 'funding_arranged'
      || pipeline.agreement?.status === 'completed',
    ),
    funding_confirmed: Boolean(isFundingConfirmed),
    completed: Boolean(isDealCompleted),
  };
}

export function buildDealPipelineFromEntities({
  room,
  agreement,
  investment,
  opportunity,
}: {
  room?: DiscussionRoom;
  agreement?: InvestmentAgreement;
  investment?: V5Investment;
  opportunity?: InvestmentOpportunity;
}): DealPipeline {
  const draft: Partial<DealPipeline> = {
    id: room?.opportunityId ?? agreement?.opportunityId ?? investment?.opportunityId ?? 'deal',
    opportunity,
    room,
    agreement,
    investment,
  };
  const completedSteps = getCompletedPipelineSteps(draft);
  const currentStep: DealPipeline['currentStep'] = pipelineSteps.find((step) => !completedSteps[step.key])?.key ?? 'completed';

  return {
    id: draft.id as string,
    opportunity,
    room,
    agreement,
    investment,
    completedSteps,
    currentStep,
  };
}
