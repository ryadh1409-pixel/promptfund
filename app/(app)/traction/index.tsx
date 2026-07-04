import { router } from 'expo-router';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from 'react';
import { Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { StartupPlayingCard, type StartupCard } from '@/components/cards/StartupPlayingCard';
import { Card, EmptyState, FieldPreview, LoadingState, PrimaryButton, Screen, StatCard, ui } from '@/components/ui/Primitives';
import { colors, radii, spacing } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { getPromptFundFirestore } from '@/firebase/firestore';
import { getFriendlyErrorMessage } from '@/services/errorHandler';
import { tractionService } from '@/services/tractionService';
import type { V5Investment } from '@/types/InvestmentFlow';
import type { FounderUpdate, FounderUpdateComment, FounderUpdateKind } from '@/types/Traction';
import {
  dedupeInvestmentsById,
  describeTractionExclusion,
  isTractionPortfolioInvestment,
  logTractionQuerySnapshot,
} from '@/utils/tractionPortfolio';
import { investmentFlowService } from '@/services/investmentFlowService';
import { safeCurrency, safeDate, safePercent } from '@/utils/safeFormat';

type UpdateDraft = {
  description: string;
  kind: FounderUpdateKind;
  photoUrls: string;
  screenshotUrls: string;
  videoLink: string;
  appStoreLink: string;
  website: string;
  demoLink: string;
  revenue: string;
  arr: string;
  mrr: string;
  users: string;
  downloads: string;
  milestones: string;
  productUpdates: string;
  hiringUpdates: string;
  newFundingRounds: string;
};

const emptyDraft: UpdateDraft = {
  description: '',
  kind: 'general',
  photoUrls: '',
  screenshotUrls: '',
  videoLink: '',
  appStoreLink: '',
  website: '',
  demoLink: '',
  revenue: '',
  arr: '',
  mrr: '',
  users: '',
  downloads: '',
  milestones: '',
  productUpdates: '',
  hiringUpdates: '',
  newFundingRounds: '',
};

export default function TractionScreen() {
  const { authUser, profile } = useAuth();
  const isAdminMode = profile?.role === 'admin';
  const [investments, setInvestments] = useState<V5Investment[]>([]);
  const [updatesByInvestment, setUpdatesByInvestment] = useState<Record<string, FounderUpdate[]>>({});
  const [commentsByUpdate, setCommentsByUpdate] = useState<Record<string, FounderUpdateComment[]>>({});
  const [drafts, setDrafts] = useState<Record<string, UpdateDraft>>({});
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!authUser?.uid) {
      setInvestments([]);
      setUpdatesByInvestment({});
      setCommentsByUpdate({});
      setIsLoading(false);
      return;
    }

    setNotice(null);
    setIsLoading(true);
    const database = getPromptFundFirestore();
    const participantId = authUser.uid;

    let founderInvestments: V5Investment[] = [];
    let investorInvestments: V5Investment[] = [];
    let adminInvestments: V5Investment[] = [];
    let founderUpdates: FounderUpdate[] = [];
    let investorUpdates: FounderUpdate[] = [];
    let adminUpdates: FounderUpdate[] = [];
    let founderComments: FounderUpdateComment[] = [];
    let investorComments: FounderUpdateComment[] = [];
    let adminComments: FounderUpdateComment[] = [];

    const syncInvestments = () => {
      const nextInvestments = isAdminMode
        ? adminInvestments
        : dedupeInvestmentsById([...founderInvestments, ...investorInvestments]);
      const fundedInvestments = nextInvestments.filter(isTractionPortfolioInvestment);
      const excludedDocuments = nextInvestments.flatMap((investment) => {
        const reason = describeTractionExclusion(investment);
        return reason
          ? [{
            id: investment.id,
            status: investment.status ?? null,
            founderId: investment.founderId ?? null,
            investorId: investment.investorId ?? null,
            reason,
          }]
          : [];
      });

      logTractionQuerySnapshot({
        collection: 'investments',
        filters: isAdminMode
          ? { mode: 'admin', collection: 'investments/*' }
          : { founderId: participantId, investorId: participantId },
        rawDocumentCount: nextInvestments.length,
        documents: fundedInvestments.map((investment) => ({
          id: investment.id,
          status: investment.status ?? null,
          founderId: investment.founderId ?? null,
          investorId: investment.investorId ?? null,
          opportunityId: investment.opportunityId ?? null,
          startupId: investment.startupId ?? null,
          startupImage: investment.startupImage ?? null,
          fundedAmount: investment.fundedAmount ?? investment.amount ?? null,
          isTraction: investment.isTraction ?? null,
          isPortfolio: investment.isPortfolio ?? null,
          completedAt: investment.completedAt ?? null,
        })),
        excludedDocuments,
      });

      setInvestments((current) => updateArrayIfChanged(current, fundedInvestments));
      setIsLoading(false);
    };

    const syncUpdates = () => {
      const nextUpdates = isAdminMode
        ? adminUpdates
        : dedupeById([...founderUpdates, ...investorUpdates]);
      const grouped = groupByInvestment(nextUpdates);

      logTractionQuerySnapshot({
        collection: 'founderUpdates',
        filters: isAdminMode
          ? { mode: 'admin', collection: 'founderUpdates/*' }
          : { founderId: participantId, investorId: participantId },
        rawDocumentCount: nextUpdates.length,
        documents: nextUpdates.map((update) => ({
          id: update.id,
          status: update.investmentId,
          founderId: update.founderId,
          investorId: update.investorId,
        })),
      });

      setUpdatesByInvestment((current) => updateRecordIfChanged(current, grouped));
    };

    const syncComments = () => {
      const nextComments = isAdminMode
        ? adminComments
        : dedupeById([...founderComments, ...investorComments]);
      const grouped = groupCommentsByUpdate(nextComments);

      logTractionQuerySnapshot({
        collection: 'founderUpdateComments',
        filters: isAdminMode
          ? { mode: 'admin', collection: 'founderUpdateComments/*' }
          : { founderId: participantId, investorId: participantId },
        rawDocumentCount: nextComments.length,
        documents: nextComments.map((comment) => ({
          id: comment.id,
          status: comment.updateId,
          founderId: comment.founderId,
          investorId: comment.investorId,
        })),
      });

      setCommentsByUpdate((current) => updateRecordIfChanged(current, grouped));
    };

    const handleSnapshotError = (error: unknown) => {
      setNotice(getFriendlyErrorMessage(error));
      setIsLoading(false);
    };

    const unsubscribeInvestments = isAdminMode
      ? onSnapshot(
        collection(database, 'investments'),
        (snapshot) => {
          adminInvestments = snapshot.docs.map((item) => ({ ...item.data(), id: item.id }) as V5Investment);
          syncInvestments();
        },
        handleSnapshotError,
      )
      : (() => {
        const founderInvestmentsQuery = query(collection(database, 'investments'), where('founderId', '==', participantId));
        const investorInvestmentsQuery = query(collection(database, 'investments'), where('investorId', '==', participantId));

        const unsubscribeFounderInvestments = onSnapshot(
          founderInvestmentsQuery,
          (snapshot) => {
            founderInvestments = snapshot.docs.map((item) => ({ ...item.data(), id: item.id }) as V5Investment);
            syncInvestments();
          },
          handleSnapshotError,
        );
        const unsubscribeInvestorInvestments = onSnapshot(
          investorInvestmentsQuery,
          (snapshot) => {
            investorInvestments = snapshot.docs.map((item) => ({ ...item.data(), id: item.id }) as V5Investment);
            syncInvestments();
          },
          handleSnapshotError,
        );

        return () => {
          unsubscribeFounderInvestments();
          unsubscribeInvestorInvestments();
        };
      })();

    const unsubscribeUpdates = isAdminMode
      ? onSnapshot(
        collection(database, 'founderUpdates'),
        (snapshot) => {
          adminUpdates = snapshot.docs.map((item) => ({ ...item.data(), id: item.id }) as FounderUpdate);
          syncUpdates();
        },
        handleSnapshotError,
      )
      : (() => {
        const founderUpdatesQuery = query(collection(database, 'founderUpdates'), where('founderId', '==', participantId));
        const investorUpdatesQuery = query(collection(database, 'founderUpdates'), where('investorId', '==', participantId));

        const unsubscribeFounderUpdates = onSnapshot(
          founderUpdatesQuery,
          (snapshot) => {
            founderUpdates = snapshot.docs.map((item) => ({ ...item.data(), id: item.id }) as FounderUpdate);
            syncUpdates();
          },
          handleSnapshotError,
        );
        const unsubscribeInvestorUpdates = onSnapshot(
          investorUpdatesQuery,
          (snapshot) => {
            investorUpdates = snapshot.docs.map((item) => ({ ...item.data(), id: item.id }) as FounderUpdate);
            syncUpdates();
          },
          handleSnapshotError,
        );

        return () => {
          unsubscribeFounderUpdates();
          unsubscribeInvestorUpdates();
        };
      })();

    const unsubscribeComments = isAdminMode
      ? onSnapshot(
        collection(database, 'founderUpdateComments'),
        (snapshot) => {
          adminComments = snapshot.docs.map((item) => ({ ...item.data(), id: item.id }) as FounderUpdateComment);
          syncComments();
        },
        handleSnapshotError,
      )
      : (() => {
        const founderCommentsQuery = query(collection(database, 'founderUpdateComments'), where('founderId', '==', participantId));
        const investorCommentsQuery = query(collection(database, 'founderUpdateComments'), where('investorId', '==', participantId));

        const unsubscribeFounderComments = onSnapshot(
          founderCommentsQuery,
          (snapshot) => {
            founderComments = snapshot.docs.map((item) => ({ ...item.data(), id: item.id }) as FounderUpdateComment);
            syncComments();
          },
          handleSnapshotError,
        );
        const unsubscribeInvestorComments = onSnapshot(
          investorCommentsQuery,
          (snapshot) => {
            investorComments = snapshot.docs.map((item) => ({ ...item.data(), id: item.id }) as FounderUpdateComment);
            syncComments();
          },
          handleSnapshotError,
        );

        return () => {
          unsubscribeFounderComments();
          unsubscribeInvestorComments();
        };
      })();

    return () => {
      if (typeof unsubscribeInvestments === 'function') {
        unsubscribeInvestments();
      }
      if (typeof unsubscribeUpdates === 'function') {
        unsubscribeUpdates();
      }
      if (typeof unsubscribeComments === 'function') {
        unsubscribeComments();
      }
    };
  }, [authUser?.uid, isAdminMode]);

  const totalCapital = investments.reduce(
    (sum, investment) => sum + (investment.fundedAmount ?? investment.amount ?? 0),
    0,
  );

  async function handlePublishUpdate(investment: V5Investment) {
    if (!profile) {
      return;
    }

    const draft = drafts[investment.id] ?? emptyDraft;
    if (!draft.description.trim()) {
      setNotice('Add a founder update before publishing.');
      return;
    }

    try {
      setIsSaving(true);
      await tractionService.publishFounderUpdate({
        investment,
        founder: profile,
        description: draft.description.trim(),
        kind: draft.kind,
        photoUrls: parseList(draft.photoUrls),
        screenshotUrls: parseList(draft.screenshotUrls),
        videoLink: draft.videoLink.trim() || undefined,
        appStoreLink: draft.appStoreLink.trim() || undefined,
        website: draft.website.trim() || undefined,
        demoLink: draft.demoLink.trim() || undefined,
        revenue: parseNumber(draft.revenue),
        arr: parseNumber(draft.arr),
        mrr: parseNumber(draft.mrr),
        users: parseNumber(draft.users),
        downloads: parseNumber(draft.downloads),
        milestones: draft.milestones.trim() || undefined,
        productUpdates: draft.productUpdates.trim() || undefined,
        hiringUpdates: draft.hiringUpdates.trim() || undefined,
        newFundingRounds: draft.newFundingRounds.trim() || undefined,
      });
      setDrafts((current) => ({ ...current, [investment.id]: emptyDraft }));
    } catch (error) {
      setNotice(getFriendlyErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleLike(update: FounderUpdate) {
    if (!authUser) return;
    try {
      await tractionService.likeUpdate(update, authUser.uid);
    } catch (error) {
      setNotice(getFriendlyErrorMessage(error));
    }
  }

  async function handleAddComment(investment: V5Investment, update: FounderUpdate, parentCommentId?: string) {
    if (!profile) return;
    const draftKey = parentCommentId ?? update.id;
    const body = parentCommentId ? replyDrafts[draftKey] : commentDrafts[draftKey];
    if (!body?.trim()) return;

    try {
      await tractionService.addComment({
        update,
        investment,
        author: profile,
        body: body.trim(),
        parentCommentId,
      });
      if (parentCommentId) {
        setReplyDrafts((current) => ({ ...current, [draftKey]: '' }));
      } else {
        setCommentDrafts((current) => ({ ...current, [draftKey]: '' }));
      }
    } catch (error) {
      setNotice(getFriendlyErrorMessage(error));
    }
  }

  return (
    <Screen
      eyebrow="Traction"
      title="Portfolio Companies"
      subtitle="PromptFund keeps adding value after funding with updates, milestones, and permanent Investment Chat."
    >
      {isLoading ? <LoadingState label="Loading Traction portfolio" /> : null}
      {notice ? (
        <Card>
          <Text style={styles.notice}>{notice}</Text>
        </Card>
      ) : null}

      <View style={ui.row}>
        <StatCard label="Portfolio Companies" value={String(investments.length)} tone={colors.luxuryGold} />
        <StatCard label="Total Capital" value={safeCurrency(totalCapital)} tone={colors.success} />
      </View>
      {!isLoading && investments.length === 0 ? (
        <EmptyState
          title="No funded portfolio companies yet."
          message="Completed investments stay here permanently after funding is confirmed."
        />
      ) : null}

      {investments.map((investment) => (
        <PortfolioCompanyCard
          key={investment.id}
          investment={investment}
          updates={updatesByInvestment[investment.id] ?? []}
          commentsByUpdate={commentsByUpdate}
          canPublishUpdates={authUser?.uid === investment.founderId}
          draft={drafts[investment.id] ?? emptyDraft}
          setDraft={(draft) => setDrafts((current) => ({ ...current, [investment.id]: draft }))}
          commentDrafts={commentDrafts}
          setCommentDrafts={setCommentDrafts}
          replyDrafts={replyDrafts}
          setReplyDrafts={setReplyDrafts}
          isSaving={isSaving}
          onPublishUpdate={() => handlePublishUpdate(investment)}
          onLike={handleLike}
          onComment={(update) => handleAddComment(investment, update)}
          onReply={(update, commentId) => handleAddComment(investment, update, commentId)}
        />
      ))}
    </Screen>
  );
}

function PortfolioCompanyCard({
  investment,
  updates,
  commentsByUpdate,
  canPublishUpdates,
  draft,
  setDraft,
  commentDrafts,
  setCommentDrafts,
  replyDrafts,
  setReplyDrafts,
  isSaving,
  onPublishUpdate,
  onLike,
  onComment,
  onReply,
}: {
  investment: V5Investment;
  updates: FounderUpdate[];
  commentsByUpdate: Record<string, FounderUpdateComment[]>;
  canPublishUpdates: boolean;
  draft: UpdateDraft;
  setDraft: (draft: UpdateDraft) => void;
  commentDrafts: Record<string, string>;
  setCommentDrafts: Dispatch<SetStateAction<Record<string, string>>>;
  replyDrafts: Record<string, string>;
  setReplyDrafts: Dispatch<SetStateAction<Record<string, string>>>;
  isSaving: boolean;
  onPublishUpdate: () => void;
  onLike: (update: FounderUpdate) => void;
  onComment: (update: FounderUpdate) => void;
  onReply: (update: FounderUpdate, commentId: string) => void;
}) {
  return (
    <Card style={styles.companyCard}>
      <View style={styles.headerRow}>
        <View style={styles.titleBlock}>
          <Text style={styles.companyTitle}>{investment.startupName ?? 'Portfolio Company'}</Text>
          <Text style={styles.meta}>Founder: {investment.founderName ?? 'Founder'}</Text>
          <Text style={styles.meta}>Angel Investor: {investment.investorName ?? 'Angel Investor'}</Text>
        </View>
      </View>

      <View style={styles.cardWrap}>
        <StartupPlayingCard card={mapInvestmentToStartupCard(investment)} compact />
      </View>

      <View style={styles.founderRow}>
        <View style={styles.founderAvatar}>
          <Text style={styles.founderAvatarText}>{initials(investment.founderName)}</Text>
        </View>
        <View>
          <Text style={styles.founderName}>{investment.founderName ?? 'Founder'}</Text>
          <Text style={styles.meta}>Permanent portfolio company profile</Text>
        </View>
      </View>

      <View style={styles.detailGrid}>
        <FieldPreview label="Investment Amount" value={safeCurrency(investment.fundedAmount ?? investment.amount)} />
        <FieldPreview label="Equity" value={safePercent(investment.allocation)} />
        <FieldPreview label="Investment Date" value={safeDate(investment.completedAt ?? investment.fundedAt ?? investment.createdAt)} />
        <FieldPreview label="Current Status" value={formatTractionStatus(investment.status)} />
      </View>

      <PrimaryButton
        label="Open Investment Chat"
        variant="secondary"
        onPress={() => investment.discussionRoomId ? router.push(`/discussion-room/${investment.discussionRoomId}`) : undefined}
        disabled={!investment.discussionRoomId}
      />

      {canPublishUpdates ? (
        <FounderUpdateComposer draft={draft} setDraft={setDraft} onPublish={onPublishUpdate} disabled={isSaving} />
      ) : null}

      <View style={styles.updates}>
        <Text style={styles.sectionTitle}>Investor Feed</Text>
        {updates.length === 0 ? <Text style={styles.meta}>No founder updates yet.</Text> : null}
        {updates.map((update) => (
          <FounderUpdateCard
            key={update.id}
            update={update}
            comments={commentsByUpdate[update.id] ?? []}
            commentDraft={commentDrafts[update.id] ?? ''}
            replyDrafts={replyDrafts}
            setCommentDraft={(body) => setCommentDrafts((current) => ({ ...current, [update.id]: body }))}
            setReplyDraft={(commentId, body) => setReplyDrafts((current) => ({ ...current, [commentId]: body }))}
            onLike={() => onLike(update)}
            onComment={() => onComment(update)}
            onReply={(commentId) => onReply(update, commentId)}
          />
        ))}
      </View>
    </Card>
  );
}

function FounderUpdateComposer({
  draft,
  setDraft,
  onPublish,
  disabled,
}: {
  draft: UpdateDraft;
  setDraft: (draft: UpdateDraft) => void;
  onPublish: () => void;
  disabled: boolean;
}) {
  return (
    <Card style={styles.composer}>
      <Text style={styles.sectionTitle}>Publish Founder Update</Text>
      <TextInput placeholder="Professional update, milestone, product progress, revenue, hiring, funding round..." placeholderTextColor={colors.subtle} multiline value={draft.description} onChangeText={(description) => setDraft({ ...draft, description })} style={[styles.input, styles.textArea]} />
      <View style={styles.kindRow}>
        {(['general', 'product', 'milestone', 'revenue', 'hiring', 'funding'] as FounderUpdateKind[]).map((kind) => (
          <Pressable key={kind} onPress={() => setDraft({ ...draft, kind })} style={[styles.kindChip, draft.kind === kind ? styles.kindChipActive : null]}>
            <Text style={styles.kindText}>{kind}</Text>
          </Pressable>
        ))}
      </View>
      <TextInput placeholder="Photo URLs, comma separated" placeholderTextColor={colors.subtle} value={draft.photoUrls} onChangeText={(photoUrls) => setDraft({ ...draft, photoUrls })} style={styles.input} />
      <TextInput placeholder="Screenshot URLs, comma separated" placeholderTextColor={colors.subtle} value={draft.screenshotUrls} onChangeText={(screenshotUrls) => setDraft({ ...draft, screenshotUrls })} style={styles.input} />
      <TextInput placeholder="Video link" placeholderTextColor={colors.subtle} value={draft.videoLink} onChangeText={(videoLink) => setDraft({ ...draft, videoLink })} style={styles.input} />
      <TextInput placeholder="App Store link" placeholderTextColor={colors.subtle} value={draft.appStoreLink} onChangeText={(appStoreLink) => setDraft({ ...draft, appStoreLink })} style={styles.input} />
      <TextInput placeholder="Website" placeholderTextColor={colors.subtle} value={draft.website} onChangeText={(website) => setDraft({ ...draft, website })} style={styles.input} />
      <TextInput placeholder="Demo link" placeholderTextColor={colors.subtle} value={draft.demoLink} onChangeText={(demoLink) => setDraft({ ...draft, demoLink })} style={styles.input} />
      <View style={ui.row}>
        <TextInput placeholder="Revenue" placeholderTextColor={colors.subtle} value={draft.revenue} onChangeText={(revenue) => setDraft({ ...draft, revenue })} keyboardType="numeric" style={[styles.input, styles.flexInput]} />
        <TextInput placeholder="MRR" placeholderTextColor={colors.subtle} value={draft.mrr} onChangeText={(mrr) => setDraft({ ...draft, mrr })} keyboardType="numeric" style={[styles.input, styles.flexInput]} />
      </View>
      <View style={ui.row}>
        <TextInput placeholder="ARR" placeholderTextColor={colors.subtle} value={draft.arr} onChangeText={(arr) => setDraft({ ...draft, arr })} keyboardType="numeric" style={[styles.input, styles.flexInput]} />
        <TextInput placeholder="Users" placeholderTextColor={colors.subtle} value={draft.users} onChangeText={(users) => setDraft({ ...draft, users })} keyboardType="numeric" style={[styles.input, styles.flexInput]} />
      </View>
      <TextInput placeholder="Downloads" placeholderTextColor={colors.subtle} value={draft.downloads} onChangeText={(downloads) => setDraft({ ...draft, downloads })} keyboardType="numeric" style={styles.input} />
      <TextInput placeholder="Milestones" placeholderTextColor={colors.subtle} value={draft.milestones} onChangeText={(milestones) => setDraft({ ...draft, milestones })} style={styles.input} />
      <TextInput placeholder="Product updates" placeholderTextColor={colors.subtle} value={draft.productUpdates} onChangeText={(productUpdates) => setDraft({ ...draft, productUpdates })} style={styles.input} />
      <TextInput placeholder="Hiring updates" placeholderTextColor={colors.subtle} value={draft.hiringUpdates} onChangeText={(hiringUpdates) => setDraft({ ...draft, hiringUpdates })} style={styles.input} />
      <TextInput placeholder="New funding rounds" placeholderTextColor={colors.subtle} value={draft.newFundingRounds} onChangeText={(newFundingRounds) => setDraft({ ...draft, newFundingRounds })} style={styles.input} />
      <PrimaryButton label={disabled ? 'Publishing...' : 'Publish Update'} onPress={onPublish} disabled={disabled || !draft.description.trim()} />
    </Card>
  );
}

function FounderUpdateCard({
  update,
  comments,
  commentDraft,
  replyDrafts,
  setCommentDraft,
  setReplyDraft,
  onLike,
  onComment,
  onReply,
}: {
  update: FounderUpdate;
  comments: FounderUpdateComment[];
  commentDraft: string;
  replyDrafts: Record<string, string>;
  setCommentDraft: (body: string) => void;
  setReplyDraft: (commentId: string, body: string) => void;
  onLike: () => void;
  onComment: () => void;
  onReply: (commentId: string) => void;
}) {
  return (
    <Card style={styles.updateCard}>
      <Text style={styles.updateKind}>{update.kind}</Text>
      <Text style={styles.updateBody}>{update.description}</Text>
      <Text style={styles.meta}>{update.founderName} · {safeDate(update.createdAt)} · {formatTime(update.createdAt)}</Text>
      <MediaStrip urls={[...(update.photoUrls ?? []), ...(update.screenshotUrls ?? [])]} />
      <View style={styles.detailGrid}>
        {update.revenue !== undefined ? <FieldPreview label="Revenue" value={safeCurrency(update.revenue)} /> : null}
        {update.mrr !== undefined ? <FieldPreview label="MRR" value={safeCurrency(update.mrr)} /> : null}
        {update.arr !== undefined ? <FieldPreview label="ARR" value={safeCurrency(update.arr)} /> : null}
        {update.users !== undefined ? <FieldPreview label="Users" value={update.users.toLocaleString()} /> : null}
        {update.downloads !== undefined ? <FieldPreview label="Downloads" value={update.downloads.toLocaleString()} /> : null}
      </View>
      <LinkList update={update} />
      <View style={styles.actionRow}>
        <PrimaryButton label={`Like (${update.likeCount ?? 0})`} variant="secondary" onPress={onLike} />
      </View>
      <TextInput placeholder="Comment on this update" placeholderTextColor={colors.subtle} value={commentDraft} onChangeText={setCommentDraft} style={styles.input} />
      <PrimaryButton label="Post Comment" variant="secondary" onPress={onComment} disabled={!commentDraft.trim()} />
      {comments.map((comment) => (
        <View key={comment.id} style={[styles.comment, comment.parentCommentId ? styles.reply : null]}>
          <Text style={styles.commentAuthor}>{comment.authorName}</Text>
          <Text style={styles.commentBody}>{comment.body}</Text>
          <Text style={styles.meta}>{safeDate(comment.createdAt)} · {formatTime(comment.createdAt)}</Text>
          <TextInput placeholder="Reply" placeholderTextColor={colors.subtle} value={replyDrafts[comment.id] ?? ''} onChangeText={(body) => setReplyDraft(comment.id, body)} style={styles.input} />
          <PrimaryButton label="Reply" variant="secondary" onPress={() => onReply(comment.id)} disabled={!replyDrafts[comment.id]?.trim()} />
        </View>
      ))}
    </Card>
  );
}

function MediaStrip({ urls }: { urls: string[] }) {
  if (urls.length === 0) {
    return null;
  }

  return (
    <View style={styles.mediaGrid}>
      {urls.slice(0, 4).map((url) => (
        <Image key={url} source={{ uri: url }} style={styles.updateImage} />
      ))}
    </View>
  );
}

function LinkList({ update }: { update: FounderUpdate }) {
  const links = [
    update.videoLink ? ['Video', update.videoLink] : null,
    update.appStoreLink ? ['App Store', update.appStoreLink] : null,
    update.website ? ['Website', update.website] : null,
    update.demoLink ? ['Demo', update.demoLink] : null,
    update.milestones ? ['Milestones', update.milestones] : null,
    update.productUpdates ? ['Product', update.productUpdates] : null,
    update.hiringUpdates ? ['Hiring', update.hiringUpdates] : null,
    update.newFundingRounds ? ['Funding Round', update.newFundingRounds] : null,
  ].filter((item): item is string[] => item !== null);

  if (links.length === 0) {
    return null;
  }

  return (
    <View style={styles.linkList}>
      {links.map(([label, value]) => (
        <Text key={`${label}-${value}`} style={styles.linkText}>{label}: {value}</Text>
      ))}
    </View>
  );
}

function groupByInvestment(updates: FounderUpdate[]) {
  return updates
    .sort((left, right) => String(right.createdAt).localeCompare(String(left.createdAt)))
    .reduce<Record<string, FounderUpdate[]>>((groups, update) => {
      groups[update.investmentId] = [...(groups[update.investmentId] ?? []), update];
      return groups;
    }, {});
}

function groupCommentsByUpdate(comments: FounderUpdateComment[]) {
  return comments
    .sort((left, right) => String(left.createdAt).localeCompare(String(right.createdAt)))
    .reduce<Record<string, FounderUpdateComment[]>>((groups, comment) => {
      groups[comment.updateId] = [...(groups[comment.updateId] ?? []), comment];
      return groups;
    }, {});
}

function updateArrayIfChanged<T>(current: T[], next: T[]) {
  return stableStringify(current) === stableStringify(next) ? current : next;
}

function updateRecordIfChanged<T>(current: Record<string, T[]>, next: Record<string, T[]>) {
  return stableStringify(current) === stableStringify(next) ? current : next;
}

function dedupeById<T extends { id: string }>(items: T[]) {
  const byId = new Map<string, T>();
  items.forEach((item) => {
    byId.set(item.id, item);
  });
  return Array.from(byId.values());
}

function stableStringify(value: unknown) {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function formatTractionStatus(status?: V5Investment['status']) {
  if (status === 'funding_confirmed') {
    return 'Funding Confirmed';
  }

  if (status === 'completed') {
    return 'Deal Completed';
  }

  return status ?? 'Active';
}

function mapInvestmentToStartupCard(investment: V5Investment): StartupCard {
  const fundedAmount = investment.fundedAmount ?? investment.amount ?? 0;

  return {
    id: investment.startupId ?? investment.opportunityId ?? investment.id,
    startupName: investment.startupName ?? 'Portfolio Company',
    title: investment.startupName ?? 'Portfolio Company',
    tagline: 'Funded PromptFund portfolio company',
    shortDescription: 'Funded PromptFund portfolio company',
    description: 'Funded PromptFund portfolio company',
    fundingNeeded: fundedAmount,
    goalAmount: fundedAmount,
    equityOffered: investment.allocation,
    metric: 'Portfolio Company',
    founderName: investment.founderName ?? 'Founder',
    founderAvatar: initials(investment.founderName),
    founderVerified: true,
    rank: 'A',
    coverImage: investment.startupImage,
    stage: 'Portfolio Company',
    shortPitch: 'Funded PromptFund portfolio company',
  };
}

function initials(value?: string) {
  return value
    ?.split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'PF';
}

function parseList(value: string) {
  return value.split(',').map((item) => item.trim()).filter(Boolean);
}

function parseNumber(value: string) {
  if (!value.trim()) {
    return undefined;
  }

  const parsed = Number(value.replace(/[$,]/g, ''));
  return Number.isFinite(parsed) ? parsed : undefined;
}

function formatTime(value: string) {
  try {
    return new Date(value).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  } catch {
    return 'Now';
  }
}

const styles = StyleSheet.create({
  notice: {
    color: colors.text,
    lineHeight: 22,
  },
  companyCard: {
    gap: spacing.md,
  },
  headerRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between',
  },
  titleBlock: {
    flex: 1,
    gap: spacing.xs,
  },
  companyTitle: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '900',
  },
  meta: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 20,
  },
  cardWrap: {
    alignSelf: 'center',
    width: 190,
  },
  founderRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
  },
  founderAvatar: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: colors.luxuryGold,
  },
  founderAvatarText: {
    color: colors.black,
    fontSize: 18,
    fontWeight: '900',
  },
  founderName: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '900',
  },
  detailGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '900',
  },
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  composer: {
    gap: spacing.md,
  },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: 'rgba(216, 201, 163, 0.22)',
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    color: colors.text,
    backgroundColor: colors.black,
  },
  textArea: {
    minHeight: 110,
    paddingTop: spacing.md,
    textAlignVertical: 'top',
  },
  flexInput: {
    flex: 1,
  },
  kindRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  kindChip: {
    borderWidth: 1,
    borderColor: 'rgba(216, 201, 163, 0.22)',
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.black,
  },
  kindChipActive: {
    borderColor: colors.luxuryGold,
    backgroundColor: 'rgba(200, 162, 74, 0.14)',
  },
  kindText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'capitalize',
  },
  updates: {
    gap: spacing.md,
  },
  updateCard: {
    gap: spacing.md,
  },
  updateKind: {
    color: colors.luxuryGold,
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  updateBody: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 24,
  },
  mediaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  updateImage: {
    width: '47%',
    height: 120,
    borderRadius: radii.md,
    backgroundColor: colors.panelMuted,
  },
  linkList: {
    gap: spacing.xs,
  },
  linkText: {
    color: colors.luxuryGold,
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 20,
  },
  comment: {
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: 'rgba(216, 201, 163, 0.18)',
    borderRadius: radii.md,
    padding: spacing.md,
    backgroundColor: colors.black,
  },
  reply: {
    marginLeft: spacing.md,
    borderColor: 'rgba(200, 162, 74, 0.28)',
  },
  commentAuthor: {
    color: colors.text,
    fontWeight: '900',
  },
  commentBody: {
    color: colors.muted,
    lineHeight: 22,
  },
});
