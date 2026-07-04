#!/usr/bin/env node
const { readFileSync } = require('node:fs');
const { homedir } = require('node:os');
const { join } = require('node:path');

const projectId = 'promptfund';
const searchName = process.argv[2] ?? 'Crazy';

function getAccessToken() {
  const configPath = join(homedir(), '.config/configstore/firebase-tools.json');
  const config = JSON.parse(readFileSync(configPath, 'utf8'));
  return config.tokens?.access_token;
}

function decodeValue(value) {
  if (!value) return null;
  if ('stringValue' in value) return value.stringValue;
  if ('integerValue' in value) return Number(value.integerValue);
  if ('doubleValue' in value) return Number(value.doubleValue);
  if ('booleanValue' in value) return value.booleanValue;
  if ('timestampValue' in value) return value.timestampValue;
  if ('nullValue' in value) return null;
  if ('mapValue' in value) {
    const out = {};
    const fields = value.mapValue.fields ?? {};
    for (const [key, entry] of Object.entries(fields)) {
      out[key] = decodeValue(entry);
    }
    return out;
  }
  if ('arrayValue' in value) {
    return (value.arrayValue.values ?? []).map(decodeValue);
  }
  return value;
}

function decodeDocument(doc) {
  const data = { id: doc.name.split('/').pop() };
  const fields = doc.fields ?? {};
  for (const [key, value] of Object.entries(fields)) {
    data[key] = decodeValue(value);
  }
  return data;
}

async function listCollection(collection) {
  const token = getAccessToken();
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${collection}?pageSize=300`;
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    throw new Error(`${collection}: ${response.status} ${await response.text()}`);
  }
  const payload = await response.json();
  return (payload.documents ?? []).map(decodeDocument);
}

async function main() {
  const collections = [
    'investments',
    'startupOpportunities',
    'agreements',
    'agreementRooms',
    'discussionRooms',
    'traction',
  ];

  const allData = {};

  for (const collection of collections) {
    try {
      allData[collection] = await listCollection(collection);
      const matches = allData[collection].filter((item) =>
        JSON.stringify(item).toLowerCase().includes(searchName.toLowerCase()),
      );
      console.log(`\n--- ${collection} (${matches.length} matches for "${searchName}") ---`);
      console.log(JSON.stringify(matches, null, 2));
    } catch (error) {
      console.log(`\n--- ${collection} ERROR ---`, error.message);
    }
  }

  const investments = allData.investments ?? [];
  console.log('\n=== ALL investments ===');
  console.log(JSON.stringify(investments, null, 2));

  const crazyInvestments = investments.filter((item) =>
    JSON.stringify(item).toLowerCase().includes(searchName.toLowerCase()),
  );
  const workingInvestments = investments.filter((item) =>
    !JSON.stringify(item).toLowerCase().includes(searchName.toLowerCase()),
  );

  const oldWorking = workingInvestments[0];
  const crazyDoc = crazyInvestments[0];

  if (oldWorking) {
    console.log('\n=== OLD WORKING INVESTMENT ===');
    console.log('Path: investments/' + oldWorking.id);
    console.log(JSON.stringify(oldWorking, null, 2));
  }

  if (!crazyDoc) {
    console.log('\n=== CRAZY NOT IN investments ===');
    const crazyAgreements = (allData.agreements ?? []).filter((item) =>
      JSON.stringify(item).toLowerCase().includes(searchName.toLowerCase()),
    );
    const crazyOpportunities = (allData.startupOpportunities ?? []).filter((item) =>
      JSON.stringify(item).toLowerCase().includes(searchName.toLowerCase()),
    );
    const crazyRooms = (allData.discussionRooms ?? []).filter((item) =>
      JSON.stringify(item).toLowerCase().includes(searchName.toLowerCase()),
    );
    console.log('\nCrazy agreements:');
    console.log(JSON.stringify(crazyAgreements, null, 2));
    console.log('\nCrazy startupOpportunities:');
    console.log(JSON.stringify(crazyOpportunities, null, 2));
    console.log('\nCrazy discussionRooms:');
    console.log(JSON.stringify(crazyRooms, null, 2));
    if (crazyAgreements[0] && oldWorking) {
      console.log('\n=== EXPECTED investment path vs actual ===');
      console.log('Expected: investments/' + crazyAgreements[0].id);
      console.log('Old working path: investments/' + oldWorking.id);
    }
  } else {
    console.log('\n=== CRAZY INVESTMENT ===');
    console.log('Path: investments/' + crazyDoc.id);
    console.log(JSON.stringify(crazyDoc, null, 2));
  }

  if (oldWorking && crazyDoc) {
    const keys = [...new Set([...Object.keys(oldWorking), ...Object.keys(crazyDoc)])].sort();
    console.log('\n=== FIELD DIFF ===');
    for (const key of keys) {
      const a = oldWorking[key];
      const b = crazyDoc[key];
      const same = JSON.stringify(a) === JSON.stringify(b);
      console.log(`${key}: working=${JSON.stringify(a)} crazy=${JSON.stringify(b)} ${same ? 'SAME' : 'DIFF'}`);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
