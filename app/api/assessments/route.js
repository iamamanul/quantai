export const runtime = "nodejs";
import { getAssessments } from "@/actions/interview";

export async function GET(req) {
  try {
    const data = await getAssessments();
    return Response.json(data);
  } catch (err) {
    const msg = err?.message || "Unknown error";
    if (msg.includes("Unauthorized")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }
    if (msg.includes("User not found")) {
      console.warn("[assessments] User not found; returning empty list.");
      return new Response(JSON.stringify([]), { status: 200, headers: { "x-note": "user-not-found" } });
    }
    console.error("[assessments] GET failed:", err);
    return new Response(JSON.stringify({ error: msg }), { status: 500 });
  }
} 
