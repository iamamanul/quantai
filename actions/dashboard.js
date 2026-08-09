"use server";

import { db } from "@/lib/prisma";
import { auth, currentUser } from "@clerk/nextjs/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { jsonrepair } from "jsonrepair";

// Lazy init Gemini to avoid crashing when GEMINI_API_KEY is missing
// Read Gemini model from env and initialize lazily to avoid crashes when key/model missing
const GEMINI_MODEL = (process.env.GEMINI_MODEL || "gemini-1.5-flash").trim();
function getGeminiModel() {
  try {
    const key = process.env.GEMINI_API_KEY;
    if (!key) return null;
    const genAI = new GoogleGenerativeAI(key);
    return genAI.getGenerativeModel({ model: GEMINI_MODEL });
  } catch (e) {
    return null;
  }
}

// ---------- Defaults and Normalizers ----------
const DEFAULT_INSIGHTS = {
  salaryRanges: [
    { role: "Junior Developer", min: 3, median: 5, max: 8, location: "India" },
    { role: "Software Engineer", min: 6, median: 10, max: 16, location: "India" },
    { role: "Senior Engineer", min: 12, median: 18, max: 28, location: "India" },
    { role: "Tech Lead", min: 18, median: 26, max: 38, location: "India" },
    { role: "Engineering Manager", min: 22, median: 32, max: 45, location: "India" },
  ],
  growthRate: 8,
  demandLevel: "High",
  topSkills: ["JavaScript", "React", "Node.js", "SQL", "Cloud"],
  marketOutlook: "Positive",
  keyTrends: ["AI adoption", "Cloud migration", "Data security", "Remote work", "DevOps"],
  recommendedSkills: ["System Design", "TypeScript", "Docker", "Kubernetes", "GCP/AWS"],
};

function normalizeInsights(obj) {
  const i = obj || {};
  const out = {
    salaryRanges: Array.isArray(i.salaryRanges) && i.salaryRanges.length > 0 ? i.salaryRanges : DEFAULT_INSIGHTS.salaryRanges,
    growthRate: typeof i.growthRate === "number" && !Number.isNaN(i.growthRate) ? i.growthRate : DEFAULT_INSIGHTS.growthRate,
    demandLevel: typeof i.demandLevel === "string" && i.demandLevel ? i.demandLevel : DEFAULT_INSIGHTS.demandLevel,
    topSkills: Array.isArray(i.topSkills) && i.topSkills.length > 0 ? i.topSkills : DEFAULT_INSIGHTS.topSkills,
    marketOutlook: typeof i.marketOutlook === "string" && i.marketOutlook ? i.marketOutlook : DEFAULT_INSIGHTS.marketOutlook,
    keyTrends: Array.isArray(i.keyTrends) && i.keyTrends.length > 0 ? i.keyTrends : DEFAULT_INSIGHTS.keyTrends,
    recommendedSkills: Array.isArray(i.recommendedSkills) && i.recommendedSkills.length > 0 ? i.recommendedSkills : DEFAULT_INSIGHTS.recommendedSkills,
  };
  return out;
}

const DEFAULT_ROADMAP = {
  currentLevel: "entry",
  careerPath: [
    { title: "Junior Developer", duration: "6-12 months", skills: ["JavaScript", "Git"], description: "Build fundamentals and ship small features." },
    { title: "Software Engineer", duration: "12-24 months", skills: ["React", "APIs", "Testing"], description: "Own modules and improve code quality." },
    { title: "Senior Engineer", duration: "24-36 months", skills: ["System Design", "Scaling"], description: "Design systems and mentor peers." },
    { title: "Tech Lead", duration: "36+ months", skills: ["Leadership", "Architecture"], description: "Lead teams and drive architecture." },
  ],
  skillGaps: ["System Design", "TypeScript", "Cloud Basics"],
  nextSteps: [
    { action: "Complete a system design course", priority: "high", description: "Cover fundamentals and practice weekly." },
    { action: "Build a full-stack side project", priority: "medium", description: "Use React/Node and deploy to cloud." },
    { action: "Contribute to open source", priority: "low", description: "Pick a repo and submit small PRs." },
  ],
};

