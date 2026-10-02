/**
 * BiteBeforeExpiry — First-Expired, First-Out (FEFO) & USE-FIRST Priority Engine
 * 
 * Provides:
 * - Deterministic USE-FIRST prioritization:
 *     HIGH PRIORITY: Expires in 1 day
 *     MEDIUM PRIORITY: Expires in 3 days
 *     LOW PRIORITY: Expires in 7+ days
 *     EXPIRED: Strictly marked as EXPIRED (Never recommended for consumption!)
 * - FEFO Stock Dispatch Sorting for Businesses (Supermarkets, Restaurants)
 * - Safe consumption rules preventing consumption of expired food or medicine
 */

export const USE_FIRST_PRIORITIES = {
  EXPIRED: 'EXPIRED',
  HIGH: 'HIGH',       // 1 day
  MEDIUM: 'MEDIUM',   // 2-3 days
  LOW: 'LOW',         // 4-7 days
  SAFE: 'SAFE'        // > 7 days
};

export function calculateDaysRemaining(expiryDateStr) {
  if (!expiryDateStr) return null;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const exp = new Date(expiryDateStr);
  exp.setHours(0, 0, 0, 0);
  if (isNaN(exp.getTime())) return null;
  return Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Assigns USE-FIRST priority based on exact days remaining
 */
export function determineUseFirstPriority(expiryDateStr, productType = 'grocery') {
  const days = calculateDaysRemaining(expiryDateStr);
  if (days === null) {
    return {
      priority: USE_FIRST_PRIORITIES.SAFE,
      daysRemaining: null,
      label: 'Undated Item',
      badgeClass: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-300',
      actionPrompt: 'Verify printed date on package',
      isSafeToConsume: true,
      isExpired: false
    };
  }

  if (days <= 0) {
    return {
      priority: USE_FIRST_PRIORITIES.EXPIRED,
      daysRemaining: days,
      label: days === 0 ? 'Expires Today' : `Expired ${Math.abs(days)}d Ago`,
      badgeClass: 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border-rose-300 dark:border-rose-800',
      actionPrompt: productType === 'medicine' 
        ? 'DO NOT INGEST — Follow pharmaceutical safe disposal protocol' 
        : 'DO NOT CONSUME — Unsafe for consumption. Compost or discard safely.',
      isSafeToConsume: false,
      isExpired: true
    };
  }

  if (days === 1) {
    return {
      priority: USE_FIRST_PRIORITIES.HIGH,
      daysRemaining: days,
      label: 'High Priority: Expires in 1 Day',
      badgeClass: 'bg-red-100 text-red-900 dark:bg-red-950/80 dark:text-red-300 border-red-300 dark:border-red-800 animate-pulse',
      actionPrompt: 'Use First Today — Prepare meal or store in freezer immediately',
      isSafeToConsume: true,
      isExpired: false
    };
  }

  if (days <= 3) {
    return {
      priority: USE_FIRST_PRIORITIES.MEDIUM,
      daysRemaining: days,
      label: `Medium Priority: Expires in ${days} Days`,
      badgeClass: 'bg-amber-100 text-amber-900 dark:bg-amber-950/80 dark:text-amber-300 border-amber-300 dark:border-amber-800',
      actionPrompt: 'Plan into upcoming meals this week',
      isSafeToConsume: true,
      isExpired: false
    };
  }

  if (days <= 7) {
    return {
      priority: USE_FIRST_PRIORITIES.LOW,
      daysRemaining: days,
      label: `Low Priority: Expires in ${days} Days`,
      badgeClass: 'bg-yellow-100 text-yellow-900 dark:bg-yellow-950/80 dark:text-yellow-300 border-yellow-300 dark:border-yellow-800',
      actionPrompt: 'Fresh and safe — Monitor shelf life',
      isSafeToConsume: true,
      isExpired: false
    };
  }

  return {
    priority: USE_FIRST_PRIORITIES.SAFE,
    daysRemaining: days,
    label: `Safe: ${days} Days Remaining`,
    badgeClass: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950/80 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800',
    actionPrompt: 'Optimal freshness',
    isSafeToConsume: true,
    isExpired: false
  };
}

/**
 * First-Expired, First-Out (FEFO) Sort Engine
 * Returns items ranked strictly by nearest valid expiry date
 */
export function sortInventoryByFefo(items = []) {
  return [...items].sort((a, b) => {
    const daysA = calculateDaysRemaining(a.expiryDate || a.expiry_date);
    const daysB = calculateDaysRemaining(b.expiryDate || b.expiry_date);

    // Active unexpired items with earliest expiry come first
    if (daysA === null && daysB === null) return 0;
    if (daysA === null) return 1;
    if (daysB === null) return -1;

    // Both expired: order by most recently expired
    if (daysA <= 0 && daysB <= 0) return daysB - daysA;
    // Put expired at the very bottom of active dispatch queue (never dispatch expired stock!)
    if (daysA <= 0) return 1;
    if (daysB <= 0) return -1;

    return daysA - daysB;
  });
}
