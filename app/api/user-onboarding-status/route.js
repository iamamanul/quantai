export const runtime = "nodejs";
import { getUserOnboardingStatus } from "@/actions/user";

export async function GET(req) {
  try {
    const data = await getUserOnboardingStatus();
    return Response.json(data);
  } catch (e) {
    console.error("/api/user-onboarding-status failed:", e);
    return Response.json({ error: "Failed to check onboarding status" });
  }
} 