function normalizeRoadmap(obj) {
  const r = obj || {};
  return {
    currentLevel: typeof r.currentLevel === "string" && r.currentLevel ? r.currentLevel : DEFAULT_ROADMAP.currentLevel,
    careerPath: Array.isArray(r.careerPath) && r.careerPath.length > 0 ? r.careerPath : DEFAULT_ROADMAP.careerPath,
    skillGaps: Array.isArray(r.skillGaps) && r.skillGaps.length > 0 ? r.skillGaps : DEFAULT_ROADMAP.skillGaps,
    nextSteps: Array.isArray(r.nextSteps) && r.nextSteps.length > 0 ? r.nextSteps : DEFAULT_ROADMAP.nextSteps,
  };
}

// Read Groq model from env so the default can be changed without code edits
const GROQ_MODEL = (process.env.GROQ_MODEL || "llama-3.3-70b-versatile").trim();
const GEMINI_TIMEOUT_MS = Number(process.env.GEMINI_TIMEOUT_MS || 30000);
const GROQ_TIMEOUT_MS = Number(process.env.GROQ_TIMEOUT_MS || 12000);
const GROQ_MAX_RETRIES = Number(process.env.GROQ_MAX_RETRIES || 2);
const GROQ_BACKOFF_MINUTES = Number(process.env.GROQ_BACKOFF_MINUTES || 5);

// Simple in-memory backoff state for Groq rate limits to avoid hammering a rate-limited API
let groqBackoffUntil = 0;

function isGroqBackedOff() {
  return Date.now() < groqBackoffUntil;
}

function setGroqBackoff(minutes) {
  groqBackoffUntil = Date.now() + (minutes || GROQ_BACKOFF_MINUTES) * 60_000;
}
function sleep(ms) { return new Promise((res) => setTimeout(res, ms)); }


function withTimeout(promise, ms, label = "operation") {
  return new Promise((resolve, reject) => {
    const id = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
    promise
      .then((v) => {
        clearTimeout(id);
        resolve(v);
      })
      .catch((e) => {
        clearTimeout(id);
        reject(e);
      });
  });
}

