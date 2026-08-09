"use server";
import { generateAIInsights, generateCareerRoadmap } from "@/actions/dashboard";

export async function GET(req) {
  // Safety: only allow in development to avoid exposing functionality in production
  if ((process.env.NODE_ENV || "development") !== "development") {
    return new Response(JSON.stringify({ error: "Not allowed" }), { status: 403 });
  }

  try {
    // Provider selection via query param ?provider=gemini|groq (default gemini)
    const url = new URL(req.url);
    const provider = url.searchParams.get("provider") || "gemini";
    const industry = url.searchParams.get("industry") || "software";

    const insights = await generateAIInsights(industry, provider);
    const roadmap = await generateCareerRoadmap(industry, 3, ["JavaScript", "React"], provider);

    return new Response(JSON.stringify({ provider, insights, roadmap }, null, 2), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err?.message || err) }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
}
