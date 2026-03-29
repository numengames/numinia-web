/**
 * Typed, centralised access to environment variables.
 * Use this instead of process.env.X directly so that missing vars
 * are caught in one place and refactoring is easier.
 */
export const env = {
  github: {
    repoOwner: process.env.GITHUB_REPO_OWNER ?? '',
    repoName: process.env.GITHUB_REPO_NAME ?? '',
    branch: process.env.GITHUB_BRANCH ?? 'main',
    token: process.env.GITHUB_TOKEN ?? '',
    clientId: process.env.GITHUB_CLIENT_ID ?? '',
    clientSecret: process.env.GITHUB_CLIENT_SECRET ?? '',
    redirectUri: process.env.GITHUB_REDIRECT_URI ?? '',
  },
  r2: {
    accountId: process.env.R2_ACCOUNT_ID ?? '',
    accessKeyId: process.env.R2_ACCESS_KEY_ID ?? '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? '',
    bucketName: process.env.R2_BUCKET_NAME ?? '',
  },
  isDev: process.env.NODE_ENV === 'development',
  isProd: process.env.NODE_ENV === 'production',
} as const;
