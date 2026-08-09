import { db } from "@/lib/prisma";
import { GoogleGenerativeAI } from "@google/generative-ai";

/**
 * Clean and parse JSON from string, removing markdown code blocks.
 * @param {string} text 
 * @returns {any} Parsed JSON or null
 */
export function cleanAndParseJson(text) {
  if (!text || typeof text !== "string") return null;
  try {
    const cleaned = text
      .replace(/```json\s*/gi, "")
      .replace(/```\s*/gi, "")
      .trim();
    return JSON.parse(cleaned);
  } catch (e1) {
    try {
      const match = text.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
      if (match) {
        return JSON.parse(match[0]);
      }
    } catch (e2) {
      console.error("cleanAndParseJson failed:", e2.message);
    }
  }
  return null;
}

/**
 * Retrieve comprehensive user metrics and context from database via Prisma.
 * @param {string} userId - Prisma User ID
 */
export async function fetchUserFullContext(userId) {
  if (!userId) return null;

  try {
    const [user, assessments, resume, coverLetters, timeTable, userWithIndustry] = await Promise.all([
      db.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          email: true,
          industry: true,
          experience: true,
          skills: true,
          bio: true,
        },
      }),
      db.assessment.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
      db.resume.findUnique({
        where: { userId },
        select: { atsScore: true, feedback: true, updatedAt: true },
      }),
      db.coverLetter.findMany({
        where: { userId },
        select: { jobTitle: true, companyName: true, status: true, createdAt: true },
        take: 10,
      }),
      db.timeTable.findMany({
        where: { userId },
        take: 50,
      }),
      db.user.findUnique({
        where: { id: userId },
        select: { industry: true },
      }),
    ]);

    if (!user) return null;

    let insight = null;
    if (userWithIndustry?.industry) {
      try {
        insight = await db.industryInsight.findUnique({
          where: { industry: userWithIndustry.industry },
        });
      } catch (err) {
        console.warn("IndustryInsight fetch warning:", err.message);
      }
    }

    // Quantitative Assessment Stats
    const totalQuizzes = assessments.length;
    const scores = assessments.map((a) => a.quizScore || 0);
    const avgQuizScore = totalQuizzes > 0 ? Number((scores.reduce((a, b) => a + b, 0) / totalQuizzes).toFixed(1)) : 0;
    const highestQuizScore = totalQuizzes > 0 ? Number(Math.max(...scores).toFixed(1)) : 0;
    const latestQuizScore = totalQuizzes > 0 ? Number(scores[0].toFixed(1)) : 0;
    const recentTips = assessments.map((a) => a.improvementTip).filter(Boolean).slice(0, 3);

    // Timetable Stats
    const totalTasks = timeTable.length;
    const completedTasks = timeTable.filter((t) => t.completed).length;
    const completionRate = totalTasks > 0 ? Number(((completedTasks / totalTasks) * 100).toFixed(1)) : 0;
    const pendingTaskNames = timeTable.filter((t) => !t.completed).map((t) => t.task).slice(0, 5);

    return {
      user: {
        id: user.id,
        name: user.name || "User",
        email: user.email,
        industry: user.industry || "Technology & Software",
        experience: user.experience || 0,
        skills: user.skills || [],
        bio: user.bio || "",
      },
      metrics: {
        totalQuizzes,
        avgQuizScore,
        highestQuizScore,
        latestQuizScore,
        recentImprovementTips: recentTips,
        resumeAtsScore: resume?.atsScore ? Number(resume.atsScore.toFixed(1)) : null,
        timetableTotalTasks: totalTasks,
        timetableCompletedTasks: completedTasks,
        timetableCompletionRatePct: completionRate,
        pendingTasks: pendingTaskNames,
        coverLettersCreated: coverLetters.length,
        industryGrowthRatePct: insight?.growthRate || 8.5,
        marketOutlook: insight?.marketOutlook || "Positive",
        demandLevel: insight?.demandLevel || "High",
        industryTopSkills: insight?.topSkills?.length ? insight.topSkills : ["System Design", "React", "Cloud Architecture", "SQL"],
      },
    };
  } catch (error) {
    console.error("fetchUserFullContext error:", error);
    return null;
  }
}

// Model Fallback Configs
const GROQ_MODEL = (process.env.GROQ_MODEL || "llama-3.1-8b-instant").trim();
const GEMINI_MODEL = (process.env.GEMINI_MODEL || "gemini-1.5-flash").trim();

/**
 * Primary Provider: Groq API
 */
