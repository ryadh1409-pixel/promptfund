#!/usr/bin/env node
/**
 * Completes the Crazy deal in Firestore to match the York working pattern.
 * Run only for verification: node scripts/complete-crazy-deal.cjs
 */
const { readFileSync } = require('node:fs');
const { homedir } = require('node:os');
const { join } = require('node:path');

const projectId = 'promptfund';
const agreementId = 'agreement-room-KaH13gMqVkJoLKflB4iY-Bwdxx8MifDcIfAQmBLZaKYkxF1L2';
const opportunityId = 'KaH13gMqVkJoLKflB4iY';
const discussionRoomId = 'room-KaH13gMqVkJoLKflB4iY-Bwdxx8MifDcIfAQmBLZaKYkxF1L2';

function getAccessToken() {
  return JSON.parse(readFileSync(join(homedir(), '.config/configstore/firebase-tools.json'), 'utf8')).tokens?.access_token;
}

function encodeValue(value) {
  if (value === null || value === undefined) return { nullValue: null };
  if (typeof value === 'string') return { stringValue: value };
  if (typeof value === 'number') return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  if (typeof value === 'boolean') return { booleanValue: value };
  throw new Error(`Unsupported type ${typeof value}`);
}

async function patchDocument(collection, documentId, payload) {
  const token = getAccessToken();
  const fields = Object.fromEntries(
    Object.entries(payload)
      .filter(([, value]) => value !== undefined)
      .map(([key, value]) => [key, encodeValue(value)]),
  );
  const updateMask = Object.keys(fields).map((field) => `updateMask.fieldPaths=${field}`).join('&');
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${collection}/${encodeURIComponent(documentId)}?${updateMask}`;
  const response = await fetch(url, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields }),
  });
  if (!response.ok) {
    throw new Error(`${collection}/${documentId}: ${response.status} ${await response.text()}`);
  }
  return payload;
}

async function main() {
  const completedAt = new Date().toISOString();
  const fundingArrangedAt = completedAt;

  const agreement = await patchDocument('agreements', agreementId, {
    status: 'completed',
    founderAccepted: true,
    investorAccepted: true,
    fundingArrangedAt,
    completedAt,
  });

  const investment = await patchDocument('investments', agreementId, {
    agreementId,
    discussionRoomId,
    opportunityId,
    founderId: 'ubULVbyqFZYDGjGJZJnXxs2JtA63',
    founderName: 'ThamFounder',
    investorId: 'Bwdxx8MifDcIfAQmBLZaKYkxF1L2',
    investorName: 'Paul  graham bilioner',
    startupName: 'Crazy',
    amount: 22,
    allocation: 1,
    status: 'completed',
    fundedAt: completedAt,
    createdAt: fundingArrangedAt,
  });

  const opportunity = await patchDocument('startupOpportunities', opportunityId, {
    status: 'completed',
  });

  const room = await patchDocument('discussionRooms', discussionRoomId, {
    status: 'completed',
  });

  console.log('Crazy deal completed');
  console.log('agreement', JSON.stringify(agreement, null, 2));
  console.log('investment', JSON.stringify(investment, null, 2));
  console.log('opportunity', JSON.stringify(opportunity, null, 2));
  console.log('discussionRoom', JSON.stringify(room, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
