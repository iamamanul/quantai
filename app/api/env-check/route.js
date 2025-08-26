export const runtime = "nodejs";
import crypto from "crypto";
import { db } from "@/lib/prisma";

export async function GET() {
  try {
    const g = (process.env.GEMINI_API_KEY || "").trim();
    const r = (process.env.GROQ_API_KEY || "").trim();
    const databaseUrl = (process.env.DATABASE_URL || "").trim();
    const dbHash = crypto.createHash("sha1").update(databaseUrl).digest("hex");
    // Attempt to read minimal DB identity without leaking sensitive values
    let dbInfo = { name: null, version: null };
    try {
      const rows = await db.$queryRawUnsafe(`select current_database() as name, version() as version`);
      if (Array.isArray(rows) && rows[0]) {
        dbInfo = { name: rows[0].name || null, version: String(rows[0].version || "").split(" ")[0] };
      }
    } catch {}
    const body = JSON.stringify({
      nodeEnv: process.env.NODE_ENV || null,
      hasGemini: !!g,
      hasGroq: !!r,
      dbFingerprint: dbHash,
      dbName: dbInfo.name,
      dbVersion: dbInfo.version,
    });
    return new Response(body, { status: 200, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: "env-check failed" }), { status: 500 });
  }
}
