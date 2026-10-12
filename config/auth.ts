import { normalizeApiBase } from '../src/utils/Auth/apiBoundary';

/** No environment reads or side effects: both build targets consume the same validated mode. */
export const resolveAuthConfig = (env: Record<string, string | undefined>) => {
  const value = env.UMI_APP_DEMO_MODE;
  if (value !== undefined && value !== 'true' && value !== 'false') {
    throw new Error('UMI_APP_DEMO_MODE must be true or false');
  }
  const demoMode = value === 'true';
  const configuredBase = env.UMI_APP_API_BASE;
  if (demoMode && configuredBase !== undefined) {
    throw new Error('Demo mode and UMI_APP_API_BASE cannot be configured together');
  }
  const apiBase = configuredBase === undefined ? undefined : normalizeApiBase(configuredBase);
  if (!demoMode && !apiBase && env.NODE_ENV === 'production') {
    throw new Error('Production requires UMI_APP_API_BASE or explicit UMI_APP_DEMO_MODE=true');
  }
  return { demoMode, apiBase };
};
