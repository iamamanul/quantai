import dotenv from 'dotenv';
import fs from 'fs';

try {
  const envLocal = '.env.local';
  if (fs.existsSync(envLocal)) dotenv.config({ path: envLocal });
  else dotenv.config();
} catch (e) {}

export async function GET() {
  const geminiKey = (process.env.GEMINI_API_KEY || '').trim();
  const groqKey = (process.env.GROQ_API_KEY || '').trim();

  const out = { gemini: null, groq: null, errors: {} };

  // Gemini list
  if (geminiKey) {
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1/models?key=${geminiKey}`);
      const json = await res.json();
      out.gemini = json;
    } catch (err) {
      out.errors.gemini = String(err?.message || err);
    }
  } else {
    out.errors.gemini = 'GEMINI_API_KEY not set';
  }

  // Groq list
  if (groqKey) {
    try {
      const res = await fetch('https://api.groq.com/openai/v1/models', {
        headers: { Authorization: `Bearer ${groqKey}` },
      });
      const json = await res.json();
      out.groq = json;
    } catch (err) {
      out.errors.groq = String(err?.message || err);
    }
  } else {
    out.errors.groq = 'GROQ_API_KEY not set';
  }

  return new Response(JSON.stringify(out, null, 2), {
    headers: { 'Content-Type': 'application/json' },
  });
}
