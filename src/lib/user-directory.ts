import "server-only";

import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import type { UserSummary } from "@/lib/types";

export const USER_DIRECTORY_TAG = "user-directory";

export const getUserDirectory = unstable_cache(
  async (): Promise<UserSummary[]> => {
    return prisma.user.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, email: true },
    });
  },
  ["user-directory"],
  { tags: [USER_DIRECTORY_TAG] }
);
