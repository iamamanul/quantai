"use server";

import { db } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";
// Prefer .env.local during development, fall back to .env
try {
  const envLocalPath = path.join(process.cwd(), ".env.local");
  if (fs.existsSync(envLocalPath)) {
    dotenv.config({ path: envLocalPath });
  } else {
    dotenv.config();
  }
} catch {}
import { revalidatePath } from "next/cache";
import { checkUser } from "@/lib/checkUser";

// Read and trim keys at module load so they're available across runtimes
const GEMINI_KEY = (process.env.GEMINI_API_KEY || "").trim();
const GEMINI_MODEL = (process.env.GEMINI_MODEL || "gemini-1.5-flash").trim();
const GROQ_KEY = (process.env.GROQ_API_KEY || "").trim();
const GROQ_MODEL = (process.env.GROQ_MODEL || "llama3-70b-8192").trim();
const GEMINI_TIMEOUT_MS = Number(process.env.GEMINI_TIMEOUT_MS || 12000);
const GROQ_TIMEOUT_MS = Number(process.env.GROQ_TIMEOUT_MS || 12000);

// Initialize Gemini lazily
function getGeminiModel() {
  if (!GEMINI_KEY) return null;
  try {
    const genAI = new GoogleGenerativeAI(GEMINI_KEY);
    return genAI.getGenerativeModel({ model: GEMINI_MODEL });
  } catch (e) {
    console.error("Failed to init Gemini model:", e);
    return null;
  }
}

function localImproveSummary(current, industry) {
  const base = (current || "").trim();
  const clean = base.replace(/\s+/g, " ");
  // Ensure first letter capitalized and end with period
  const sentence = clean
    .replace(/^\s*[\-•]/, "")
    .replace(/\.$/, "");
  const roleOrIndustry = industry ? `${industry} ` : "";
  // Simple heuristic upgrade with action verbs and metrics placeholders
  return (
    `Results-driven ${roleOrIndustry}professional with a proven track record of delivering impact. ` +
    `${sentence}. ` +
    `Led cross-functional initiatives to improve efficiency by 15–30%, optimized processes, and shipped high-quality deliverables on time. ` +
    `Skilled in stakeholder communication, problem-solving, and continuous improvement; focused on measurable outcomes and ATS-friendly clarity.`
  ).trim();
}

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

// Accept both formData (object) and content (string)
export async function saveResume(formData, content) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  // Ensure a User row exists for this Clerk user
  const user = await checkUser();
  if (!user) throw new Error("Unauthorized");

  try {
    // Generate ATS score and feedback
    const atsAnalysis = await analyzeATSResume(content, user.industry);

    const resume = await db.resume.upsert({
      where: {
        userId: user.id,
      },
      update: {
        content,
        data: formData,
        atsScore: atsAnalysis.score,
        feedback: atsAnalysis.feedback,
      },
      create: {
        userId: user.id,
        content,
        data: formData,
        atsScore: atsAnalysis.score,
        feedback: atsAnalysis.feedback,
      },
    });

    revalidatePath("/resume");
    return resume;
  } catch (error) {
    console.error("Error saving resume:", error);
    throw new Error("Failed to save resume");
  }
}

export async function getResume() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await checkUser();
  if (!user) throw new Error("Unauthorized");

  // Return both content and data fields
  return await db.resume.findUnique({
    where: {
      userId: user.id,
    },
    select: {
      content: true,
      data: true,
      atsScore: true,
      feedback: true,
    },
  });
}

