import { z } from 'zod';

/**
 * Typed, validated access to environment variables.
 *
 * - Required vars throw at server startup with a clear message if missing.
 * - Optional vars have safe defaults.
 * - Validation runs server-side only (client bundle only has NEXT_PUBLIC_ vars).
 *
 * Use this instead of process.env.X directly.
 */

const serverSchema = z.object({
  // GitHub data repo
  GITHUB_REPO_OWNER: z.string().min(1, 'GITHUB_REPO_OWNER is required'),
  GITHUB_REPO_NAME:  z.string().min(1, 'GITHUB_REPO_NAME is required'),
  GITHUB_BRANCH:     z.string().default('main'),
  GITHUB_TOKEN:      z.string().min(1, 'GITHUB_TOKEN is required'),
  // GitHub OAuth
  GITHUB_CLIENT_ID:     z.string().min(1, 'GITHUB_CLIENT_ID is required'),
  GITHUB_CLIENT_SECRET: z.string().min(1, 'GITHUB_CLIENT_SECRET is required'),
  GITHUB_REDIRECT_URI:  z.string().default('http://localhost:3000/api/auth/github/callback'),
  // Cloudflare R2 (optional — upload features degrade gracefully without it)
  R2_ACCOUNT_ID:        z.string().default(''),
  R2_ACCESS_KEY_ID:     z.string().default(''),
  R2_SECRET_ACCESS_KEY: z.string().default(''),
  R2_BUCKET_NAME:       z.string().default(''),
  // Runtime
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

const clientSchema = z.object({
  NEXT_PUBLIC_SITE_URL:                       z.string().default('http://localhost:3000'),
  NEXT_PUBLIC_OPEN_SOURCE_3D_ASSETS_RAW_BASE: z.string().default(''),
  NEXT_PUBLIC_POLYGON_MODELS_RAW_BASE:        z.string().default(''),
});

// Validate server vars at module load — only on the server.
// Throws immediately with a clear list of missing/invalid vars.
if (typeof window === 'undefined') {
  const result = serverSchema.safeParse(process.env);
  if (!result.success) {
    const errors = Object.entries(result.error.flatten().fieldErrors)
      .map(([key, msgs]) => `  ${key}: ${msgs?.join(', ')}`)
      .join('\n');
    throw new Error(`\n❌ Invalid environment variables:\n${errors}\n`);
  }
}

const clientResult = clientSchema.safeParse({
  NEXT_PUBLIC_SITE_URL:                       process.env.NEXT_PUBLIC_SITE_URL,
  NEXT_PUBLIC_OPEN_SOURCE_3D_ASSETS_RAW_BASE: process.env.NEXT_PUBLIC_OPEN_SOURCE_3D_ASSETS_RAW_BASE,
  NEXT_PUBLIC_POLYGON_MODELS_RAW_BASE:        process.env.NEXT_PUBLIC_POLYGON_MODELS_RAW_BASE,
});
const clientEnv = clientResult.success ? clientResult.data : {
  NEXT_PUBLIC_SITE_URL:                       'http://localhost:3000',
  NEXT_PUBLIC_OPEN_SOURCE_3D_ASSETS_RAW_BASE: '',
  NEXT_PUBLIC_POLYGON_MODELS_RAW_BASE:        '',
};

export const env = {
  github: {
    repoOwner:    process.env.GITHUB_REPO_OWNER    ?? '',
    repoName:     process.env.GITHUB_REPO_NAME     ?? '',
    branch:       process.env.GITHUB_BRANCH        ?? 'main',
    token:        process.env.GITHUB_TOKEN         ?? '',
    clientId:     process.env.GITHUB_CLIENT_ID     ?? '',
    clientSecret: process.env.GITHUB_CLIENT_SECRET ?? '',
    redirectUri:  process.env.GITHUB_REDIRECT_URI  ?? 'http://localhost:3000/api/auth/github/callback',
  },
  r2: {
    accountId:       process.env.R2_ACCOUNT_ID        ?? '',
    accessKeyId:     process.env.R2_ACCESS_KEY_ID     ?? '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? '',
    bucketName:      process.env.R2_BUCKET_NAME       ?? '',
  },
  siteUrl: clientEnv.NEXT_PUBLIC_SITE_URL,
  isDev:   process.env.NODE_ENV === 'development',
  isProd:  process.env.NODE_ENV === 'production',
} as const;
