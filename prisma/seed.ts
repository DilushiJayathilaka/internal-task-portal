// Optional demo data so a fresh clone has something to look at immediately
// instead of an empty task list. Safe to run multiple times (upserts by
// email). Run with: npm run db:seed
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/lib/generated/prisma/client";
import bcrypt from "bcryptjs";

// Unlike Next.js (which loads .env itself) and prisma.config.ts (which
// imports "dotenv/config" too), this script runs standalone via `tsx`, so
// .env has to be loaded explicitly before reading DATABASE_URL below.
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const DEMO_PASSWORD = "Demo1234!";

async function main() {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);

  // Three accounts covering each role in the Part 2 workflow: demo@ creates
  // and owns tasks, assignee@ does the work and uploads evidence, admin@
  // reviews it. Seeding an admin directly is fine here - this script only
  // ever runs from a trusted developer/CI context, unlike the deliberately
  // absent in-app self-service "become admin" flow (see README "Managing
  // user roles").
  const [owner, assignee] = await Promise.all([
    prisma.user.upsert({
      where: { email: "demo@example.com" },
      update: {},
      create: { name: "Demo User", email: "demo@example.com", passwordHash, role: "USER" },
    }),
    prisma.user.upsert({
      where: { email: "assignee@example.com" },
      update: {},
      create: { name: "Alex Assignee", email: "assignee@example.com", passwordHash, role: "USER" },
    }),
    prisma.user.upsert({
      where: { email: "admin@example.com" },
      update: {},
      create: { name: "Ada Admin", email: "admin@example.com", passwordHash, role: "ADMIN" },
    }),
  ]);

  const existingTasks = await prisma.task.count({ where: { ownerId: owner.id } });
  if (existingTasks === 0) {
    await prisma.task.createMany({
      data: [
        {
          title: "Set up project repository",
          description: "Initialize the repo, configure linting, and add CI.",
          status: "DONE",
          ownerId: owner.id,
          assigneeId: owner.id,
        },
        {
          title: "Design task data model",
          description: "Decide on status values and ownership rules.",
          status: "DONE",
          ownerId: owner.id,
          assigneeId: owner.id,
        },
        {
          title: "Build authentication flow",
          description: "Signup, login, logout, and route protection.",
          status: "IN_PROGRESS",
          ownerId: owner.id,
          assigneeId: assignee.id,
        },
        {
          title: "Implement task CRUD API",
          description: "Route handlers for create, update, delete.",
          status: "IN_PROGRESS",
          ownerId: owner.id,
          assigneeId: assignee.id,
        },
        {
          title: "Write README and setup docs",
          status: "TODO",
          ownerId: owner.id,
        },
      ],
    });
  }

  console.log(`Seed complete. Logins (password "${DEMO_PASSWORD}" for all):`);
  console.log("  demo@example.com      - creates/owns tasks");
  console.log("  assignee@example.com  - does the work, uploads evidence");
  console.log("  admin@example.com     - reviews evidence, approves completion");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
