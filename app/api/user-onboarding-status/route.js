import { getUserOnboardingStatus } from "@/actions/user";

export async function GET() {
  const data = await getUserOnboardingStatus();
  return Response.json(data);
}