// Fallback: Groq API fetch
async function fetchGroqInsights(industry) {
  if (!process.env.GROQ_API_KEY) {
    // Safe default when no key is present
    return { ...DEFAULT_INSIGHTS };
  }
  const prompt = `
    Analyze the current state of the ${industry} industry in India and provide insights in ONLY the following JSON format without any additional notes or explanations:
    {
      "salaryRanges": [
        { "role": "string", "min": number, "max": number, "median": number, "location": "India" }
      ],
      "growthRate": number,
      "demandLevel": "High" | "Medium" | "Low",
      "topSkills": ["skill1", "skill2"],
      "marketOutlook": "Positive" | "Neutral" | "Negative",
      "keyTrends": ["trend1", "trend2"],
      "recommendedSkills": ["skill1", "skill2"]
    }
    IMPORTANT: Return ONLY the JSON. No additional text, notes, or markdown formatting.
    All salary data must be for the Indian market, in INR (lakhs per annum, LPA). Each salary value should be a whole number representing lakhs per annum (e.g., 6 = ₹6,00,000/year). Do NOT use thousands, crores, or decimals. Include at least 5 common roles for salary ranges, and set location to India for all roles. Growth rate should be a percentage. Include at least 5 skills and trends.
  `;
  // Retry loop for transient errors (but not for model_not_found / decommissioned)
  let attempt = 0;
  while (true) {
    attempt++;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), GROQ_TIMEOUT_MS);
    try {
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: GROQ_MODEL,
          messages: [
            { role: "system", content: "You are a helpful assistant." },
            { role: "user", content: prompt },
          ],
          max_tokens: 1024,
          temperature: 0.7,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (!response.ok) {
        const text = await response.text();
        const lower = (text || "").toLowerCase();
        if (lower.includes("model_decommissioned")) {
          throw new Error(
            "Groq API failed: model_decommissioned. The configured Groq model appears to be decommissioned. Please set GROQ_MODEL to a supported model. Current GROQ_MODEL=" + GROQ_MODEL + ". Raw: " + text
          );
        }
        if (lower.includes("model_not_found") || lower.includes("does not exist") || lower.includes("you do not have access")) {
          throw new Error(
            "Groq API failed: model_not_found or access denied. The configured GROQ_MODEL may be incorrect or not enabled for your account. Please set GROQ_MODEL to a model you have access to. Current GROQ_MODEL=" + GROQ_MODEL + ". Raw: " + text
          );
        }
        if (response.status === 429) {
          // Rate limited: fail fast with actionable message
          throw new Error("Groq API rate limited (429). Please retry later or upgrade plan. Raw: " + text);
        }
        // For other 5xx errors, throw to trigger retry
        if (response.status >= 500 && attempt <= GROQ_MAX_RETRIES) {
          const backoff = 200 * Math.pow(2, attempt - 1);
          await sleep(backoff);
          continue;
        }
        throw new Error("Groq API failed: " + text);
      }
      const data = await response.json();
      let text = data.choices?.[0]?.message?.content || "";
      text = text.replace(/```(?:json)?\n?/g, "").trim();
      return normalizeInsights(JSON.parse(text));
    } catch (err) {
      clearTimeout(timeout);
      // Abort or network errors are retriable up to max attempts
      const message = String(err?.message || err || "");
      if ((message && message.toLowerCase().includes("abort")) || message.toLowerCase().includes("timed out") || message.toLowerCase().includes("network")) {
        if (attempt <= GROQ_MAX_RETRIES) {
          const backoff = 200 * Math.pow(2, attempt - 1);
          await sleep(backoff);
          continue;
        }
        // fallthrough to throwing below
      }
      // Non-retryable or exhausted retries: rethrow
      throw err;
    }
  }
}

// Fallback: Groq API fetch for Career Roadmap
async function fetchGroqCareerRoadmap(industry, userExperience, userSkills) {
  if (!process.env.GROQ_API_KEY) {
    // Safe default when no key is present
    return { ...DEFAULT_ROADMAP };
  }
  const prompt = `
    Based on the following user profile, generate a personalized career roadmap in ONLY the following JSON format without any additional notes or explanations:
    
    Industry: ${industry}
    Years of Experience: ${userExperience}
    Current Skills: ${userSkills.join(', ')}
    
    Return ONLY this JSON format:
    {
      "currentLevel": "entry" | "mid" | "senior" | "expert",
      "careerPath": [
        {
          "title": "string",
          "duration": "string",
          "skills": ["string"],
          "description": "string"
        }
      ],
      "skillGaps": ["string"],
      "nextSteps": [
        {
          "action": "string",
          "priority": "high" | "medium" | "low",
          "description": "string"
        }
      ]
    }
    
    IMPORTANT GUIDELINES:
    - currentLevel should be determined by experience: entry (0-2 years), mid (2-5 years), senior (5-10 years), expert (10+ years)
    - careerPath should show 4 realistic progression steps starting from their current level
    - Each step should have realistic job titles for their industry
    - skills should be specific to each role
    - skillGaps should be the top 5 most important missing skills
    - nextSteps should be 3 actionable recommendations
    - Return ONLY the JSON, no additional text or formatting
  `;
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
    },
    body: JSON.stringify({
        model: GROQ_MODEL,
      messages: [
        { role: "system", content: "You are a helpful assistant." },
        { role: "user", content: prompt },
      ],
      max_tokens: 1024,
      temperature: 0.7,
    }),
  });
  if (!response.ok) {
    const text = await response.text();
    const lower = (text || "").toLowerCase();
    if (lower.includes("model_decommissioned")) {
      throw new Error(
        "Groq API failed: model_decommissioned. The configured Groq model appears to be decommissioned. Please set GROQ_MODEL to a supported model (see https://console.groq.com/docs/deprecations). Current GROQ_MODEL=" + GROQ_MODEL + ". Raw: " + text
      );
    }
    if (lower.includes("model_not_found") || lower.includes("does not exist") || lower.includes("you do not have access")) {
      throw new Error(
        "Groq API failed: model_not_found or access denied. The configured GROQ_MODEL may be incorrect or not enabled for your account. Please set GROQ_MODEL to a model you have access to. Current GROQ_MODEL=" + GROQ_MODEL + ". Raw: " + text
      );
    }
    throw new Error("Groq API failed: " + text);
  }
  const data = await response.json();
  let text = data.choices?.[0]?.message?.content || "";
  text = text.replace(/```(?:json)?\n?/g, "").trim();
  try {
    return normalizeRoadmap(JSON.parse(text));
  } catch (e) {
    try {
      const repaired = jsonrepair(text);
      return normalizeRoadmap(JSON.parse(repaired));
    } catch (repErr) {
      console.error("Failed to parse or repair Groq career roadmap:", text, repErr);
      throw repErr;
    }
  }
}

