import { PrismaClient } from "@prisma/client";

// Create a fallback DATABASE_URL for build time if not provided
const getDatabaseUrl = () => {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }
  
  // Fallback for build time - use a dummy PostgreSQL URL
  if (process.env.NODE_ENV !== "production" || process.env.NETLIFY) {
    return "postgresql://dummy:dummy@localhost:5432/dummy?schema=public";
  }
  
  throw new Error("DATABASE_URL is required");
};

export const prisma = globalThis.prisma || new PrismaClient({
  datasources: {
    db: {
      url: getDatabaseUrl(),
    },
  },
});

export const db = prisma;

if (process.env.NODE_ENV !== "production") {
  globalThis.prisma = prisma;
}
// globalThis.prisma: This global variable ensures that the Prisma client instance is
// reused across hot reloads during development. Without this, each time your application
// reloads, a new instance of the Prisma client would be created, potentially leading
// to connection issues.
