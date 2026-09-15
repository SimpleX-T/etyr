import type { Stats } from '../shared/types';
import { getStorageItem, setStorageItem } from './database';
import { STORAGE_KEYS } from '../shared/constants';

const DEFAULT_STATS: Stats = {
  streakDays: 0,
  lastReviewDate: 0,
  wordsReviewedToday: 0,
};

function getStartOfDay(timestamp: number): number {
  const d = new Date(timestamp);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export async function getStats(): Promise<Stats> {
  const stats = (await getStorageItem(STORAGE_KEYS.STATS)) || DEFAULT_STATS;
  
  // If the last review was more than 1 day ago (not yesterday or today), streak resets.
  const now = Date.now();
  const today = getStartOfDay(now);
  const lastReview = getStartOfDay(stats.lastReviewDate);
  
  if (lastReview < today - 86400000) {
    stats.streakDays = 0;
    stats.wordsReviewedToday = 0;
    await setStorageItem(STORAGE_KEYS.STATS, stats);
  } else if (lastReview < today) {
    // New day, reset today's count, but keep streak.
    stats.wordsReviewedToday = 0;
    await setStorageItem(STORAGE_KEYS.STATS, stats);
  }
  
  return stats;
}

export async function recordReviewActivity(): Promise<Stats> {
  const stats = await getStats();
  const now = Date.now();
  const today = getStartOfDay(now);
  const lastReview = getStartOfDay(stats.lastReviewDate);
  
  if (lastReview < today) {
    // First review of the day! Increment streak.
    stats.streakDays += 1;
    stats.wordsReviewedToday = 1;
  } else {
    stats.wordsReviewedToday += 1;
  }
  
  stats.lastReviewDate = now;
  await setStorageItem(STORAGE_KEYS.STATS, stats);
  return stats;
}
