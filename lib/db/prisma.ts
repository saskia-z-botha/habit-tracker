import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

function createPrismaClient() {
  // During build, DATABASE_URL may not be set — return a stub that errors at runtime
  const url = process.env.DATABASE_URL;
  if (!url) {
    // Return a client that will fail only when actually used at runtime
    const adapter = new PrismaPg({ connectionString: "postgresql://localhost/placeholder" });
    return new PrismaClient({ adapter });
  }
  const adapter = new PrismaPg({ connectionString: url });
  return new PrismaClient({ adapter });
}

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma || createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
