import { getResume } from "@/actions/resume";

export async function GET() {
  const data = await getResume();
  return Response.json(data);
}
