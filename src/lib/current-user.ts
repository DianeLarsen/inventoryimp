import "server-only";

import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";

export async function requireCurrentUserId() {
  const { userId } = await auth();

  if (!userId) {
    throw new Error("Not authenticated");
  }

  await prisma.user.upsert({
    where: { id: userId },
    create: { id: userId },
    update: {},
  });

  return userId;
}
