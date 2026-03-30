/**
 * Centralized Cloudflare R2 (S3-compatible) client.
 * Used by presigned upload, asset deletion, and thumbnail upload.
 * All R2 env vars are optional — the system falls back to GitHub storage.
 */
import { S3Client } from '@aws-sdk/client-s3';
import { env } from '@/lib/env';

/** Whether R2 storage is configured (all four env vars must be non-empty) */
export function isR2Configured(): boolean {
  return !!(env.r2.accountId && env.r2.accessKeyId && env.r2.secretAccessKey && env.r2.bucketName);
}

let _client: S3Client | null = null;

/** Get the shared S3Client for R2. Throws if R2 is not configured. */
export function getR2Client(): S3Client {
  if (!isR2Configured()) {
    throw new Error('R2 storage is not configured. Set R2_* environment variables.');
  }
  if (!_client) {
    _client = new S3Client({
      region: 'auto',
      endpoint: `https://${env.r2.accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: env.r2.accessKeyId,
        secretAccessKey: env.r2.secretAccessKey,
      },
    });
  }
  return _client;
}

/** Get the R2 bucket name from env */
export function getR2BucketName(): string {
  return env.r2.bucketName;
}

/** Get the public URL base for R2 objects */
export function getR2PublicUrl(): string {
  return env.r2.publicUrl || `https://${env.r2.bucketName}.r2.dev`;
}
