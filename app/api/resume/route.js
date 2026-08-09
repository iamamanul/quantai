export const runtime = "nodejs";
import { getResume } from "@/actions/resume";

export async function GET() {
  try {
    const data = await getResume();
    return Response.json(data);
  } catch (err) {
    const msg = err?.message || "Unknown error";
    if (msg.includes("Unauthorized")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }
    if (msg.includes("User not found")) {
      return new Response(JSON.stringify(null), { status: 200 });
    }
    console.error("[resume] GET failed:", err);
    return new Response(JSON.stringify({ error: msg }), { status: 500 });
  }
}
