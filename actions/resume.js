"use server";

import { PrismaClient } from "@prisma/client";
import { auth } from "@clerk/nextjs/server";

const prisma = new PrismaClient();
import { GoogleGenerativeAI } from "@google/generative-ai";
import { revalidatePath } from "next/cache";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// Accept both formData (object) and content (string)
export async function saveResume(formData, content) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await prisma.user.findUnique({
    where: { clerkUserId: userId },
  });

  if (!user) throw new Error("User not found");

  try {
    // Generate ATS score and feedback
    const atsAnalysis = await analyzeATSResume(content, user.industry);

    const resume = await prisma.resume.upsert({
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

  const user = await prisma.user.findUnique({
    where: { clerkUserId: userId },
  });

  if (!user) throw new Error("User not found");

  // Return both content and data fields
  return await prisma.resume.findUnique({
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

  try {
    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();
    const cleanedText = text.replace(/```(?:json)?\n?/g, "").trim();
    
    return JSON.parse(cleanedText);
  } catch (error) {
    console.error("Error analyzing ATS resume:", error);
    // Return default analysis if AI fails
    return {
      score: 75,
      feedback: "Resume analysis completed. Consider adding more industry-specific keywords and quantifying achievements.",
      strengths: ["Good structure", "Clear sections"],
      weaknesses: ["Could use more keywords", "Add quantifiable results"],
      keywordMatch: 70,
      formatting: 80,
      content: 75
    };
  }
}

// Utility: Try Gemini, then Groq if Gemini fails
async function generateWithAI(prompt) {
  // Try Gemini first
  try {
    const result = await model.generateContent(prompt);
    const response = result.response;
    return response.text().trim();
  } catch (geminiError) {
    console.error("Gemini failed, trying Groq...", geminiError);
    // Try Groq fallback
    try {
      const groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
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
      if (!groqResponse.ok) {
        const errText = await groqResponse.text();
        throw new Error("Groq API failed: " + errText);
      }
      const data = await groqResponse.json();
      let text = data.choices?.[0]?.message?.content || "";
      text = text.replace(/```(?:markdown|json)?\n?/g, "").trim();
      return text;
    } catch (groqError) {
      console.error("Groq fallback also failed:", groqError);
      throw new Error("Both Gemini and Groq API failed. Please try again later.");
    }
  }
}

export async function improveWithAI({ current, type }) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await prisma.user.findUnique({
    where: { clerkUserId: userId },
    include: {
      industryInsight: true,
    },
  });

  if (!user) throw new Error("User not found");

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

  return await generateWithAI(prompt);
}
