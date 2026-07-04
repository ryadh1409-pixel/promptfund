#!/usr/bin/env node
const { readFileSync } = require('node:fs');
const { homedir } = require('node:os');
const { join } = require('node:path');

const projectId = 'promptfund';

function getAccessToken() {
  const configPath = join(homedir(), '.config/configstore/firebase-tools.json');
  return JSON.parse(readFileSync(configPath, 'utf8')).tokens?.access_token;
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
  if (typeof value === 'number') {
    return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  }
  if (typeof value === 'boolean') return { booleanValue: value };
  throw new Error(`Unsupported value type: ${typeof value}`);
}

function buildInvestmentFromAgreement(agreement) {
  const status = agreement.status === 'completed' ? 'completed' : 'funding_confirmed';
  const fundedAt = agreement.completedAt ?? agreement.fundingArrangedAt ?? new Date().toISOString();
  const createdAt = agreement.fundingArrangedAt ?? agreement.createdAt ?? fundedAt;

  return {
    agreementId: agreement.id,
    discussionRoomId: agreement.discussionRoomId,
    opportunityId: agreement.opportunityId,
    founderId: agreement.founderId,
    founderName: agreement.founderName,
    investorId: agreement.investorId,
    investorName: agreement.investorName,
    startupName: agreement.startupName,
    amount: agreement.investmentAmount,
    allocation: agreement.investorAllocation,
    status,
    fundedAt,
    createdAt,
  };
}

async function listCollection(collection) {
  const token = getAccessToken();
  const response = await fetch(
    `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${collection}?pageSize=300`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!response.ok) {
    throw new Error(`${collection}: ${response.status} ${await response.text()}`);
  }
  const payload = await response.json();
  return (payload.documents ?? []).map(decodeDocument).filter(Boolean);
}

async function upsertInvestment(agreement) {
  const token = getAccessToken();
  const payload = buildInvestmentFromAgreement(agreement);
  const fields = Object.fromEntries(
    Object.entries(payload)
      .filter(([, value]) => value !== undefined)
      .map(([key, value]) => [key, encodeValue(value)]),
  );
  const fieldPaths = Object.keys(fields);
  const updateMask = fieldPaths.map((field) => `updateMask.fieldPaths=${field}`).join('&');
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/investments/${encodeURIComponent(agreement.id)}?${updateMask}`;

  const response = await fetch(url, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ fields }),
  });

  if (!response.ok) {
    throw new Error(`upsert ${agreement.id}: ${response.status} ${await response.text()}`);
  }

  return payload;
}

async function main() {
  const agreements = await listCollection('agreements');
  const investments = await listCollection('investments');
  const investmentIds = new Set(investments.map((investment) => investment.id));

  const missing = agreements.filter(
    (agreement) =>
      (agreement.status === 'funding_arranged' || agreement.status === 'completed')
      && !investmentIds.has(agreement.id),
  );

  console.log(`Found ${missing.length} traction agreements missing investments`);
  for (const agreement of missing) {
    const payload = await upsertInvestment(agreement);
    console.log('backfilled', agreement.startupName, '->', `investments/${agreement.id}`, JSON.stringify(payload));
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
