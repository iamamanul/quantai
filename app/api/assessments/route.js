import { getAssessments } from "@/actions/interview";

export async function GET() {
  const data = await getAssessments();
  return Response.json(data);
}
