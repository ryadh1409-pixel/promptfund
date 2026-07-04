#!/usr/bin/env node
import { initializeApp, applicationDefault, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const projectId = 'promptfund';

function initAdmin() {
  const serviceAccountPath = resolve(process.cwd(), 'serviceAccount.json');
  if (existsSync(serviceAccountPath)) {
    initializeApp({ credential: cert(JSON.parse(readFileSync(serviceAccountPath, 'utf8'))), projectId });
    return;
  }

  try {
    initializeApp({ credential: applicationDefault(), projectId });
  } catch {
    initializeApp({ projectId });
  }
}

initAdmin();
const db = getFirestore();

async function listCollection(name, limit = 200) {
  const snap = await db.collection(name).limit(limit).get();
  return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

async function findByStartupName(collection, name) {
  const snap = await db.collection(collection).get();
  return snap.docs
    .map((doc) => ({ id: doc.id, ...doc.data() }))
    .filter((item) => {
      const haystack = JSON.stringify(item).toLowerCase();
      return haystack.includes(name.toLowerCase());
    });
}

async function main() {
  const searchName = process.argv[2] ?? 'Crazy';

  console.log('=== Searching Firestore for:', searchName, '===\n');

  const collections = [
    'investments',
    'startupOpportunities',
    'agreements',
    'agreementRooms',
    'discussionRooms',
    'traction',
  ];

  for (const collection of collections) {
    try {
      const matches = await findByStartupName(collection, searchName);
      console.log(`\n--- ${collection} (${matches.length} matches) ---`);
      console.log(JSON.stringify(matches, null, 2));
    } catch (error) {
      console.log(`\n--- ${collection} ERROR ---`, error.message);
    }
  }

  console.log('\n=== ALL investments (full JSON) ===\n');
  const investments = await listCollection('investments');
  console.log(JSON.stringify(investments, null, 2));

  console.log('\n=== Investment field comparison ===\n');
  const working = investments.filter((item) => item.isTraction || item.isPortfolio || item.status === 'completed' || item.status === 'funding_confirmed');
  const crazy = investments.filter((item) => JSON.stringify(item).toLowerCase().includes(searchName.toLowerCase()));

  console.log('Working-like investments:', working.length);
  console.log('Crazy investments:', crazy.length);

  if (working.length > 0 && crazy.length === 0) {
    console.log('\nCrazy NOT in investments. Checking agreements...\n');
    const agreements = await findByStartupName('agreements', searchName);
    console.log(JSON.stringify(agreements, null, 2));
  }

  const compareKeys = [
    'status', 'founderId', 'investorId', 'startupId', 'opportunityId',
    'createdAt', 'completedAt', 'fundedAt', 'fundingConfirmedAt',
    'isPortfolio', 'isTraction', 'visibility', 'deleted', 'archived',
    'agreementId', 'discussionRoomId', 'startupName', 'projectId',
  ];

  if (working[0] && crazy[0]) {
    console.log('\n=== FIELD-BY-FIELD DIFF (working[0] vs crazy[0]) ===\n');
    for (const key of compareKeys) {
      const a = working[0][key];
      const b = crazy[0][key];
      const same = JSON.stringify(a) === JSON.stringify(b);
      console.log(`${key}: working=${JSON.stringify(a)} | crazy=${JSON.stringify(b)} | ${same ? 'SAME' : 'DIFF'}`);
    }
    console.log('\nWorking doc id:', working[0].id);
    console.log('Crazy doc id:', crazy[0].id);
  } else if (working[0]) {
    console.log('\n=== WORKING INVESTMENT TEMPLATE (first match) ===\n');
    console.log(JSON.stringify(working[0], null, 2));
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
