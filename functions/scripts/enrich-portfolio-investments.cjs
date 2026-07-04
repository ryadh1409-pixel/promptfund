#!/usr/bin/env node
const { readFileSync } = require('node:fs');
const { homedir } = require('node:os');
const { join } = require('node:path');

const projectId = 'promptfund';

function getAccessToken() {
  return JSON.parse(readFileSync(join(homedir(), '.config/configstore/firebase-tools.json'), 'utf8')).tokens?.access_token;
}

function decode(value) {
  if (!value) return null;
  if ('stringValue' in value) return value.stringValue;
  if ('integerValue' in value) return Number(value.integerValue);
  if ('doubleValue' in value) return Number(value.doubleValue);
  if ('booleanValue' in value) return value.booleanValue;
  if ('timestampValue' in value) return value.timestampValue;
  if ('nullValue' in value) return null;
  if ('mapValue' in value) {
    const out = {};
    for (const [key, entry] of Object.entries(value.mapValue.fields ?? {})) {
      out[key] = decode(entry);
    }
    return out;
  }
  if ('arrayValue' in value) return (value.arrayValue.values ?? []).map(decode);
  return value;
}

function decodeDocument(doc) {
  if (!doc?.name) return null;
  const data = { id: doc.name.split('/').pop() };
  for (const [key, value] of Object.entries(doc.fields ?? {})) {
    data[key] = decode(value);
  }
  return data;
}

function encodeValue(value) {
  if (value === null || value === undefined) return { nullValue: null };
  if (typeof value === 'string') return { stringValue: value };
  if (typeof value === 'number') return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  if (typeof value === 'boolean') return { booleanValue: value };
  throw new Error(`Unsupported type ${typeof value}`);
}

async function listCollection(collection) {
  const token = getAccessToken();
  const response = await fetch(
    `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${collection}?pageSize=300`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  const payload = await response.json();
  return (payload.documents ?? []).map(decodeDocument).filter(Boolean);
}

function buildPortfolioPayload(investment, agreement, opportunity) {
  const status = investment.status === 'completed' ? 'completed' : (investment.status ?? 'funding_confirmed');
  const fundedAmount = investment.fundedAmount ?? investment.amount ?? agreement?.investmentAmount ?? 0;
  const completedAt = status === 'completed'
    ? (investment.completedAt ?? investment.fundedAt ?? agreement?.completedAt ?? new Date().toISOString())
    : undefined;

  return {
    agreementId: investment.agreementId ?? agreement?.id ?? investment.id,
    discussionRoomId: investment.discussionRoomId ?? agreement?.discussionRoomId,
    opportunityId: investment.opportunityId ?? agreement?.opportunityId,
    startupId: investment.startupId ?? investment.opportunityId ?? agreement?.opportunityId,
    startupImage: investment.startupImage ?? opportunity?.imageUrl ?? '',
    founderId: investment.founderId ?? agreement?.founderId,
    founderName: investment.founderName ?? agreement?.founderName,
    investorId: investment.investorId ?? agreement?.investorId,
    investorName: investment.investorName ?? agreement?.investorName,
    startupName: investment.startupName ?? agreement?.startupName,
    amount: fundedAmount,
    fundedAmount,
    allocation: investment.allocation ?? agreement?.investorAllocation ?? 1,
    status,
    isPortfolio: true,
    isTraction: true,
    fundedAt: investment.fundedAt ?? completedAt ?? agreement?.fundingArrangedAt,
    completedAt,
    createdAt: investment.createdAt ?? agreement?.fundingArrangedAt ?? agreement?.createdAt,
  };
}

async function replaceInvestment(documentId, payload) {
  const token = getAccessToken();
  const fields = Object.fromEntries(
    Object.entries(payload)
      .filter(([, value]) => value !== undefined)
      .map(([key, value]) => [key, encodeValue(value)]),
  );
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/investments/${encodeURIComponent(documentId)}`;
  const response = await fetch(url, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields }),
  });
  if (!response.ok) {
    throw new Error(`${documentId}: ${response.status} ${await response.text()}`);
  }
}

async function main() {
  const [investments, agreements, opportunities] = await Promise.all([
    listCollection('investments'),
    listCollection('agreements'),
    listCollection('startupOpportunities'),
  ]);
  const agreementById = new Map(agreements.map((agreement) => [agreement.id, agreement]));
  const opportunityById = new Map(opportunities.map((opportunity) => [opportunity.id, opportunity]));

  const portfolioInvestments = investments.filter(
    (investment) => investment.agreementId || String(investment.id).startsWith('agreement-room-'),
  );

  for (const investment of portfolioInvestments) {
    const agreement = agreementById.get(investment.agreementId ?? investment.id);
    const opportunity = opportunityById.get(investment.opportunityId ?? agreement?.opportunityId);
    const payload = buildPortfolioPayload(investment, agreement, opportunity);
    await replaceInvestment(investment.id, payload);
    console.log('enriched', investment.startupName ?? investment.id, JSON.stringify(payload));
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