export async function callGroqAPI(messages, jsonMode = false) {
  if (!process.env.GROQ_API_KEY) {
    throw new Error("GROQ_API_KEY is not configured");
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12000);

  try {
    const body = {
      model: GROQ_MODEL,
      messages,
      temperature: 0.6,
      max_tokens: 1024,
    };
    if (jsonMode) {
      body.response_format = { type: "json_object" };
    }

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Groq API error (${response.status}): ${errText}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || "";
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

/**
 * Secondary Provider: Google Gemini API
 */
export async function callGeminiAPI(systemInstruction, userPrompt) {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({
    model: GEMINI_MODEL,
    systemInstruction,
  });

  const result = await model.generateContent(userPrompt);
  return result.response.text();
}

/**
 * Smart Rule-Based Engine for Insights (Zero-crash fallback)
 */
export function generateRuleBasedInsights(userContext) {
  const m = userContext?.metrics || {};
  const u = userContext?.user || {};
  const insights = [];

  // Assessment Quiz Metric
  if (m.totalQuizzes === 0) {
    insights.push({
      id: "rule-insight-quiz-1",
      type: "warning",
      title: "No Assessments Completed Yet",
      description: "You haven't completed any mock interview quizzes. Taking regular assessments increases job readiness by 40%.",
      confidenceScore: 96,
      category: "Interview Prep",
      actionableItem: "Take a 10-question AI mock interview quiz now.",
    });
  } else if (m.avgQuizScore < 75) {
    insights.push({
      id: "rule-insight-quiz-2",
      type: "risk",
      title: "Quiz Average Below Target Benchmark",
      description: `Your average assessment score is ${m.avgQuizScore}%. Target benchmark for interview readiness is 75%+.`,
      confidenceScore: 94,
      category: "Technical Risk",
      actionableItem: `Review past quiz tips: "${m.recentImprovementTips[0] || "Practice technical questions"}"`,
    });
  } else {
    insights.push({
      id: "rule-insight-quiz-3",
      type: "highlight",
      title: "High Technical Assessment Score",
      description: `Outstanding performance! Average quiz score is ${m.avgQuizScore}% across ${m.totalQuizzes} quizzes with a high score of ${m.highestQuizScore}%.`,
      confidenceScore: 98,
      category: "Technical Mastery",
      actionableItem: "Maintain momentum with advanced topic practice.",
    });
  }

  // Resume ATS Metric
  if (!m.resumeAtsScore) {
    insights.push({
      id: "rule-insight-resume-1",
      type: "tip",
      title: "Resume ATS Score Not Generated",
      description: "An ATS-friendly resume increases interview callback rates by 3x. Build your AI-optimized resume.",
      confidenceScore: 92,
      category: "Resume ATS",
      actionableItem: "Navigate to Resume Builder to calculate your ATS score.",
    });
  } else if (m.resumeAtsScore < 75) {
    insights.push({
      id: "rule-insight-resume-2",
      type: "warning",
      title: "Resume ATS Score Needs Optimization",
      description: `Your resume holds an ATS score of ${m.resumeAtsScore}%. Top recruiters filter resumes below 80%.`,
      confidenceScore: 93,
      category: "Resume Optimization",
      actionableItem: `Incorporate missing skills: ${(m.industryTopSkills || ["Cloud", "System Design"]).slice(0, 3).join(", ")}.`,
    });
  } else {
    insights.push({
      id: "rule-insight-resume-3",
      type: "highlight",
      title: "ATS Resume Benchmark Passed",
      description: `Your resume achieved an impressive ${m.resumeAtsScore}% ATS readiness score.`,
      confidenceScore: 97,
      category: "ATS Readiness",
      actionableItem: "Tailor your professional summary for targeted applications.",
    });
  }

  // Productivity & Timetable
  if (m.timetableTotalTasks > 0) {
    if (m.timetableCompletionRatePct < 50) {
      insights.push({
        id: "rule-insight-time-1",
        type: "risk",
        title: "Learning Schedule Execution Lagging",
        description: `Timetable task completion rate is ${m.timetableCompletionRatePct}% (${m.timetableCompletedTasks}/${m.timetableTotalTasks} tasks finished).`,
        confidenceScore: 90,
        category: "Productivity Deficit",
        actionableItem: `Complete pending task: "${m.pendingTasks[0] || "Review study materials"}"`,
      });
    } else {
      insights.push({
        id: "rule-insight-time-2",
        type: "strategy",
        title: "Strong Timetable Execution Discipline",
        description: `Great consistency! You have completed ${m.timetableCompletionRatePct}% of scheduled timetable study blocks.`,
        confidenceScore: 96,
        category: "Execution Discipline",
        actionableItem: "Schedule next week's mock interview prep blocks.",
      });
    }
  } else {
    insights.push({
      id: "rule-insight-time-3",
      type: "tip",
      title: "Create Structured Learning Timetable",
      description: "Scheduling daily learning blocks doubles retention and interview performance.",
      confidenceScore: 88,
      category: "Time Management",
      actionableItem: "Add 2-3 weekly study slots in the Timetable tool.",
    });
  }

  return insights;
}

/**
 * Smart Rule-Based Engine for Chat (Zero-crash fallback)
 */
export function generateRuleBasedChatResponse(userQuery, userContext) {
  const query = (userQuery || "").toLowerCase();
  const m = userContext?.metrics || {};
  const u = userContext?.user || {};
  const name = u.name || "Professional";
  const industry = u.industry || "Technology";

  if (query.includes("risk") || query.includes("warning") || query.includes("highest risk")) {
    if (m.avgQuizScore > 0 && m.avgQuizScore < 75) {
      return `⚠️ **Highest Risk Metric**: Your average quiz score is **${m.avgQuizScore}%** (target is 75%+).\n\n` +
        `**QuantAI Action Plan**:\n` +
        `1. Review past quiz explanations in the Interview section.\n` +
        `2. Take 2 new quizzes focused on ${(m.industryTopSkills || ["Core Skills"]).slice(0, 2).join(" & ")}.\n` +
        `3. Apply specific feedback tips: "${m.recentImprovementTips?.[0] || "Review core concepts"}".`;
    }
    if (m.resumeAtsScore && m.resumeAtsScore < 75) {
      return `⚠️ **Highest Risk Metric**: Your Resume ATS Readiness Score is **${m.resumeAtsScore}%** (target 80%+).\n\n` +
        `**QuantAI Action Plan**:\n` +
        `1. Add top keywords: **${(m.industryTopSkills || ["System Design"]).slice(0, 3).join(", ")}**.\n` +
        `2. Quantify work experience bullet points with percentage gains or numeric results.\n` +
        `3. Re-run ATS Scanner in Build Resume.`;
    }
    if (m.timetableTotalTasks > 0 && m.timetableCompletionRatePct < 50) {
      return `⚠️ **Highest Risk Metric**: Timetable completion rate is **${m.timetableCompletionRatePct}%** (${m.timetableCompletedTasks}/${m.timetableTotalTasks} tasks).\n\n` +
        `**QuantAI Action Plan**:\n` +
        `1. Complete pending task: "${m.pendingTasks?.[0] || "Study block"}".\n` +
        `2. Block out 30 minutes daily for structured prep.`;
    }
    return `✅ **Current Risk Status**: Minimal Risk! Your average quiz score is **${m.avgQuizScore || 85}%** and ATS score is **${m.resumeAtsScore || 80}%**. Keep following your learning timetable!`;
  }

  if (query.includes("summarize") || query.includes("performance") || query.includes("summary")) {
    return `📊 **QuantAI Executive Performance Summary for ${name}**:\n\n` +
      `• **Target Industry**: ${industry}\n` +
      `• **Quizzes Taken**: ${m.totalQuizzes || 0} (Avg Score: **${m.avgQuizScore || 0}%** | High: **${m.highestQuizScore || 0}%**)\n` +
      `• **Resume ATS Score**: **${m.resumeAtsScore ? m.resumeAtsScore + "%" : "Not Analyzed"}**\n` +
      `• **Timetable Task Execution**: **${m.timetableCompletionRatePct || 0}%** (${m.timetableCompletedTasks || 0}/${m.timetableTotalTasks || 0} completed)\n` +
      `• **Cover Letters Generated**: ${m.coverLettersCreated || 0}\n\n` +
      `🎯 **Executive Verdict**: You are making steady progress! Focus on boosting your ${m.avgQuizScore < 75 ? "quiz average" : "ATS resume optimization"} to unlock top interview calls.`;
  }

  if (query.includes("strategy") || query.includes("30-day") || query.includes("plan")) {
    return `🎯 **30-Day Executive Career Strategy for ${name}**:\n\n` +
      `**Phase 1: Days 1–10 (Resume & Skill Alignment)**\n` +
      `• Optimize resume ATS score to 80%+. Add skills: ${(m.industryTopSkills || ["Core Skills"]).slice(0, 3).join(", ")}.\n` +
      `• Create 3 weekly study slots in your Timetable.\n\n` +
      `**Phase 2: Days 11–20 (Interview Mastery)**\n` +
      `• Complete 3–5 mock interview quizzes.\n` +
      `• Achieve 80%+ quiz score on technical topics.\n\n` +
      `**Phase 3: Days 21–30 (Applications & Execution)**\n` +
      `• Generate 3 tailored cover letters.\n` +
      `• Maintain 85%+ timetable task completion.`;
  }

  if (query.includes("skill") || query.includes("learn") || query.includes("boost")) {
    return `🔥 **Top High-Demand Skills for ${industry}**:\n\n` +
      `1. **${m.industryTopSkills?.[0] || "System Architecture"}**: Highly valued by recruiters.\n` +
      `2. **${m.industryTopSkills?.[1] || "Cloud Platform Management"}**: Drives enterprise scale.\n` +
      `3. **${m.industryTopSkills?.[2] || "Data & Metrics Analytics"}**: Crucial for leadership roles.\n\n` +
      `💡 *Your Listed Skills*: ${u.skills?.length > 0 ? u.skills.join(", ") : "None added yet"}. Adding these top 3 to your resume will significantly boost ATS keyword matching!`;
  }

  return `🤖 **QuantAI Career Assistant for ${name}**:\n\n` +
    `I've analyzed your real-time career data in **${industry}**:\n` +
    `• Average Assessment Score: **${m.avgQuizScore || 0}%**\n` +
    `• ATS Resume Readiness: **${m.resumeAtsScore ? m.resumeAtsScore + "%" : "Pending setup"}**\n` +
    `• Timetable Execution: **${m.timetableCompletionRatePct || 0}%**\n\n` +
    `How can I assist you with your career growth today? Ask me anything about risk analysis, ATS optimization, or interview strategies!`;
}
