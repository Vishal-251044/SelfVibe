/**
 * Allow the web app to upload audio and covers straight to the R2 / S3 bucket
 * (browsers need a CORS rule on the bucket for signed PUT uploads).
 * Run once after creating the bucket: npm run storage:cors
 *
 * Allowed origins come from CLIENT_URL (comma-separated) in backend/.env.
 */
import { env } from "../src/config/env.js";
import { applyBucketCors } from "../src/services/storage/s3.driver.js";
import { logger } from "../src/utils/logger.js";

/** @returns {Promise<void>} */
async function run() {
  if (!env.storage.s3.isConfigured) {
    throw new Error(
      "S3 storage is not configured — set S3_BUCKET, S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY (and S3_ENDPOINT for R2) in backend/.env"
    );
  }
  await applyBucketCors(env.clientUrls);
  logger.info(
    `[StorageCors] bucket "${env.storage.s3.bucket}" now accepts uploads from: ${env.clientUrls.join(", ")}`
  );
}

run()
  .then(() => process.exit(0))
  .catch((error) => {
    logger.error(`[StorageCors] ${error.message}`);
    process.exit(1);
  });
