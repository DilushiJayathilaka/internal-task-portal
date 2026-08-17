// Promotes an existing user to ADMIN. There's no self-service "become an
// admin" button in the app on purpose - a user granting themselves elevated
// permissions is exactly the kind of privilege escalation the ownership
// checks in app/api/tasks are there to prevent. Promotion is a deliberate,
// out-of-band action instead: run this script (needs direct database
// access), or flip the `role` column via `npm run db:studio`.
//
// Usage: npm run make-admin -- someone@example.com
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/lib/generated/prisma/client";

const email = process.argv[2];

if (!email) {
  console.error("Usage: npm run make-admin -- <email>");
  process.exit(1);
}

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    console.error(`No user found with email "${email}". They need to sign up first.`);
    process.exitCode = 1;
    return;
  }

  if (user.role === "ADMIN") {
    console.log(`${email} is already an ADMIN.`);
    return;
  }

  await prisma.user.update({ where: { email }, data: { role: "ADMIN" } });
  console.log(`${email} is now an ADMIN. They'll need to log out and back in for it to take effect.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
