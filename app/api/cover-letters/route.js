export const runtime = "nodejs";
import crypto from "crypto";
import { getCoverLetters } from "@/actions/cover-letter";

export async function GET(req) {
  try {
    const data = await getCoverLetters();

    // Generate a stable ETag per response for lightweight conditional GETs
    const etag = 'W/"' + crypto
      .createHash('sha1')
      .update(JSON.stringify(data.map(d => ({ id: d.id, updatedAt: d.createdAt }))))
      .digest('base64') + '"';

    const ifNoneMatch = req.headers.get('if-none-match');
    if (ifNoneMatch && ifNoneMatch === etag) {
      return new Response(null, {
        status: 304,
        headers: {
          ETag: etag,
          "Cache-Control": "private, max-age=0, must-revalidate",
        },
      });
    }

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ETag: etag,
        // Allow browser/SWR to revalidate quickly while enabling quick back/forward cache
        "Cache-Control": "private, max-age=30, stale-while-revalidate=120",
      },
    });
  } catch (err) {
    const msg = err?.message || "Unknown error";
    if (msg.includes("Unauthorized")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }
    if (msg.includes("User not found")) {
      console.warn("[cover-letters] User not found; returning empty list.");
      return new Response(JSON.stringify([]), { status: 200, headers: { "x-note": "user-not-found" } });
    }
    console.error("[cover-letters] GET failed:", err);
    return new Response(JSON.stringify({ error: msg }), { status: 500 });
  }
} 
