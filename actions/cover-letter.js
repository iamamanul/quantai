"use server";

import dotenv from "dotenv";
// Load .env.local first (dev overrides), then fallback to .env
dotenv.config({ path: ".env.local" });
dotenv.config();
import { db } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { revalidatePath } from "next/cache";

function getGeminiModel() {
  try {
    const key = (process.env.GEMINI_API_KEY || "").trim();
    if (!key) return null;
    const genAI = new GoogleGenerativeAI(key);
    return genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL || "gemini-1.5-flash" });
  } catch (error) {
    console.error("[cover-letter] getGeminiModel failed:", error);
    return null;
  }
}

async function fetchGroqCoverLetter(prompt) {
  const groqKey = (process.env.GROQ_API_KEY || "").trim();
  if (!groqKey) {
    try { console.error("[cover-letter] GROQ_API_KEY missing at runtime"); } catch {}
    throw new Error("GROQ_API_KEY is not set in the environment.");
  }
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${groqKey}`,
    },
    body: JSON.stringify({
      model: "llama3-70b-8192",
      messages: [
        { role: "system", content: "You are a helpful assistant." },
        { role: "user", content: prompt },
      ],
      max_tokens: 1024,
      temperature: 0.7,
    }),
  });
  if (!response.ok) {
    const status = response.status;
    const errText = await response.text();
    throw new Error(`Groq API failed (status ${status}): ${errText}`);
  }
  const data = await response.json();
  let text = data.choices?.[0]?.message?.content || "";
  text = text.replace(/```(?:markdown)?\n?/g, "").trim();
  return text;
}

export async function improveJobDescription(jobDescription) {
  const prompt = `
    Improve the following job description to make it more clear, professional, and comprehensive for AI cover letter generation.
    
    Original Job Description:
    ${jobDescription}
    
    Please enhance it by:
    1. Clarifying vague requirements
    2. Adding missing details about responsibilities
    3. Making it more structured and readable
    4. Highlighting key skills and qualifications
    5. Adding context about the role and company expectations
    
    Return ONLY the improved job description without any additional text or explanations.
  `;

  try {
    const model = getGeminiModel();
    if (!model) {
      console.warn("[cover-letter] Gemini unavailable; using Groq fallback for JD improvement");
      return await fetchGroqCoverLetter(prompt);
    }
    console.log("[cover-letter] using Gemini to improve JD");
    const result = await model.generateContent(prompt);
    return result.response.text().trim();
  } catch (error) {
    console.error("[cover-letter] Error improving job description:", error);
    throw new Error("Failed to improve job description");
  }
}

