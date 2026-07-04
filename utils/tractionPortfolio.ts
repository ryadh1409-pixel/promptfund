import type { V5Investment } from '@/types/InvestmentFlow';

export const tractionPortfolioStatuses = ['funding_confirmed', 'active', 'completed'] as const;

export type TractionPortfolioStatus = (typeof tractionPortfolioStatuses)[number];

export function isTractionPortfolioInvestment(
  investment: Pick<V5Investment, 'status' | 'isTraction' | 'isPortfolio'>,
) {
  if (investment.status === 'archived') {
    return false;
  }

  if (investment.isTraction === true || investment.isPortfolio === true) {
    return true;
  }

  const status = investment.status ?? 'active';
  return (tractionPortfolioStatuses as readonly string[]).includes(status);
}

export function dedupeInvestmentsById(investments: V5Investment[]) {
  const byId = new Map<string, V5Investment>();
  investments.forEach((investment) => {
    byId.set(investment.id, investment);
  });
  return Array.from(byId.values());
}

export function logTractionQuerySnapshot({
  collection: collectionName,
  filters,
  rawDocumentCount,
  documents,
  excludedDocuments = [],
}: {
  collection: string;
  filters: Record<string, unknown>;
  rawDocumentCount: number;
  documents: Array<{
    id: string;
    status?: string | null;
    founderId?: string | null;
    investorId?: string | null;
    opportunityId?: string | null;
    startupId?: string | null;
    isTraction?: boolean | null;
    isPortfolio?: boolean | null;
  }>;
  excludedDocuments?: Array<{
    id: string;
    status?: string | null;
    founderId?: string | null;
    investorId?: string | null;
    reason: string;
  }>;
}) {
  console.info('[PromptFund Traction] query snapshot', {
    collection: collectionName,
    queryFilters: filters,
    rawDocumentCount,
    tractionDocumentCount: documents.length,
    excludedDocumentCount: excludedDocuments.length,
    documents: documents.map((document) => ({
      documentId: document.id,
      status: document.status ?? 'active',
      founderId: document.founderId ?? null,
      investorId: document.investorId ?? null,
      opportunityId: document.opportunityId ?? null,
      startupId: document.startupId ?? null,
      isTraction: document.isTraction ?? null,
      isPortfolio: document.isPortfolio ?? null,
    })),
    excludedDocuments,
  });
}

export function logTractionInvestmentWrite({
  documentId,
  status,
  founderId,
  investorId,
  payload,
}: {
  documentId: string;
  status: string;
  founderId?: string;
  investorId?: string;
  payload: Record<string, unknown>;
}) {
  console.info('[PromptFund Traction] investment written', {
    collection: 'investments',
    documentId,
    status,
    founderId: founderId ?? null,
    investorId: investorId ?? null,
    opportunityId: payload.opportunityId ?? null,
    startupId: payload.startupId ?? null,
    startupImage: payload.startupImage ?? null,
    fundedAmount: payload.fundedAmount ?? null,
    isTraction: payload.isTraction ?? null,
    isPortfolio: payload.isPortfolio ?? null,
    fundingConfirmedAt: payload.fundingConfirmedAt ?? null,
    completedAt: payload.completedAt ?? null,
    documentWritten: payload,
  });
}

export function logTractionFlowStep({
  step,
  collection: collectionName,
  documentId,
  data,
}: {
  step: string;
  collection: string;
  documentId: string;
  data: Record<string, unknown>;
}) {
  console.info('[PromptFund Traction] flow audit', {
    step,
    collection: collectionName,
    documentId,
    status: data.status ?? null,
    founderId: data.founderId ?? null,
    investorId: data.investorId ?? null,
    startupId: data.startupId ?? data.opportunityId ?? null,
    opportunityId: data.opportunityId ?? null,
    isTraction: data.isTraction ?? null,
    isPortfolio: data.isPortfolio ?? null,
    fundingConfirmedAt: data.fundingConfirmedAt ?? data.fundingArrangedAt ?? null,
    completedAt: data.completedAt ?? null,
    documentData: data,
  });
}

export function describeTractionExclusion(
  investment: Pick<V5Investment, 'id' | 'status' | 'isTraction' | 'isPortfolio'>,
) {
  if (investment.status === 'archived') {
    return 'archived';
  }

  if (isTractionPortfolioInvestment(investment)) {
    return null;
  }

  return `status=${investment.status ?? 'missing'}`;
}