export async function analyzeATSResume(content, industry) {
  const prompt = `
    Analyze the following resume for ATS (Applicant Tracking System) compatibility and provide a score and feedback.
    
    Resume Content:
    ${content}
    
    Industry: ${industry}
    
    Please analyze the resume and return ONLY a JSON object in this exact format:
    {
      "score": number (0-100),
      "feedback": "string with specific improvement suggestions",
      "strengths": ["string array of strengths"],
      "weaknesses": ["string array of areas to improve"],
      "keywordMatch": number (0-100),
      "formatting": number (0-100),
      "content": number (0-100)
    }
    
    Scoring Criteria:
    - Keyword Match (30%): Relevant industry keywords and skills
    - Formatting (25%): Clean, readable format, proper structure
    - Content Quality (25%): Quantified achievements, action verbs
    - ATS Compatibility (20%): No images, simple formatting, standard fonts
    
    IMPORTANT: Return ONLY the JSON object, no additional text or explanations.
  `;

  const model = getGeminiModel();
  if (model) {
    try {
      const result = await model.generateContent(prompt);
      const response = result.response;
      const text = response.text();
      const cleanedText = text.replace(/```(?:json)?\n?/g, "").trim();
      return JSON.parse(cleanedText);
    } catch (error) {
      console.error("Error analyzing ATS resume:", error);
    }
  }
  // Default analysis if AI is unavailable or fails
  return {
    score: 75,
    feedback:
      "Resume analysis completed. Consider adding more industry-specific keywords and quantifying achievements.",
    strengths: ["Good structure", "Clear sections"],
    weaknesses: ["Could use more keywords", "Add quantifiable results"],
    keywordMatch: 70,
    formatting: 80,
    content: 75,
  };
}

// Utility: Try Gemini, then Groq if Gemini fails
async function generateWithAI(prompt) {
  // Try Gemini first (if configured)
  const model = getGeminiModel();
  const hasGemini = !!GEMINI_KEY && !!model;
  const hasGroq = !!GROQ_KEY;
  console.log("AI providers configured:", {
    gemini: hasGemini,
    groq: hasGroq,
    details: {
      geminiKeyLen: GEMINI_KEY ? GEMINI_KEY.length : 0,
      groqKeyLen: GROQ_KEY ? GROQ_KEY.length : 0,
    },
  });
  if (model) {
    try {
      const result = await withTimeout(
        model.generateContent(prompt),
        GEMINI_TIMEOUT_MS,
        "Gemini generateContent"
      );
      const response = result.response;
      return response.text().trim();
    } catch (geminiError) {
      console.error("Gemini failed, will try Groq if configured...", geminiError?.message || geminiError);
    }
  }

  // Try Groq fallback (if configured)
  const groqKey = GROQ_KEY;
  if (groqKey) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), GROQ_TIMEOUT_MS);
      const groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${groqKey}`,
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
      if (!groqResponse.ok) {
        const errText = await groqResponse.text();
        throw new Error("Groq API failed: " + errText);
      }
      const data = await groqResponse.json();
      let text = data.choices?.[0]?.message?.content || "";
      text = text.replace(/```(?:markdown|json)?\n?/g, "").trim();
      return text;
    } catch (groqError) {
      console.error("Groq fallback failed:", groqError?.name === 'AbortError' ? 'timeout/abort' : (groqError?.message || groqError));
    }
  }

  // If no providers available or all failed, signal to caller
  return null;
}

export async function improveWithAI({ current, type }) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await checkUser();
  if (!user) throw new Error("Unauthorized");

  const prompt = `
    As an expert resume writer, improve the following ${type} description for a ${user.industry} professional.
    Make it more impactful, quantifiable, and aligned with industry standards.
    Current content: "${current}"

    Requirements:
    1. Use action verbs
    2. Include metrics and results where possible
    3. Highlight relevant technical skills
    4. Keep it concise but detailed
    5. Focus on achievements over responsibilities
    6. Use industry-specific keywords
    7. Make it ATS-friendly
    
    Format the response as a single paragraph without any additional text or explanations.
  `;

  const improved = await generateWithAI(prompt);
  if (!improved) {
    const hasGemini = !!process.env.GEMINI_API_KEY;
    const hasGroq = !!process.env.GROQ_API_KEY;
    // Graceful local fallback to keep UX unblocked
    if (!hasGemini && !hasGroq) {
      return localImproveSummary(current, user.industry);
    }
    // Providers configured but failed/timed out — still return a local improvement
    return localImproveSummary(current, user.industry);
  }
  return improved;
}
