"use server";

import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/prisma";
import {
  fetchUserFullContext,
  callGroqAPI,
  callGeminiAPI,
  cleanAndParseJson,
  generateRuleBasedInsights,
  generateRuleBasedChatResponse,
} from "@/lib/ai";

/**
 * Server Action: Fetch Smart Insights using multi-provider fallback pipeline
 * Priority 1: Google Gemini API (User Free Tier Preference)
 * Priority 2: Groq API
 * Priority 3: Zero-Crash Smart Rule-Based Engine
 */
export async function getSmartAIInsights() {
  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) {
      return { success: false, error: "Unauthorized access" };
    }

    const user = await db.user.findUnique({
      where: { clerkUserId },
      select: { id: true },
    });

    if (!user) {
      return { success: false, error: "User record not found" };
    }

    const userContext = await fetchUserFullContext(user.id);
    if (!userContext) {
      return { success: false, error: "Unable to build user context" };
    }

    // Prepare Prompt for Structured Smart Insights JSON
    const systemPrompt = `You are QuantAI Executive Career Advisor. 
Analyze the user's real-time career metrics:
${JSON.stringify(userContext, null, 2)}

Return ONLY a valid JSON array containing 3 to 4 actionable insight objects with this structure:
[
  {
    "id": "insight-1",
    "type": "warning" | "tip" | "highlight" | "risk" | "strategy",
    "title": "Short title",
    "description": "Quantitative analysis referencing exact user metrics",
    "confidenceScore": number between 88 and 98,
    "category": "Assessment Risk" | "Resume ATS" | "Execution" | "Technical Mastery",
    "actionableItem": "Direct next step for the user"
  }
]
IMPORTANT: Return ONLY the raw JSON array. No markdown formatting, no code fences, no extra text.`;

    // Tier 1 (Primary): Try Google Gemini API (Free tier subscription preference)
    try {
      const geminiRaw = await callGeminiAPI(
        "You are an executive AI assistant. Output strictly clean JSON.",
        systemPrompt
      );

      const parsedGemini = cleanAndParseJson(geminiRaw);
      const insightsArray = Array.isArray(parsedGemini) ? parsedGemini : parsedGemini?.insights || null;

      if (insightsArray && insightsArray.length > 0) {
        return {
          success: true,
          providerUsed: "gemini",
          insights: insightsArray,
        };
      }
    } catch (geminiErr) {
      console.warn("Gemini Insights primary fallback triggered:", geminiErr.message);
    }

    // Tier 2 (Secondary Fallback): Try Groq API
    try {
      const groqRaw = await callGroqAPI([
        { role: "system", content: "You are an executive AI assistant. Output strictly clean JSON." },
        { role: "user", content: systemPrompt },
      ], true);

      const parsedGroq = cleanAndParseJson(groqRaw);
      const insightsArray = Array.isArray(parsedGroq) ? parsedGroq : parsedGroq?.insights || null;

      if (insightsArray && insightsArray.length > 0) {
        return {
          success: true,
          providerUsed: "groq",
          insights: insightsArray,
        };
      }
    } catch (groqErr) {
      console.warn("Groq Insights fallback triggered:", groqErr.message);
    }

    // Tier 3: Zero-Crash Rule-Based Engine
    const ruleInsights = generateRuleBasedInsights(userContext);
    return {
      success: true,
      providerUsed: "rule-based",
      insights: ruleInsights,
    };
  } catch (error) {
    console.error("getSmartAIInsights root error:", error);
    return {
      success: false,
      error: error.message || "Failed to generate smart insights",
    };
  }
}

/**
 * Server Action: Send AI Chat Message with context injection and fallback pipeline
 * Priority 1: Google Gemini API (User Free Tier Preference)
 * Priority 2: Groq API
 * Priority 3: Zero-Crash Smart Rule-Based Engine
 */
export async function sendAIChatMessage(userQuery, messageHistory = []) {
  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) {
      return { success: false, error: "Unauthorized access" };
    }

    const user = await db.user.findUnique({
      where: { clerkUserId },
      select: { id: true },
    });

    if (!user) {
      return { success: false, error: "User record not found" };
    }

    const userContext = await fetchUserFullContext(user.id);
    if (!userContext) {
      return { success: false, error: "Unable to build user context" };
    }

    const systemPrompt = `You are QuantAI Executive Career Assistant.
Provide quantitative, personalized, encouraging, and highly actionable advice.
Refer directly to the user's metrics:
- Industry: ${userContext.user.industry}
- Avg Quiz Score: ${userContext.metrics.avgQuizScore}%
- Resume ATS Score: ${userContext.metrics.resumeAtsScore || "Not set"}%
- Timetable Completion: ${userContext.metrics.timetableCompletionRatePct}% (${userContext.metrics.timetableCompletedTasks}/${userContext.metrics.timetableTotalTasks} tasks)
- Top Industry Skills: ${userContext.metrics.industryTopSkills.join(", ")}

Use markdown formatting (bolding, lists) to make answers executive-grade, concise, and easy to read.`;

    const formattedMessages = [
      { role: "system", content: systemPrompt },
      ...messageHistory.slice(-6).map((m) => ({
        role: m.sender === "user" ? "user" : "assistant",
        content: m.text,
      })),
      { role: "user", content: userQuery },
    ];

    // Tier 1 (Primary): Try Google Gemini API (Free tier subscription preference)
    try {
      const geminiPrompt = `${userQuery}\n\nRecent History:\n${messageHistory
        .slice(-4)
        .map((m) => `${m.sender.toUpperCase()}: ${m.text}`)
        .join("\n")}`;

      const geminiAnswer = await callGeminiAPI(systemPrompt, geminiPrompt);
      if (geminiAnswer && geminiAnswer.trim().length > 0) {
        return {
          success: true,
          providerUsed: "gemini",
          answer: geminiAnswer.trim(),
        };
      }
    } catch (geminiErr) {
      console.warn("Gemini Chat primary fallback triggered:", geminiErr.message);
    }

    // Tier 2 (Secondary Fallback): Try Groq API
    try {
      const groqAnswer = await callGroqAPI(formattedMessages, false);
      if (groqAnswer && groqAnswer.trim().length > 0) {
        return {
          success: true,
          providerUsed: "groq",
          answer: groqAnswer.trim(),
        };
      }
    } catch (groqErr) {
      console.warn("Groq Chat fallback triggered:", groqErr.message);
    }

    // Tier 3: Zero-Crash Rule-Based Engine
    const ruleAnswer = generateRuleBasedChatResponse(userQuery, userContext);
    return {
      success: true,
      providerUsed: "rule-based",
      answer: ruleAnswer,
    };
  } catch (error) {
    console.error("sendAIChatMessage root error:", error);
    return {
      success: false,
      error: error.message || "Failed to process chat message",
    };
  }
}
