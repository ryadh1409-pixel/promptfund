#!/usr/bin/env node
const { initializeApp, applicationDefault, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { readFileSync, existsSync } = require('node:fs');
const { resolve } = require('node:path');

const projectId = 'promptfund';

function initAdmin() {
  const serviceAccountPath = resolve(__dirname, '../serviceAccount.json');
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
    .filter((item) => JSON.stringify(item).toLowerCase().includes(name.toLowerCase()));
}

function serialize(value) {
  if (value && typeof value.toDate === 'function') {
    return value.toDate().toISOString();
  }
  if (Array.isArray(value)) {
    return value.map(serialize);
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, serialize(entry)]));
  }
  return value;
}

function normalizeDoc(doc) {
  return serialize(doc);
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
      console.log(JSON.stringify(matches.map(normalizeDoc), null, 2));
    } catch (error) {
      console.log(`\n--- ${collection} ERROR ---`, error.message);
    }
  }

  console.log('\n=== ALL investments (full JSON) ===\n');
  const investments = (await listCollection('investments')).map(normalizeDoc);
  console.log(JSON.stringify(investments, null, 2));

  const compareKeys = [
    'status', 'founderId', 'investorId', 'startupId', 'opportunityId',
    'createdAt', 'completedAt', 'fundedAt', 'fundingConfirmedAt',
    'isPortfolio', 'isTraction', 'visibility', 'deleted', 'archived',
    'agreementId', 'discussionRoomId', 'startupName', 'projectId',
  ];

  const crazyInInvestments = investments.filter((item) => JSON.stringify(item).toLowerCase().includes(searchName.toLowerCase()));
  const working = investments.filter((item) => item.isTraction || item.isPortfolio || ['completed', 'funding_confirmed', 'active'].includes(item.status));

  console.log('\n=== SUMMARY ===');
  console.log('Total investments:', investments.length);
  console.log('Working-like investments:', working.length);
  console.log('Crazy in investments:', crazyInInvestments.length);

  if (crazyInInvestments.length === 0) {
    console.log('\nCrazy NOT in investments collection. Full agreement search:\n');
    const agreements = (await findByStartupName('agreements', searchName)).map(normalizeDoc);
    console.log(JSON.stringify(agreements, null, 2));
  }

  const oldWorking = working.find((item) => !JSON.stringify(item).toLowerCase().includes(searchName.toLowerCase()));
  const crazyDoc = crazyInInvestments[0];

  if (oldWorking) {
    console.log('\n=== OLD WORKING INVESTMENT (full JSON) ===\n');
    console.log(JSON.stringify(oldWorking, null, 2));
    console.log('Document path: investments/' + oldWorking.id);
  }

  if (crazyDoc) {
    console.log('\n=== CRAZY INVESTMENT (full JSON) ===\n');
    console.log(JSON.stringify(crazyDoc, null, 2));
    console.log('Document path: investments/' + crazyDoc.id);
  }

  if (oldWorking && crazyDoc) {
    console.log('\n=== FIELD-BY-FIELD DIFF ===\n');
    const allKeys = [...new Set([...Object.keys(oldWorking), ...Object.keys(crazyDoc)])].sort();
    for (const key of allKeys) {
      const a = oldWorking[key];
      const b = crazyDoc[key];
      const same = JSON.stringify(a) === JSON.stringify(b);
      if (!same || compareKeys.includes(key)) {
        console.log(`${key}: working=${JSON.stringify(a)} | crazy=${JSON.stringify(b)} | ${same ? 'SAME' : 'DIFF'}`);
      }
    }
  } else if (oldWorking && !crazyDoc) {
    console.log('\n=== WORKING TEMPLATE KEYS (Crazy investment missing) ===\n');
    console.log(JSON.stringify(oldWorking, null, 2));
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
