import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/prisma";

export async function POST(request) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { clerkUserId, name, email, imageUrl } = await request.json();

    // Verify the authenticated user matches the request
    if (userId !== clerkUserId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Check if user already exists
    const existingUser = await db.user.findUnique({
      where: { clerkUserId },
    });

    if (existingUser) {
      // Update existing user
      const updatedUser = await db.user.update({
        where: { clerkUserId },
        data: {
          name,
          email,
          imageUrl,
        },
      });
      return NextResponse.json({ user: updatedUser });
    }

    // Create new user
    const newUser = await db.user.create({
      data: {
        clerkUserId,
        name,
        email,
        imageUrl,
      },
    });

    return NextResponse.json({ user: newUser });
  } catch (error) {
    console.error("User sync error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
