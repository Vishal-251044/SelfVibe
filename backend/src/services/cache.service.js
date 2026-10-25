/**
 * Small JSON cache: Redis (Upstash) when REDIS_URL is set — shared by every
 * API instance (roadmap Day 7 "cache trending results in Redis") — otherwise
 * an in-process map for development. A cache problem never breaks a request:
 * reads fall back to "miss" and writes are skipped.
 */
import { Redis } from "ioredis";
import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";

const KEY_PREFIX = "selfvibe:cache:";
const memory = new Map(); // key → { value, expiresAt }
let redis = null;

/**
 * Shared Redis client (also used by the rate-limit store, Day 10).
 * @returns {Redis|null} Lazily connected Redis client, or null without REDIS_URL
 */
export function getRedis() {
  if (!env.queue.redisUrl) return null;
  if (!redis) {
    redis = new Redis(env.queue.redisUrl, { maxRetriesPerRequest: 1, lazyConnect: false });
    redis.on("error", (error) => logger.debug(`[Cache] redis error: ${error.message}`));
  }
  return redis;
}

/**
 * Read a cached value.
 * @param {string} key
 * @returns {Promise<any|null>} null on a miss
 */
export async function getCached(key) {
  const client = getRedis();
  if (client) {
    try {
      const raw = await client.get(KEY_PREFIX + key);
      return raw ? JSON.parse(raw) : null;
    } catch (error) {
      logger.warn(`[Cache] read ${key} failed: ${error.message}`);
      return null;
    }
  }
  const entry = memory.get(key);
  if (!entry || entry.expiresAt < Date.now()) {
    memory.delete(key);
    return null;
  }
  return entry.value;
}

/**
 * Store a value for a while.
 * @param {string} key
 * @param {any} value - JSON-serialisable
 * @param {number} ttlSeconds
 * @returns {Promise<void>}
 */
export async function setCached(key, value, ttlSeconds) {
  const client = getRedis();
  if (client) {
    try {
      await client.set(KEY_PREFIX + key, JSON.stringify(value), "EX", ttlSeconds);
    } catch (error) {
      logger.warn(`[Cache] write ${key} failed: ${error.message}`);
    }
    return;
  }
  memory.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
}

/**
 * Forget cached values (e.g. after staff edit genres).
 * @param {...string} keys
 * @returns {Promise<void>}
 */
export async function deleteCached(...keys) {
  keys.forEach((key) => memory.delete(key));
  const client = getRedis();
  if (!client || keys.length === 0) return;
  try {
    await client.del(...keys.map((key) => KEY_PREFIX + key));
  } catch (error) {
    logger.warn(`[Cache] delete ${keys.join(",")} failed: ${error.message}`);
  }
}

/**
 * Cached value, or compute + store it.
 * @template T
 * @param {string} key
 * @param {number} ttlSeconds
 * @param {() => Promise<T>} compute
 * @returns {Promise<T>}
 */
export async function remember(key, ttlSeconds, compute) {
  const cached = await getCached(key);
  if (cached !== null) return cached;
  const value = await compute();
  await setCached(key, value, ttlSeconds);
  return value;
}

/** Close the Redis connection (shutdown). */
export async function closeCache() {
  if (redis) await redis.quit().catch(() => {});
  redis = null;
}
