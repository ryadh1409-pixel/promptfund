import { firestoreAdapter } from '@/firebase/firestore';
import { AppError } from '@/services/errorHandler';
import { investmentFlowService } from '@/services/investmentFlowService';
import { notificationService } from '@/services/notificationService';
import type { DiscussionRoom, V5Investment } from '@/types/InvestmentFlow';
import type { ModerationFlag, User } from '@/types/User';
import type { AiUsageAnalytics, FounderUpdate, FounderUpdateComment, FounderUpdateKind } from '@/types/Traction';
import { moderateChatMessage } from '@/utils/chatModeration';

function now() {
  return new Date().toISOString();
}

function displayName(profile: Pick<User, 'displayName' | 'name' | 'username' | 'handle'>) {
  return profile.displayName ?? profile.name ?? profile.username ?? profile.handle ?? 'PromptFund Member';
}

async function assertAllowedContent({
  body,
  userId,
  investmentId,
  updateId,
}: {
  body: string;
  userId: string;
  investmentId?: string;
  updateId?: string;
}) {
  const moderation = moderateChatMessage(body);
  if (moderation.allowed) {
    return;
  }

  await firestoreAdapter.create<Omit<ModerationFlag, 'id'>>('moderationFlags', {
    userId,
    messagePreview: body.slice(0, 180),
    categories: moderation.flags,
    status: 'open',
    createdAt: now(),
  });
  console.info('[PromptFund Moderation] blocked traction content', { investmentId, updateId });
  throw new AppError('This content violates PromptFund Community Guidelines.', 'moderation/blocked-content');
}

function participantIds(investment: V5Investment) {
  return [investment.founderId, investment.investorId].filter((uid): uid is string => Boolean(uid));
}

function nextPortfolioFields(stage: V5Investment['portfolioStage']) {
  if (stage === 'testflight_ready') {
    return { portfolioStage: stage, portfolioStageNumber: 6 as const, currentStage: 'TestFlight Ready' };
  }
  if (stage === 'production_ready') {
    return { portfolioStage: stage, portfolioStageNumber: 7 as const, currentStage: 'Production Ready' };
  }
  if (stage === 'growing_portfolio_company') {
    return { portfolioStage: stage, portfolioStageNumber: 8 as const, currentStage: 'Growing Portfolio Company' };
  }
  return { portfolioStage: 'traction_updates' as const, portfolioStageNumber: 5 as const, currentStage: 'Post-Investment Traction' };
}

