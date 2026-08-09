#!/usr/bin/env node
import dotenv from 'dotenv';
import fs from 'fs';
import { GoogleGenerativeAI } from '@google/generative-ai';

try {
  const envLocal = '.env.local';
  if (fs.existsSync(envLocal)) dotenv.config({ path: envLocal });
  else dotenv.config();
} catch (e) {}

const key = (process.env.GEMINI_API_KEY || '').trim();
const modelName = (process.env.GEMINI_MODEL || 'gemini-1.5').trim();

if (!key) {
  console.error('GEMINI_API_KEY not found in environment. Set it in .env.local or .env.');
  process.exit(2);
}

async function test() {
  try {
    const client = new GoogleGenerativeAI(key);
    console.log('Attempting to init model:', modelName);
    const model = client.getGenerativeModel({ model: modelName });
    try {
      const result = await model.generateContent('Say hello in one word.');
      const text = await result.response.text();
      console.log('SUCCESS: Gemini responded:', text.trim());
      process.exit(0);
    } catch (genErr) {
      console.error('Gemini generateContent failed:', genErr && genErr.message ? genErr.message : genErr);
      if (genErr?.response) {
        try { const b = await genErr.response.text(); console.error('Response body:', b); } catch {}
      }
      process.exit(1);
    }
  } catch (err) {
    console.error('Failed to initialize Gemini model:', err && err.message ? err.message : err);
    process.exit(1);
  }
}

test();
