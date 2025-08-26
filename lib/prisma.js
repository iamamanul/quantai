import { PrismaClient } from "@prisma/client";

// Require a valid DATABASE_URL across all environments to avoid silent empty DBs
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required (set it to the database that contains your data)");
}

export const prisma = globalThis.prisma || new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
  log: process.env.NODE_ENV === 'production' ? [] : ['warn', 'error'],
});

export const db = prisma;

if (process.env.NODE_ENV !== "production") {
  globalThis.prisma = prisma;
}
// globalThis.prisma: This global variable ensures that the Prisma client instance is
// reused across hot reloads during development. Without this, each time your application
// reloads, a new instance of the Prisma client would be created, potentially leading
// to connection issues.
