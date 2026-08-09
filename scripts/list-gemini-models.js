#!/usr/bin/env node
import dotenv from 'dotenv';
import fs from 'fs';

try {
  const envLocal = '.env.local';
  if (fs.existsSync(envLocal)) dotenv.config({ path: envLocal });
  else dotenv.config();
} catch (e) {}

const KEY = (process.env.GEMINI_API_KEY || '').trim();
if (!KEY) {
  console.error('GEMINI_API_KEY not found in environment. Set it in .env.local or .env.');
  process.exit(2);
}

const endpoints = [
  `https://generativelanguage.googleapis.com/v1/models?key=${KEY}`,
  `https://generativelanguage.googleapis.com/v1beta/models?key=${KEY}`,
];

async function list() {
  for (const url of endpoints) {
    try {
      console.log('\nTrying', url);
      const res = await fetch(url, { method: 'GET' });
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

list().catch((e) => { console.error('Error listing Gemini models:', e); process.exit(1); });