export const generateAIInsights = async (industry, provider = "gemini") => {
  console.log("generateAIInsights called with provider:", provider);
  if (provider === "groq") {
    console.log("Calling Groq API...");
    return await fetchGroqInsights(industry);
  }
  console.log("Calling Gemini API...");
  const prompt = `
          Analyze the current state of the ${industry} industry in India and provide insights in ONLY the following JSON format without any additional notes or explanations:
          {
            "salaryRanges": [
              { "role": "string", "min": number, "max": number, "median": number, "location": "India" }
            ],
            "growthRate": number,
            "demandLevel": "High" | "Medium" | "Low",
            "topSkills": ["skill1", "skill2"],
            "marketOutlook": "Positive" | "Neutral" | "Negative",
            "keyTrends": ["trend1", "trend2"],
            "recommendedSkills": ["skill1", "skill2"]
          }
          IMPORTANT: Return ONLY the JSON. No additional text, notes, or markdown formatting.
          All salary data must be for the Indian market, in INR (lakhs per annum, LPA). Each salary value should be a whole number representing lakhs per annum (e.g., 6 = ₹6,00,000/year). Do NOT use thousands, crores, or decimals. Include at least 5 common roles for salary ranges, and set location to India for all roles. Growth rate should be a percentage. Include at least 5 skills and trends.
        `;
  try {
    const model = getGeminiModel();
    if (!model) {
      // No Gemini available, fallback to Groq (may return defaults if GROQ key missing)
      return await fetchGroqInsights(industry);
    }
    // Ensure Gemini generateContent doesn't hang: use withTimeout
    const genPromise = model.generateContent(prompt);
    const result = await withTimeout(genPromise, GEMINI_TIMEOUT_MS, 'Gemini generateContent');
    const response = result.response;
    const text = await response.text();
    const cleanedText = text.replace(/```(?:json)?\n?/g, "").trim();
    return normalizeInsights(JSON.parse(cleanedText));
  } catch (err) {
    // Only fallback to Groq if the original provider was Gemini
    console.log("Gemini failed, falling back to Groq API...");
    return await fetchGroqInsights(industry);
  }
};

export const generateCareerRoadmap = async (industry, userExperience, userSkills, provider = "gemini") => {
  if (provider === "groq") {
    console.log("Calling Groq API for Career Roadmap...");
    return await fetchGroqCareerRoadmap(industry, userExperience, userSkills);
  }
  const prompt = `
    Based on the following user profile, generate a personalized career roadmap in ONLY the following JSON format without any additional notes or explanations:
    
    Industry: ${industry}
    Years of Experience: ${userExperience}
    Current Skills: ${userSkills.join(', ')}
    
    Return ONLY this JSON format:
    {
      "currentLevel": "entry" | "mid" | "senior" | "expert",
      "careerPath": [
        {
          "title": "string",
          "duration": "string",
          "skills": ["string"],
          "description": "string"
        }
      ],
      "skillGaps": ["string"],
      "nextSteps": [
        {
          "action": "string",
          "priority": "high" | "medium" | "low",
          "description": "string"
        }
      ]
    }
    
    IMPORTANT GUIDELINES:
    - currentLevel should be determined by experience: entry (0-2 years), mid (2-5 years), senior (5-10 years), expert (10+ years)
    - careerPath should show 4 realistic progression steps starting from their current level
    - Each step should have realistic job titles for their industry
    - skills should be specific to each role
    - skillGaps should be the top 5 most important missing skills
    - nextSteps should be 3 actionable recommendations
    - Return ONLY the JSON, no additional text or formatting
  `;

  const model = getGeminiModel();
  if (!model) {
    return await fetchGroqCareerRoadmap(industry, userExperience, userSkills);
  }
  try {
    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();
    const cleanedText = text.replace(/```(?:json)?\n?/g, "").trim();
    const roadmap = JSON.parse(cleanedText);
    return normalizeRoadmap(roadmap);
  } catch (e) {
    return await fetchGroqCareerRoadmap(industry, userExperience, userSkills);
  }
};