export async function generateCoverLetter(data) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
  });

  if (!user) throw new Error("User not found");

  const prompt = `
    Write a professional cover letter for a ${data.jobTitle} position at ${data.companyName}.

    Personal Information:
    - Name: ${data.fullName}
    - Email: ${data.email}
    - Phone: ${data.phone}
    - Address: ${data.address}

    Job Description:
    ${data.jobDescription}

    Requirements:
    1. Use a professional, enthusiastic tone.
    2. Base the content ONLY on the provided Job Description and general transferable qualities; do NOT reference any unrelated prior roles, technologies, or the user's profile/skills/bio unless explicitly present in the Job Description.
    3. Show understanding of the company's needs as stated in the Job Description.
    4. Keep it concise (max 400 words).
    5. Use proper business letter formatting in markdown.
    6. Avoid inventing or inferring experience not stated in the Job Description.
    7. Do not mention software/tech stacks or unrelated domains unless they appear in the Job Description.
    8. Make it ATS-friendly with clear structure.
    9. Include the candidate's personal information in the header.

    Format the letter in professional markdown with proper spacing and structure.
    Start with the candidate's contact information at the top, followed by the date, company address, and then the letter content.
  `;

  try {
    let content;
    // Preflight: if neither key is set, fail fast with clear server log
    const hasGemini = !!(process.env.GEMINI_API_KEY || "").trim();
    const hasGroq = !!(process.env.GROQ_API_KEY || "").trim();
    if (!hasGemini && !hasGroq) {
      // Diagnostics without leaking secrets
      const gk = process.env.GEMINI_API_KEY;
      const rk = process.env.GROQ_API_KEY;
      console.error("[cover-letter] Both GEMINI_API_KEY and GROQ_API_KEY are missing. Cannot generate.", {
        hasGemini: !!gk,
        hasGroq: !!rk,
        geminiLen: gk ? String(gk).length : 0,
        groqLen: rk ? String(rk).length : 0,
        nodeEnv: process.env.NODE_ENV,
      });
      throw new Error("AI providers unavailable (missing API keys)");
    }
    try {
      const gemini = getGeminiModel();
      if (!gemini) {
        console.warn("[cover-letter] Gemini unavailable; using Groq fallback");
        content = await fetchGroqCoverLetter(prompt);
        console.log("[cover-letter] content generated by: Groq");
      } else {
        try {
          console.log("[cover-letter] using Gemini to generate");
          const result = await gemini.generateContent(prompt);
          content = result.response.text().trim();
          console.log("[cover-letter] content generated by: Gemini");
        } catch (err) {
          console.error("[cover-letter] Gemini error; using Groq fallback:", err);
          content = await fetchGroqCoverLetter(prompt);
          console.log("[cover-letter] content generated by: Groq (fallback)");
        }
      }
    } catch (innerErr) {
      console.error("[cover-letter] unexpected error during generation:", innerErr);
      content = await fetchGroqCoverLetter(prompt);
      console.log("[cover-letter] content generated by: Groq (fallback-after-error)");
    }

    // Validate content before saving
    if (!content || content.trim().length < 40) {
      console.error("[cover-letter] AI returned empty/too short content. Aborting save.", {
        hasGemini: !!(process.env.GEMINI_API_KEY || "").trim(),
        hasGroq: !!(process.env.GROQ_API_KEY || "").trim(),
      });
      throw new Error("AI provider returned empty content");
    }

    const coverLetter = await db.coverLetter.create({
      data: {
        content,
        jobDescription: data.jobDescription,
        companyName: data.companyName,
        jobTitle: data.jobTitle,
        status: "completed",
        userId: user.id,
      },
    });

    return coverLetter;
  } catch (error) {
    console.error("[cover-letter] Error generating cover letter (final):", error);
    throw new Error("Failed to generate cover letter");
  }
}

export async function updateCoverLetter(id, content) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
  });

  if (!user) throw new Error("User not found");

  const updated = await db.coverLetter.update({
    where: { id, userId: user.id },
    data: { content },
  });
  revalidatePath("/ai-cover-letter");
  return updated;
}

export async function getCoverLetters() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
  });

  if (!user) throw new Error("User not found");
  // Simple per-process TTL cache (15s) for hot reads
  const cache = (globalThis.__coverLettersCache = globalThis.__coverLettersCache || new Map());
  const cacheKey = `coverletters:${user.id}`;
  const now = Date.now();
  const cached = cache.get(cacheKey);
  if (cached && cached.expireAt > now) {
    return cached.data;
  }

  // Select only fields needed by UI list to reduce payload size and query cost
  const data = await db.coverLetter.findMany({
    where: {
      userId: user.id,
    },
    orderBy: {
      createdAt: "desc",
    },
    select: {
      id: true,
      jobTitle: true,
      companyName: true,
      status: true,
      createdAt: true,
      // Keep short preview field for card; avoid heavy content
      jobDescription: true,
    },
  });
  cache.set(cacheKey, { data, expireAt: now + 15_000 });
  return data;
}

export async function getCoverLetter(id) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
  });

  if (!user) throw new Error("User not found");

  return await db.coverLetter.findUnique({
    where: {
      id,
      userId: user.id,
    },
  });
}

export async function deleteCoverLetter(id) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
  });

  if (!user) throw new Error("User not found");

  // Hard delete per request to avoid schema drift
  return await db.coverLetter.delete({ where: { id } });
}