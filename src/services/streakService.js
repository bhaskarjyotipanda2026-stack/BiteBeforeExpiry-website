import confetti from 'canvas-confetti';
import { BADGES_DEFINITION } from '../constants';

/**
 * Triggers confetti celebration
 */
export function triggerCelebration(type = 'default') {
  try {
    if (type === 'badge') {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#10b981', '#f59e0b', '#3b82f6', '#ec4899', '#8b5cf6']
      });
    } else if (type === 'used') {
      confetti({
        particleCount: 60,
        spread: 60,
        origin: { y: 0.7 },
        colors: ['#10b981', '#34d399', '#6ee7b7']
      });
    } else {
      confetti({
        particleCount: 40,
        spread: 50,
        origin: { y: 0.8 }
      });
    }
  } catch (_) {}
}

/**
 * Updates streak when an item is scanned or added
 */
export function calculateUpdatedStreak(currentStats) {
  const today = new Date().toISOString().split('T')[0];
  const lastScan = currentStats.lastScanDate;

  let newCurrentStreak = currentStats.currentStreak || 0;
  let newLongestStreak = currentStats.longestStreak || 0;

  if (!lastScan) {
    newCurrentStreak = 1;
  } else if (lastScan === today) {
    // Already scanned today, keep streak
    newCurrentStreak = Math.max(1, newCurrentStreak);
  } else {
    const todayDate = new Date(today);
    const lastDate = new Date(lastScan);
    const diffTime = todayDate.getTime() - lastDate.getTime();
    const diffDays = Math.round(diffTime / (1000 * 3600 * 24));

    if (diffDays === 1) {
      // Scanned yesterday -> continue streak
      newCurrentStreak += 1;
    } else {
      // Missed more than 1 day -> reset streak to 1
      newCurrentStreak = 1;
    }
  }

  if (newCurrentStreak > newLongestStreak) {
    newLongestStreak = newCurrentStreak;
  }

  return {
    currentStreak: newCurrentStreak,
    longestStreak: newLongestStreak,
    lastScanDate: today
  };
}

/**
 * Checks and unlocks badges
 * Returns { updatedBadges, newBadgesUnlocked }
 */
export function checkAndUnlockBadges(stats, items) {
  const currentEarned = new Set(stats.badgesEarned || []);
  const newlyUnlocked = [];

  for (const badge of BADGES_DEFINITION) {
    if (!currentEarned.has(badge.id)) {
      if (badge.check(stats, items)) {
        currentEarned.add(badge.id);
        newlyUnlocked.push(badge);
      }
    }
  }

  if (newlyUnlocked.length > 0) {
    triggerCelebration('badge');
  }

  return {
    badgesEarned: Array.from(currentEarned),
    newlyUnlocked
  };
}
