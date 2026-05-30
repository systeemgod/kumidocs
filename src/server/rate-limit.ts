/**
 * Per-user in-memory sliding-window rate limiter.
 *
 * Usage:
 *   const limiter = new RateLimiter(30, 10_000);
 *   if (!limiter.check(userId)) {
 *     return new Response("Too many requests", { status: 429 });
 *   }
 *
 * A cleanup timer prunes stale entries every 60s to prevent memory leaks.
 */

const CLEANUP_INTERVAL_MS = 60_000;

interface Bucket {
  /** Monotonically-increasing timestamps of recent requests (ms). */
  timestamps: number[];
}

class RateLimiter {
  private readonly store = new Map<string, Bucket>();
  private readonly maxRequests: number;
  private readonly windowMs: number;
  private cleanupTimer: ReturnType<typeof setInterval> | undefined;

  /**
   * @param maxRequests  Max number of requests allowed within the window.
   * @param windowMs     Window duration in milliseconds.
   */
  public constructor(maxRequests: number, windowMs: number) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  /** Start the periodic cleanup timer. Call once at server startup. */
  public startCleanup(): void {
    if (this.cleanupTimer !== undefined) {
      return;
    }
    this.cleanupTimer = setInterval(() => {
      this.prune();
    }, CLEANUP_INTERVAL_MS);
  }

  /** Stop the cleanup timer. */
  public stopCleanup(): void {
    if (this.cleanupTimer !== undefined) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }
  }

  /**
   * Check and record a request for the given key (e.g. user id).
   * Returns `true` if the request is allowed, `false` if rate-limited.
   */
  public check(key: string): boolean {
    const now = Date.now();
    let bucket = this.store.get(key);
    if (bucket === undefined) {
      bucket = { timestamps: [] };
      this.store.set(key, bucket);
    }
    // Drop timestamps outside the current window
    const cutoff = now - this.windowMs;
    bucket.timestamps = bucket.timestamps.filter((ts) => ts >= cutoff);

    if (bucket.timestamps.length >= this.maxRequests) {
      return false;
    }
    bucket.timestamps.push(now);
    return true;
  }

  /** Remove stale entries to prevent unbounded memory growth. */
  private prune(): void {
    const now = Date.now();
    const cutoff = now - this.windowMs;
    for (const [key, bucket] of this.store) {
      bucket.timestamps = bucket.timestamps.filter((ts) => ts >= cutoff);
      if (bucket.timestamps.length === 0) {
        this.store.delete(key);
      }
    }
  }
}

export default RateLimiter;
