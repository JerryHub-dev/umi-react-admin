import { describe, expect, it } from 'vitest';
import { safeRedirect } from './safeRedirect';

const redirect = (target: string) => `?redirect=${encodeURIComponent(target)}`;

describe('canonical login return routes', () => {
  it('preserves an ordinary internal route with query and fragment', () => {
    expect(safeRedirect(redirect('/system/users?keyword=guest#details'))).toBe('/system/users?keyword=guest#details');
    expect(safeRedirect(redirect('/login-help'))).toBe('/login-help');
  });

  it('canonicalizes dot segments before Umi prefixes its deployment basename', () => {
    expect(safeRedirect(redirect('/system/../../dashboard'))).toBe('/dashboard');
    expect(safeRedirect(redirect('/%2e%2e/dashboard'))).toBe('/dashboard');
    expect(new URL(`/umi-react-admin${safeRedirect(redirect('/%2e%2e/dashboard'))}`, 'https://app.test').pathname).toBe(
      '/umi-react-admin/dashboard',
    );
  });

  it.each([
    'https://evil.test',
    '//evil.test',
    '/foo/..//evil.test',
    '/%2e//evil.test',
    '/\\evil.test',
    '/\n/evil.test',
    '/\tevil.test',
    '/%2f%2fevil.test',
    '/%5cevil.test',
    '/%255cevil.test',
    '/%252f%252fevil.test',
    '/%0a/evil.test',
    '/%7f/evil.test',
    '/bad%escape',
    '/login',
    '/LOGIN',
    '/login/',
    '/%6cogin',
    '/foo/../login',
    '/%2e%2e/login',
    '/login/nested',
  ])('falls back for ambiguous destinations and login aliases: %s', (target) => {
    expect(safeRedirect(redirect(target))).toBe('/');
  });

  it('bounds untrusted inputs without truncating them into another destination', () => {
    expect(safeRedirect(redirect(`/${'a'.repeat(2048)}`))).toBe('/');
    expect(safeRedirect(`?${'a'.repeat(8192)}&redirect=%2Fsystem%2Fusers`)).toBe('/');
    expect(safeRedirect('')).toBe('/');
  });
});
