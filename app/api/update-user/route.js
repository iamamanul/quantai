import { NextResponse } from "next/server";
import { updateUser } from "@/actions/user";

export async function POST(req) {
  try {
    const body = await req.json();
    // Expect: { industry, experience, bio, skills }
    const payload = {
      industry: body.industry,
      experience: typeof body.experience === "string" ? parseInt(body.experience, 10) : body.experience,
      bio: body.bio || undefined,
      skills: Array.isArray(body.skills)
        ? body.skills
        : (typeof body.skills === "string" ? body.skills.split(",").map(s => s.trim()).filter(Boolean) : undefined),
    };

    const result = await updateUser(payload);
    return NextResponse.json(result ?? { success: true });
  } catch (err) {
    return NextResponse.json({ error: err?.message || "Failed to update profile" }, { status: 400 });
  }
}
