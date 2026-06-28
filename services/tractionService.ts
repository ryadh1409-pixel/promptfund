import { firestoreAdapter } from '@/firebase/firestore';
import { AppError } from '@/services/errorHandler';
import { investmentFlowService } from '@/services/investmentFlowService';
import { notificationService } from '@/services/notificationService';
import type { DiscussionRoom, V5Investment } from '@/types/InvestmentFlow';
import type { ModerationFlag, User } from '@/types/User';
import type { FounderUpdate, FounderUpdateComment, FounderUpdateKind } from '@/types/Traction';
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

export const tractionService = {
  async publishFounderUpdate({
    investment,
    founder,
    description,
    kind,
    photoUrls,
    screenshotUrls,
    videoLink,
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
      founderId: investment.founderId ?? update.founderId,
      investorId: investment.investorId,
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

  async getInvestmentChat(investment: V5Investment): Promise<DiscussionRoom | null> {
    return investment.discussionRoomId ? investmentFlowService.getDiscussionRoom(investment.discussionRoomId) : null;
  },
};
