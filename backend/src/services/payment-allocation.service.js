import prisma from '../config/prisma.js';

/**
 * Keeps PaymentSchedule rows in step with the TripPayment rows for a trip.
 *
 * Rather than tracking which payment settled which instalment, the total cash
 * received is re-spread over the instalments oldest-due-first every time
 * payments change. That makes the operation idempotent, so it is equally
 * correct after a payment is added, edited or deleted.
 */
export const syncSchedulesForTrip = async (itineraryId, client = prisma) => {
  const [payments, schedules] = await Promise.all([
    client.tripPayment.findMany({
      where: { itineraryId },
      select: { amount: true },
    }),
    client.paymentSchedule.findMany({
      where: { itineraryId },
      orderBy: [{ dueDate: 'asc' }, { createdAt: 'asc' }],
    }),
  ]);

  if (schedules.length === 0) return [];

  let remaining = payments.reduce((sum, p) => sum + p.amount, 0);
  const updates = [];

  for (const schedule of schedules) {
    // A waived instalment is settled by decision, not by cash.
    if (schedule.status === 'WAIVED') continue;

    const applied = Math.min(remaining, schedule.amount);
    remaining -= applied;

    const status = applied >= schedule.amount ? 'PAID' : applied > 0 ? 'PARTIAL' : 'PENDING';

    if (applied !== schedule.paidAmount || status !== schedule.status) {
      updates.push(
        client.paymentSchedule.update({
          where: { id: schedule.id },
          data: { paidAmount: applied, status },
        })
      );
    }
  }

  if (updates.length) await Promise.all(updates);

  return client.paymentSchedule.findMany({
    where: { itineraryId },
    orderBy: [{ dueDate: 'asc' }, { createdAt: 'asc' }],
  });
};

/**
 * Outstanding customer balance for a trip: trip cost minus cash received.
 * Schedules describe *when* money is due, not how much the trip costs, so the
 * headline balance is always derived from totalCost.
 */
export const tripBalance = (totalCost, payments = []) => {
  const paid = payments.reduce((sum, p) => sum + p.amount, 0);
  return {
    totalPaid: paid,
    balance: Math.max(0, (totalCost || 0) - paid),
  };
};
