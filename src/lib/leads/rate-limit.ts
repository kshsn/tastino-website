// Sliding-window rate limit kept in the memory of the server process (the site runs as one PM2 process).
// It stores only a short-lived counter per address, never the lead or any personal data.

export interface LimitResult {
  allowed: boolean;
  /** Seconds until another request would be accepted (0 when allowed). */
  retryAfterSec: number;
}

export class SlidingWindowLimiter {
  private hits = new Map<string, number[]>();

  constructor(
    private readonly limit: number,
    private readonly windowMs: number,
    private readonly now: () => number = Date.now,
  ) {}

  /** Records a request for `key` and says whether it is within the limit. A refused request is not counted. */
  hit(key: string): LimitResult {
    const t = this.now();
    const recent = (this.hits.get(key) ?? []).filter((x) => t - x < this.windowMs);
    if (recent.length >= this.limit) {
      this.hits.set(key, recent);
      return { allowed: false, retryAfterSec: Math.max(1, Math.ceil((recent[0] + this.windowMs - t) / 1000)) };
    }
    recent.push(t);
    this.hits.set(key, recent);
    if (this.hits.size > 5000) this.prune(t);
    return { allowed: true, retryAfterSec: 0 };
  }

  /** Forgets addresses with no recent request, so memory cannot grow without bound. */
  private prune(t: number) {
    for (const [k, v] of this.hits) if (v.every((x) => t - x >= this.windowMs)) this.hits.delete(k);
  }
}

const TEN_MINUTES = 10 * 60 * 1000;

/** At most 5 accepted submissions per address per 10 minutes (US-006.3). */
export const submissionLimiter = new SlidingWindowLimiter(5, TEN_MINUTES);

/** A looser limit on every POST (valid or not), so garbage requests cannot keep the server busy. */
export const requestLimiter = new SlidingWindowLimiter(30, TEN_MINUTES);

/** At most 3 accepted requests per email address per day: stops the auto-reply being aimed at one person. */
export const recipientLimiter = new SlidingWindowLimiter(3, 24 * 60 * 60 * 1000);
