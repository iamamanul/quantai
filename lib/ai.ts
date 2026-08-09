import {
  cleanAndParseJson,
  fetchUserFullContext,
  callGroqAPI,
  callGeminiAPI,
  generateRuleBasedInsights,
  generateRuleBasedChatResponse,
} from "./ai.js";

export interface UserMetricContext {
  user: {
    id: string;
    name: string;
    email: string;
    industry: string;
    experience: number;
    skills: string[];
    bio: string;
  };
  metrics: {
    totalQuizzes: number;
    avgQuizScore: number;
    highestQuizScore: number;
    latestQuizScore: number;
    recentImprovementTips: string[];
    resumeAtsScore: number | null;
    timetableTotalTasks: number;
    timetableCompletedTasks: number;
    timetableCompletionRatePct: number;
    pendingTasks: string[];
    coverLettersCreated: number;
    industryGrowthRatePct: number;
    marketOutlook: string;
    demandLevel: string;
    industryTopSkills: string[];
  };
}

export interface SmartInsightCard {
  id: string;
  type: "warning" | "tip" | "highlight" | "risk" | "strategy";
  title: string;
  description: string;
  confidenceScore: number;
  category: string;
  actionableItem: string;
}

export interface ChatMessage {
  id: string;
  sender: "user" | "ai";
  text: string;
  timestamp: string;
  providerUsed?: "groq" | "gemini" | "rule-based";
}

export {
  cleanAndParseJson,
  fetchUserFullContext,
  callGroqAPI,
  callGeminiAPI,
  generateRuleBasedInsights,
  generateRuleBasedChatResponse,
};
