import packageJson from '../package.json';

/**
 * Contrato estável do endpoint GET /api/version.
 * Metadados vêm de variáveis de ambiente no deploy (CI) com fallbacks documentados.
 */
export type VersionStatusResponse = {
  app: string;
  version: string;
  commitSha: string;
  buildTime: string;
  environment: string;
};

function normalizeEnvironment(): string {
  const explicit = process.env.APP_ENV?.trim().toLowerCase();
  if (explicit) {
    if (explicit === 'development') return 'dev';
    if (explicit === 'production') return 'prod';
    return explicit;
  }

  const vercelEnv = process.env.VERCEL_ENV?.toLowerCase();
  if (vercelEnv === 'production') return 'prod';
  if (vercelEnv === 'preview') return 'test';
  if (vercelEnv === 'development') return 'dev';

  const node = process.env.NODE_ENV?.toLowerCase();
  if (node === 'production') return 'prod';
  if (node === 'test') return 'test';
  return 'dev';
}

function resolveCommitSha(): string {
  const candidates = [
    process.env.GIT_COMMIT_SHA,
    process.env.VERCEL_GIT_COMMIT_SHA,
    process.env.GITHUB_SHA,
  ].filter(Boolean) as string[];

  const raw = candidates[0]?.trim();
  if (!raw) return 'unknown';
  return raw;
}

function resolveVersion(): string {
  return (
    process.env.APP_VERSION?.trim() ||
    process.env.npm_package_version?.trim() ||
    packageJson.version ||
    '0.0.0'
  );
}

function resolveBuildTime(): string {
  const fromEnv = process.env.BUILD_TIME?.trim();
  if (fromEnv) return fromEnv;

  if (process.env.NODE_ENV !== 'production') {
    return new Date().toISOString();
  }

  return 'unknown';
}

export function getVersionMetadata(): VersionStatusResponse {
  return {
    app: process.env.APP_NAME?.trim() || packageJson.name || 'app',
    version: resolveVersion(),
    commitSha: resolveCommitSha(),
    buildTime: resolveBuildTime(),
    environment: normalizeEnvironment(),
  };
}
