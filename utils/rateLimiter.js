/**
 * Token-bucket rate limiter per userId + event.
 * On horizontal scale: replace the Map with a Redis sliding window.
 *
 * @example
 *   const limiter = createRateLimiter({ windowMs: 1000, max: 5 });
 *   if (!limiter.allow(socket.userId, 'chat:message')) {
 *     return emitError(socket, 'RATE_LIMITED', 'Slow down');
 *   }
 */

/**
 * @param {Object} opts
 * @param {number} opts.windowMs  - Time window in milliseconds
 * @param {number} opts.max       - Max events allowed in window
 * @returns {{ allow: (id: string, event: string) => boolean, cleanup: () => void }}
 */
const createRateLimiter = ({ windowMs, max }) => {
  /** @type {Map<string, number[]>} key → array of timestamps */
  const store = new Map();

  // Prune stale entries every windowMs to prevent memory leak
  const pruneInterval = setInterval(() => {
    const cutoff = Date.now() - windowMs;
    for (const [key, timestamps] of store) {
      const fresh = timestamps.filter(t => t > cutoff);
      if (fresh.length === 0) store.delete(key);
      else store.set(key, fresh);
    }
  }, windowMs);

  pruneInterval.unref(); // Don't block process exit

  return {
    /**
     * @param {string} userId
     * @param {string} event
     * @returns {boolean} true = allowed, false = rate limited
     */
    allow(userId, event) {
      const key = `${userId}:${event}`;
      const now = Date.now();
      const cutoff = now - windowMs;
      const timestamps = (store.get(key) ?? []).filter(t => t > cutoff);
      if (timestamps.length >= max) return false;
      timestamps.push(now);
      store.set(key, timestamps);
      return true;
    },

    /** Call on server shutdown */
    cleanup() {
      clearInterval(pruneInterval);
    },
  };
};

// ─── Pre-configured limiters per concern ──────────────────────────────────────

const limiters = {
  chat:      createRateLimiter({ windowMs: 1_000,  max: 3  }), // 3 msgs/sec
  click:     createRateLimiter({ windowMs: 1_000,  max: 20 }), // 20 clicks/sec
  cursor:    createRateLimiter({ windowMs: 50,     max: 1  }), // 20 fps max
  auth:      createRateLimiter({ windowMs: 60_000, max: 5  }), // 5 auth attempts/min
  upgrade:   createRateLimiter({ windowMs: 5_000,  max: 2  }), // 2 upgrade calls/5s
};

module.exports = { createRateLimiter, limiters };
