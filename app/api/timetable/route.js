import { NextResponse } from "next/server";
import crypto from 'crypto';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/prisma';
import { checkUser } from '@/lib/checkUser';

// Function to ensure TimeTable exists
async function ensureTimeTableExists() {
  try {
    // Try to create the table if it doesn't exist
    await db.$executeRaw`
      CREATE TABLE IF NOT EXISTS "TimeTable" (
        "id" TEXT NOT NULL,
        "userId" TEXT NOT NULL,
        "date" TIMESTAMP(3) NOT NULL,
        "task" TEXT NOT NULL,
        "timeSlot" TEXT NOT NULL DEFAULT '9:00 AM - 10:00 AM',
        "completed" BOOLEAN NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "TimeTable_pkey" PRIMARY KEY ("id")
      );
    `;
    
    // Create indexes if they don't exist
    await db.$executeRaw`
      CREATE INDEX IF NOT EXISTS "TimeTable_userId_idx" ON "TimeTable"("userId");
    `;
    
    await db.$executeRaw`
      CREATE INDEX IF NOT EXISTS "TimeTable_date_idx" ON "TimeTable"("date");
    `;
    
    // Add timeSlot column if it doesn't exist
    await db.$executeRaw`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'TimeTable' AND column_name = 'timeSlot'
        ) THEN
          ALTER TABLE "TimeTable" ADD COLUMN "timeSlot" TEXT DEFAULT '9:00 AM - 10:00 AM';
        END IF;
      END $$;
    `;
    
    // Update existing records to have a default timeSlot if null
    await db.$executeRaw`
      UPDATE "TimeTable" SET "timeSlot" = '9:00 AM - 10:00 AM' WHERE "timeSlot" IS NULL;
    `;
    
    // Add foreign key constraint if it doesn't exist
    await db.$executeRaw`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints 
          WHERE constraint_name = 'TimeTable_userId_fkey'
        ) THEN
          ALTER TABLE "TimeTable" ADD CONSTRAINT "TimeTable_userId_fkey" 
          FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
        END IF;
      END $$;
    `;
  } catch (error) {
    console.log('TimeTable setup:', error.message);
  }
}

export async function GET(request) {
  try {
    // Avoid running ensure on hot path; migrations create the table and indexes
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    // Ensure a DB user exists or create one
    const user = await checkUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // In-memory TTL cache per user for hot GETs
    const cache = (globalThis.__timetableCache = globalThis.__timetableCache || new Map());
    const cacheKey = `timetable:${user.id}`;
    const now = Date.now();
    const cached = cache.get(cacheKey);
    let timetable;
    if (cached && cached.expireAt > now) {
      timetable = cached.data;
    } else {
      timetable = await db.timeTable.findMany({
      where: {
        userId: user.id,
      },
      orderBy: {
        date: 'asc',
      },
      select: {
        id: true,
        date: true,
        task: true,
        timeSlot: true,
        completed: true,
      }
      });
      cache.set(cacheKey, { data: timetable, expireAt: now + 15_000 });
    }

    const etag = 'W/"' + crypto
      .createHash('sha1')
      .update(JSON.stringify(timetable.map(t => ({ id: t.id, d: t.date, c: t.completed }))))
      .digest('base64') + '"';
    const ifNoneMatch = request.headers.get('if-none-match');
    if (ifNoneMatch && ifNoneMatch === etag) {
      return new NextResponse(null, { status: 304, headers: { ETag: etag, 'Cache-Control': 'private, max-age=15, stale-while-revalidate=60' } });
    }

    return new NextResponse(JSON.stringify(timetable), { status: 200, headers: { 'Content-Type': 'application/json', ETag: etag, 'Cache-Control': 'private, max-age=15, stale-while-revalidate=60' } });
  } catch (error) {
    console.error("Error fetching timetable:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    // Ensure TimeTable exists before creating
    await ensureTimeTableExists();
    
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const user = await checkUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    
    // Handle single task creation (from schedule page)
    if (body.taskName) {
      const date = new Date(body.date);
      const timeSlot = body.timeSlot || '9:00 AM - 10:00 AM';
      // De-duplicate: if a task exists for same user/date/timeSlot, return it instead of creating
      const existing = await db.timeTable.findFirst({
        where: { userId: user.id, date, timeSlot },
      });
      if (existing) return NextResponse.json(existing);

      const newTask = await db.timeTable.create({
        data: {
          userId: user.id,
          date,
          task: body.taskName,
          timeSlot,
          completed: false,
        },
      });
      return NextResponse.json(newTask);
    }

    // Handle bulk timetable save (from timetable page)
    if (Array.isArray(body)) {
      // Normalize items and compute range/ids
      const normalized = body
        .filter((it) => it && it.task && it.date)
        .map((it) => ({
          id: it.id || undefined,
          task: String(it.task),
          completed: Boolean(it.completed),
          date: new Date(it.date),
        }));

      const idsInPayload = normalized.filter((it) => it.id).map((it) => it.id);
      const dates = normalized.map((it) => it.date).filter((d) => !isNaN(d));
      const minDate = dates.length ? new Date(Math.min(...dates)) : null;
      const maxDate = dates.length ? new Date(Math.max(...dates)) : null;

      // Upsert all incoming items
      const upserts = normalized.map((item) =>
        db.timeTable.upsert({
          where: { id: item.id || "" },
          update: { task: item.task, completed: item.completed, date: item.date },
          create: { userId: user.id, task: item.task, completed: item.completed, date: item.date },
        })
      );

      await db.$transaction(upserts);

      // Cleanup: remove stale items not present in payload within the same date range
      // If no date range provided, perform a broader cleanup for this user excluding provided ids
      const deleteWhere = {
        userId: user.id,
        ...(minDate && maxDate
          ? { date: { gte: minDate, lte: maxDate } }
          : {}),
        ...(idsInPayload.length
          ? { id: { notIn: idsInPayload } }
          : {}),
      };

      // Only attempt deleteMany if we have a defined scope (either date range or ids filter)
      if (deleteWhere.date || idsInPayload.length) {
        await db.timeTable.deleteMany({ where: deleteWhere });
      }

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid request format" }, { status: 400 });
  } catch (error) {
    console.error("Error saving timetable:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(request) {
  try {
    // Ensure TimeTable exists before updating
    await ensureTimeTableExists();
    
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const user = await checkUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id, isCompleted, timeSlot, taskName } = await request.json();

    const data = {};
    if (typeof isCompleted === 'boolean') data.completed = isCompleted;
    if (typeof timeSlot === 'string' && timeSlot.trim()) data.timeSlot = timeSlot.trim();
    if (typeof taskName === 'string' && taskName.trim()) data.task = taskName.trim();

    if (!id || Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
    }

    // Verify the task belongs to this user, then update by unique id
    const existing = await db.timeTable.findFirst({ where: { id, userId: user.id } });
    if (!existing) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }
    const updatedTask = await db.timeTable.update({ where: { id }, data });

    return NextResponse.json(updatedTask);
  } catch (error) {
    console.error("Error updating timetable:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(request) {
  try {
    // Fast path delete: assume table exists in normal operation
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const user = await checkUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await request.json();

    // Soft delete to preserve audit trail
    const result = await db.timeTable.updateMany({ where: { id, userId: user.id }, data: { deletedAt: new Date() } });
    if (result.count === 0) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, deleted: result.count });
  } catch (error) {
    console.error("Error deleting timetable entry:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
