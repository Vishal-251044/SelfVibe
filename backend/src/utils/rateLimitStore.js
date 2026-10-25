/**
 * Redis store for express-rate-limit (roadmap Day 10 security review): with
 * REDIS_URL set, every API instance shares the same counters, so limits like
 * "5 sign-in attempts / 15 min" hold however many instances run. Without
 * Redis the limiter keeps its default in-memory store (development).
 *
 * Each counter is one Redis key with a TTL of the window (fixed window, like
 * the default memory store). One small Lua script increments and reads the
 * TTL atomically.
 */
import { getRedis } from "../services/cache.service.js";

const KEY_PREFIX = "selfvibe:rl:";
const INCREMENT_SCRIPT = `
local hits = redis.call("INCR", KEYS[1])
if hits == 1 then redis.call("PEXPIRE", KEYS[1], ARGV[1]) end
local ttl = redis.call("PTTL", KEYS[1])
if ttl < 0 then redis.call("PEXPIRE", KEYS[1], ARGV[1]); ttl = tonumber(ARGV[1]) end
return { hits, ttl }`;

/** express-rate-limit Store backed by Redis. */
export class RedisRateLimitStore {
  /**
   * @param {string} name - Limiter name; keeps each limiter's keys apart
   * @param {import("ioredis").Redis} client
   */
  constructor(name, client) {
    this.prefix = `${KEY_PREFIX}${name}:`;
    this.client = client;
    this.windowMs = 60_000;
    this.localKeys = false; // counters live outside this process
  }

  /** @param {{ windowMs: number }} options - Passed by express-rate-limit */
  init(options) {
    this.windowMs = options.windowMs;
  }

  /**
   * @param {string} key
   * @returns {Promise<{ totalHits: number, resetTime: Date }>}
   */
  async increment(key) {
    const [totalHits, ttlMs] = await this.client.eval(
      INCREMENT_SCRIPT,
      1,
      this.prefix + key,
      String(this.windowMs)
    );
    return { totalHits: Number(totalHits), resetTime: new Date(Date.now() + Number(ttlMs)) };
  }

  /**
   * @param {string} key
   * @returns {Promise<{ totalHits: number, resetTime: Date }|undefined>}
   */
  async get(key) {
    const [hits, ttlMs] = await Promise.all([
      this.client.get(this.prefix + key),
      this.client.pttl(this.prefix + key),
    ]);
    if (hits === null) return undefined;
    return { totalHits: Number(hits), resetTime: new Date(Date.now() + Math.max(0, ttlMs)) };
  }

  /** @param {string} key - Undo one hit (used with skipSuccessfulRequests) */
  async decrement(key) {
    await this.client.decr(this.prefix + key);
  }

  /** @param {string} key */
  async resetKey(key) {
    await this.client.del(this.prefix + key);
  }
}

/**
 * A Redis store for one limiter, or undefined to keep the memory store.
 * @param {string} name
 * @returns {RedisRateLimitStore|undefined}
 */
export function createRateLimitStore(name) {
  const client = getRedis();
  return client ? new RedisRateLimitStore(name, client) : undefined;
}