export async function getIndustryInsights(provider = "gemini", forceRefresh = false) {
  console.log("getIndustryInsights called with provider:", provider, "forceRefresh:", forceRefresh);
  const { userId } = await auth();
  if (!userId) return { error: "Unauthorized" };

  // Fetch Clerk user info
  let clerkUser = null;
  try {
    clerkUser = await currentUser();
  } catch (e) {
    clerkUser = null;
  }

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
  });

  if (!user) return { error: "User not found" };

  // Always fetch fresh data from Gemini (fallback to Groq)
  try {
    let insights = await generateAIInsights(user.industry, provider);
    const careerRoadmap = await generateCareerRoadmap(
      user.industry,
      user.experience || 0,
      user.skills || [],
      provider
    );
    return {
      insights,
      user: {
        name: clerkUser?.firstName && clerkUser?.lastName ? `${clerkUser.firstName} ${clerkUser.lastName}` : clerkUser?.username || clerkUser?.emailAddress || "User",
        email: clerkUser?.emailAddresses?.[0]?.emailAddress || undefined,
        skills: user.skills || [],
        experience: user.experience || 0,
        industry: user.industry || undefined,
        bio: user.bio || "",
      },
      careerRoadmap,
    };
  } catch (err) {
    console.error("Gemini error in getIndustryInsights:", err);
    // Robust fallback: check for any quota/limit error
    const errMsg = (err?.message || "").toLowerCase();
    if (
      provider === "gemini" && (
        err.status === 429 ||
        (err.statusText && err.statusText.toLowerCase().includes("too many requests")) ||
        errMsg.includes("too many requests") ||
        errMsg.includes("quota") ||
        errMsg.includes("limit")
      )
    ) {
      try {
        const insights = await fetchGroqInsights(user.industry);
        const careerRoadmap = await generateCareerRoadmap(
          user.industry,
          user.experience || 0,
          user.skills || [],
          provider
        );
        return {
          insights,
          user: {
            name: clerkUser?.firstName && clerkUser?.lastName ? `${clerkUser.firstName} ${clerkUser.lastName}` : clerkUser?.username || clerkUser?.emailAddress || "User",
            email: clerkUser?.emailAddresses?.[0]?.emailAddress || undefined,
            skills: user.skills || [],
            experience: user.experience || 0,
            industry: user.industry || undefined,
            bio: user.bio || "",
          },
          careerRoadmap,
        };
      } catch (groqErr) {
        console.error("Groq fallback also failed:", groqErr);
        return {
          error: "Both Gemini and Groq API limits reached or failed. Please try again tomorrow or upgrade your plan.",
        };
      }
    }
    if (err.status === 429 || (err.statusText && err.statusText.includes("Too Many Requests"))) {
      return {
        error: "You have reached the daily Gemini API limit for industry insights. Please try again tomorrow or upgrade your plan.",
      };
    }
    return { error: "Failed to load insights" };
  }
}
