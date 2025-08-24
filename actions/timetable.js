"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";

export async function getTimetable() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await prisma.user.findUnique({
    where: { clerkUserId: userId },
  });

  if (!user) throw new Error("User not found");

  return await prisma.timeTable.findMany({
    where: {
      userId: user.id,
    },
  });
}

export async function saveTimetable(timetable) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await prisma.user.findUnique({
    where: { clerkUserId: userId },
  });

  if (!user) throw new Error("User not found");

  const transactions = timetable.map((item) => {
    return prisma.timeTable.upsert({
      where: {
        id: item.id || "",
      },
      update: {
        task: item.task,
        completed: item.completed,
        date: item.date
      },
      create: {
        userId: user.id,
        date: item.date,
        task: item.task,
        completed: item.completed,
      },
    });
  });

  try {
    await prisma.$transaction(transactions);
    revalidatePath("/timetable");
    return { success: true };
  } catch (error) {
    console.error("Error saving timetable:", error);
    throw new Error("Failed to save timetable");
  }
}

export async function deleteTimetable(id) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await prisma.user.findUnique({
    where: { clerkUserId: userId },
  });

  if (!user) throw new Error("User not found");

  try {
    await prisma.timeTable.delete({
      where: {
        id: id,
        userId: user.id,
      },
    });
    revalidatePath("/timetable");
    return { success: true };
  } catch (error) {
    console.error("Error deleting timetable entry:", error);
    throw new Error("Failed to delete timetable entry");
  }
}
