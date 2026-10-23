/**
 * Background job queue — the single entry point for enqueuing work.
 * BullMQ + Redis when REDIS_URL is set; an in-process queue otherwise
 * (development only — production refuses to start without Redis).
 */
import { env } from "../../config/env.js";
import { bullmqQueue } from "./bullmq.driver.js";
import { memoryQueue } from "./memory.driver.js";

export const queue = env.queue.driver === "bullmq" ? bullmqQueue : memoryQueue;
