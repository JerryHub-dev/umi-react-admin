import { AUTH_TOKEN_KEY } from '@/constants';
import { DEMO_MODE } from '@/demo/mode';

/** Migration only: real authentication never consumes the former persistent bearer. */
export const removeLegacyToken = () => {
  try {
    window.localStorage.removeItem(AUTH_TOKEN_KEY);
  } catch {
    // Storage may be disabled; it is never an authentication authority in real mode.
  }
};

export const readDemoToken = (): string => {
  if (!DEMO_MODE || typeof window === 'undefined') return '';
  try {
    return window.sessionStorage.getItem(AUTH_TOKEN_KEY) || '';
  } catch {
    return '';
  }
};

export const saveDemoToken = (token: string) => {
  if (!DEMO_MODE || typeof window === 'undefined') throw new Error('Demo sessions are disabled');
  window.sessionStorage.setItem(AUTH_TOKEN_KEY, token);
};

export const clearDemoToken = () => {
  try {
    window.sessionStorage.removeItem(AUTH_TOKEN_KEY);
  } catch {
    // Missing or unavailable demo storage already means unauthenticated.
  }
};
