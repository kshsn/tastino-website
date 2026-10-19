import { PrismaClient } from '@prisma/client';

// One client per process (dev hot reload would otherwise open a new pool on every change).
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db;
