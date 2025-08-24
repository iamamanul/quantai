import {
  getTimetable,
  saveTimetable,
  deleteTimetable,
} from "@/actions/timetable";

export async function GET(req) {
  const data = await getTimetable();
  return Response.json(data);
}

export async function POST(req) {
  const timetable = await req.json();
  const result = await saveTimetable(timetable);
  return Response.json(result);
}

export async function DELETE(req) {
  const { id } = await req.json();
  const result = await deleteTimetable(id);
  return Response.json(result);
}
