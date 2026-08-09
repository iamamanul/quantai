#!/usr/bin/env node
import dotenv from 'dotenv';
import fs from 'fs';

// Load .env and .env.local if present
try {
  const envLocal = '.env.local';
  if (fs.existsSync(envLocal)) dotenv.config({ path: envLocal });
  else dotenv.config();
} catch (e) {}

const GROQ_KEY = (process.env.GROQ_API_KEY || '').trim();
if (!GROQ_KEY) {
  console.error('GROQ_API_KEY not found in environment. Set it in .env.local or .env.');
  process.exit(2);
}

const endpoints = [
  'https://api.groq.com/openai/v1/models',
  'https://api.groq.com/v1/models',
  'https://api.groq.com/openai/v1/models?limit=100',
];

async function listModels() {
  for (const url of endpoints) {
    try {
      console.log('\nTrying endpoint:', url);
      const res = await fetch(url, { headers: { Authorization: `Bearer ${GROQ_KEY}` } });
      const text = await res.text();
      try {
        const json = JSON.parse(text);
        console.log(JSON.stringify(json, null, 2));
      } catch (e) {
        console.log('Raw response:\n', text);
      }
    } catch (err) {
      console.error('Request failed for', url, err && err.message ? err.message : err);
    }
  }
}

listModels().catch((e) => { console.error('Failed to list models:', e); process.exit(1); });
