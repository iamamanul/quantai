import { getCoverLetters } from "@/actions/cover-letter";

export async function GET() {
  try {
    const data = await getCoverLetters();
    return Response.json(data);
  } catch (error) {
    console.error("API Error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
