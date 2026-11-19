const BEST_KEY = 'bauble-blast-standalone-best-v1';

export type Result = {
  score: number;
  best: number;
  newBest: boolean;
  survived: number;
};

export function readBest() {
  try {
    const score = Number(localStorage.getItem(BEST_KEY));
    return Number.isSafeInteger(score) && score >= 0 ? score : 0;
  } catch {
    return 0;
  }
}

export function saveBest(score: number) {
  try {
    localStorage.setItem(BEST_KEY, String(Math.max(readBest(), score)));
  } catch {
    // The game keeps the high score in memory when storage is unavailable.
  }
}
