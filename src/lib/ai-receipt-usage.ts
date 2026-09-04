import "server-only";

import prisma from "@/lib/prisma";

export const MONTHLY_AI_RECEIPT_LIMIT = 20;

type ReceiptUsageReservation = {
  periodStart: Date;
};

function getCurrentMonthStart() {
  const now = new Date();

  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

export async function reserveAiReceiptParse(
  userId: string,
): Promise<ReceiptUsageReservation> {
  const periodStart = getCurrentMonthStart();

  await prisma.aiReceiptUsage.upsert({
    where: {
      userId_periodStart: {
        userId,
        periodStart,
      },
    },
    create: {
      userId,
      periodStart,
      parseCount: 0,
    },
    update: {},
  });

  const reservation = await prisma.aiReceiptUsage.updateMany({
    where: {
      userId,
      periodStart,
      parseCount: {
        lt: MONTHLY_AI_RECEIPT_LIMIT,
      },
    },
    data: {
      parseCount: {
        increment: 1,
      },
    },
  });

  if (reservation.count === 0) {
    throw new Error(
      `You have used all ${MONTHLY_AI_RECEIPT_LIMIT} AI receipt scans for this month. You can still use the free structured import option.`,
    );
  }

  return { periodStart };
}

export async function releaseAiReceiptParse(
  userId: string,
  reservation: ReceiptUsageReservation,
) {
  await prisma.aiReceiptUsage.update({
    where: {
      userId_periodStart: {
        userId,
        periodStart: reservation.periodStart,
      },
    },
    data: {
      parseCount: {
        decrement: 1,
      },
    },
  });
}
