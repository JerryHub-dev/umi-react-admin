import { DEMO_MODE } from '@/demo/mode';
import { verifyDemoToken } from '@/demo/token';
import { clearDemoToken, saveDemoToken } from '@/utils/Auth/session';
import { BizError } from '@/utils/BizError';
import { t } from '@/utils/i18n';
import { api } from './client';
import type { CurrentUser, LoginResult } from './types';

export type { CurrentUser, LoginResult } from './types';

export interface LoginParams {
  name: string;
  password: string;
}

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;

/** A successful HTTP response alone cannot establish an authenticated UI state. */
const currentUser = (value: unknown): CurrentUser => {
  if (
    !isRecord(value) ||
    typeof value.name !== 'string' ||
    !value.name.trim() ||
    value.name.length > 256 ||
    /[\u0000-\u001f\u007f]/.test(value.name) ||
    typeof value.email !== 'string' ||
    (value.nickName !== undefined && typeof value.nickName !== 'string') ||
    (value.role !== undefined && typeof value.role !== 'string')
  ) {
    throw new BizError({ message: t('login.invalidSession') });
  }
  return { name: value.name, email: value.email, nickName: value.nickName, role: value.role };
};

/** Real mode authenticates with a server cookie; the plaintext demo bearer stays in the current browser tab. */
export const login = async (params: LoginParams): Promise<LoginResult> => {
  const result = await api<unknown>('/api/v1/login', { method: 'POST', data: params, skipErrorHandler: true });
  const user = currentUser(isRecord(result) ? result.user : undefined);
  if (DEMO_MODE) {
    const token = isRecord(result) && typeof result.token === 'string' ? result.token : '';
    if (!verifyDemoToken(token)) throw new BizError({ message: t('login.invalidSession') });
    try {
      saveDemoToken(token);
    } catch {
      throw new BizError({ message: t('login.storageError') });
    }
  }
  return { user };
};

/** Only demo sign-out is best effort. A failed real sign-out cannot revoke an HttpOnly cookie locally. */
export const logout = async () => {
  try {
    await api<null>('/api/v1/logout', { method: 'POST', skipErrorHandler: true });
  } catch (error) {
    if (!DEMO_MODE) throw error;
  }
  clearDemoToken();
};

/** Real mode always asks the server about its cookie; demo mode supplies its tab-local token via the adapter. */
export const fetchCurrentUser = async () =>
  currentUser(await api<unknown>('/api/v1/currentUser', { skipErrorHandler: true }));