export const tractionService = {
  async listPortfolioByUser(userId: string, role: 'founder' | 'investor') {
    return role === 'founder'
      ? investmentFlowService.listInvestmentsByFounder(userId)
      : investmentFlowService.listInvestmentsByInvestor(userId);
  },

  async listUpdatesByInvestment(investmentId: string) {
    const updates = await firestoreAdapter.queryByField<FounderUpdate>('founderUpdates', 'investmentId', investmentId);
    return [...updates].sort((left, right) => String(right.createdAt).localeCompare(String(left.createdAt)));
  },

  async listCommentsByUpdate(updateId: string) {
    const comments = await firestoreAdapter.queryByField<FounderUpdateComment>('founderUpdateComments', 'updateId', updateId);
    return [...comments].sort((left, right) => String(left.createdAt).localeCompare(String(right.createdAt)));
  },

  async getAiUsage(investment: V5Investment): Promise<AiUsageAnalytics> {
    const existing = await firestoreAdapter.getById<AiUsageAnalytics>('aiUsage', investment.id);
    if (existing) {
      return existing;
    }

    return {
      id: investment.id,
      investmentId: investment.id,
      founderId: investment.founderId ?? '',
      investorId: investment.investorId,
      totalTokens: 0,
      tokensThisMonth: 0,
      tokensToday: 0,
      aiConversations: 0,
      lastAiActivity: undefined,
    };
  },

  async publishFounderUpdate({
    investment,
    founder,
    description,
    kind,
    photoUrls,
    screenshotUrls,
    videoLink,
    testFlightLink,
    appStoreLink,
    website,
    demoLink,
    revenue,
    arr,
    mrr,
    users,
    downloads,
    milestones,
    productUpdates,
    hiringUpdates,
    newFundingRounds,
  }: {
    investment: V5Investment;
    founder: Pick<User, 'id' | 'displayName' | 'name' | 'username' | 'handle'>;
    description: string;
    kind: FounderUpdateKind;
    photoUrls?: string[];
    screenshotUrls?: string[];
    videoLink?: string;
    testFlightLink?: string;
    appStoreLink?: string;
    website?: string;
    demoLink?: string;
    revenue?: number;
    arr?: number;
    mrr?: number;
    users?: number;
    downloads?: number;
    milestones?: string;
    productUpdates?: string;
    hiringUpdates?: string;
    newFundingRounds?: string;
  }) {
    if (investment.founderId !== founder.id) {
      throw new AppError('Only the Founder can publish portfolio updates.', 'traction/not-founder');
    }

    await assertAllowedContent({ body: description, userId: founder.id, investmentId: investment.id });

    const founderName = displayName(founder);
    const update = await firestoreAdapter.create<Omit<FounderUpdate, 'id'>>('founderUpdates', {
      investmentId: investment.id,
      opportunityId: investment.opportunityId,
      discussionRoomId: investment.discussionRoomId,
      founderId: founder.id,
      founderName,
      investorId: investment.investorId,
      startupName: investment.startupName ?? 'Portfolio Company',
      description,
      kind,
      photoUrls,
      screenshotUrls,
      videoLink,
      testFlightLink,
      appStoreLink,
      website,
      demoLink,
      revenue,
      arr,
      mrr,
      users,
      downloads,
      milestones,
      productUpdates,
      hiringUpdates,
      newFundingRounds,
      likeCount: 0,
      commentCount: 0,
      likedBy: {},
      createdAt: now(),
    });

    await firestoreAdapter.update<V5Investment>('investments', investment.id, {
      ...nextPortfolioFields('traction_updates'),
      lastUpdateAt: update.createdAt,
    });

    await Promise.all(participantIds(investment).filter((uid) => uid !== founder.id).map((userId) => notificationService.createNotification({
      userId,
      title: 'New founder update',
      body: `${founderName} posted an update for ${investment.startupName ?? 'your portfolio company'}.`,
      type: revenue || arr || mrr ? 'revenue_updated' : 'founder_update',
      data: { investmentId: investment.id, updateId: update.id },
    })));

    return update;
  },

  async likeUpdate(update: FounderUpdate, userId: string) {
    const likedBy = {
      ...(update.likedBy ?? {}),
      [userId]: true,
    };
    return firestoreAdapter.update<FounderUpdate>('founderUpdates', update.id, {
      likedBy,
      likeCount: Object.values(likedBy).filter(Boolean).length,
    });
  },

  async addComment({
    update,
    investment,
    author,
    body,
    parentCommentId,
  }: {
    update: FounderUpdate;
    investment: V5Investment;
    author: Pick<User, 'id' | 'displayName' | 'name' | 'username' | 'handle'>;
    body: string;
    parentCommentId?: string;
  }) {
    await assertAllowedContent({ body, userId: author.id, investmentId: investment.id, updateId: update.id });
    const comment = await firestoreAdapter.create<Omit<FounderUpdateComment, 'id'>>('founderUpdateComments', {
      updateId: update.id,
      investmentId: investment.id,
      parentCommentId,
      authorId: author.id,
      authorName: displayName(author),
      body,
      createdAt: now(),
    });

    await firestoreAdapter.update<FounderUpdate>('founderUpdates', update.id, {
      commentCount: (update.commentCount ?? 0) + 1,
    });

    await Promise.all(participantIds(investment).filter((uid) => uid !== author.id).map((userId) => notificationService.createNotification({
      userId,
      title: parentCommentId ? 'New reply' : 'New comment',
      body: `${displayName(author)} commented on ${update.startupName}.`,
      type: 'comment',
      data: { investmentId: investment.id, updateId: update.id },
    })));

    return comment;
  },

  async markTestFlightAvailable(investment: V5Investment, testFlightLink?: string) {
    if (!investment.founderId) {
      throw new AppError('Founder profile is missing for this investment.', 'traction/missing-founder');
    }

    const updated = await firestoreAdapter.update<V5Investment>('investments', investment.id, {
      ...nextPortfolioFields('testflight_ready'),
      testFlightAvailable: true,
      testFlightAvailableAt: now(),
      lastUpdateAt: now(),
    });

    await notificationService.createNotification({
      userId: investment.investorId,
      title: 'TestFlight ready',
      body: `${investment.startupName ?? 'A portfolio company'} is ready for TestFlight testing.`,
      type: 'testflight_ready',
      data: { investmentId: investment.id, testFlightLink: testFlightLink ?? '' },
    });

    return updated;
  },

  async reviewTestFlight(investment: V5Investment, reviewerId: string, decision: 'tested' | 'needs_changes') {
    if (investment.investorId !== reviewerId) {
      throw new AppError('Only the Angel Investor can review TestFlight.', 'traction/not-investor');
    }

    const isApproved = decision === 'tested';
    const updated = await firestoreAdapter.update<V5Investment>('investments', investment.id, {
      ...(isApproved ? nextPortfolioFields('production_ready') : nextPortfolioFields('testflight_ready')),
      testFlightTested: isApproved,
      testFlightTestedAt: isApproved ? now() : undefined,
      needsChanges: !isApproved,
      needsChangesAt: !isApproved ? now() : undefined,
      lastUpdateAt: now(),
    });

    if (investment.founderId) {
      await notificationService.createNotification({
        userId: investment.founderId,
        title: isApproved ? 'TestFlight approved' : 'TestFlight needs changes',
        body: isApproved
          ? `${investment.startupName ?? 'Your startup'} moved to Production Ready.`
          : `The Angel Investor requested changes for ${investment.startupName ?? 'your startup'}.`,
        type: isApproved ? 'testflight_approved' : 'milestone_completed',
        data: { investmentId: investment.id },
      });
    }

    return updated;
  },

  async markGrowingPortfolioCompany(investment: V5Investment) {
    const updated = await firestoreAdapter.update<V5Investment>('investments', investment.id, {
      ...nextPortfolioFields('growing_portfolio_company'),
      lastUpdateAt: now(),
    });

    await Promise.all(participantIds(investment).map((userId) => notificationService.createNotification({
      userId,
      title: 'Milestone completed',
      body: `${investment.startupName ?? 'Portfolio company'} is now a Growing Portfolio Company.`,
      type: 'milestone_completed',
      data: { investmentId: investment.id },
    })));

    return updated;
  },

  async getInvestmentChat(investment: V5Investment): Promise<DiscussionRoom | null> {
    return investment.discussionRoomId ? investmentFlowService.getDiscussionRoom(investment.discussionRoomId) : null;
  },
};
