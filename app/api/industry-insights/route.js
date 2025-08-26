import { getIndustryInsights } from "@/actions/dashboard";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const provider = searchParams.get("provider") || "gemini";
    const forceRefresh = searchParams.get("forceRefresh") === "true";
    const data = await getIndustryInsights(provider, forceRefresh);
    return Response.json(data);
  } catch (e) {
    console.error("/api/industry-insights failed:", e);
    return Response.json({ error: "Failed to load insights" });
  }
} 
