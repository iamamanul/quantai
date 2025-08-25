"use server";

import { db } from "@/lib/prisma";
import { auth, currentUser } from "@clerk/nextjs/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// Fallback: Groq API fetch
async function fetchGroqInsights(industry) {
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
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
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
    throw new Error("Groq API failed: " + (await response.text()));
  }
  const data = await response.json();
  // Extract the JSON from the response
  let text = data.choices?.[0]?.message?.content || "";
  text = text.replace(/```(?:json)?\n?/g, "").trim();
  return JSON.parse(text);
}

// Fallback: Groq API fetch for Career Roadmap
async function fetchGroqCareerRoadmap(industry, userExperience, userSkills) {
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
    throw new Error("Groq API failed: " + (await response.text()));
  }
  const data = await response.json();
  let text = data.choices?.[0]?.message?.content || "";
  text = text.replace(/```(?:json)?\n?/g, "").trim();
  return JSON.parse(text);
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
    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();
    const cleanedText = text.replace(/```(?:json)?\n?/g, "").trim();
    return JSON.parse(cleanedText);
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

  const result = await model.generateContent(prompt);
  const response = result.response;
  const text = response.text();
  const cleanedText = text.replace(/```(?:json)?\n?/g, "").trim();

  return JSON.parse(cleanedText);
};

export async function getIndustryInsights(provider = "gemini", forceRefresh = false) {
  console.log("getIndustryInsights called with provider:", provider, "forceRefresh:", forceRefresh);
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

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

  if (!user) throw new Error("User not found");

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
    throw err;
  }
}
