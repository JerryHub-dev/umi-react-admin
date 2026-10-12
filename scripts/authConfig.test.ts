import { describe, expect, it } from 'vitest';
import { resolveAuthConfig } from '../config/auth';

describe('authentication build configuration', () => {
  it('fails production builds without an explicitly selected authentication mode', () => {
    expect(() => resolveAuthConfig({ NODE_ENV: 'production' })).toThrow('Production requires');
    expect(() => resolveAuthConfig({ NODE_ENV: 'production', UMI_APP_DEMO_MODE: 'false' })).toThrow(
      'Production requires',
    );
  });

  it('allows explicit public demo builds and same-origin cookie builds', () => {
    expect(resolveAuthConfig({ NODE_ENV: 'production', UMI_APP_DEMO_MODE: 'true' })).toEqual({
      demoMode: true,
      apiBase: undefined,
    });
    expect(resolveAuthConfig({ NODE_ENV: 'production', UMI_APP_API_BASE: '/' })).toEqual({
      demoMode: false,
      apiBase: '/',
    });
    expect(resolveAuthConfig({ NODE_ENV: 'production', UMI_APP_API_BASE: '/backend/' })).toEqual({
      demoMode: false,
      apiBase: '/backend',
    });
  });

  it('keeps unconfigured development in real mode rather than enabling demo authentication', () => {
    expect(resolveAuthConfig({ NODE_ENV: 'development' })).toEqual({ demoMode: false, apiBase: undefined });
  });

  it.each(['', 'TRUE', '1', 'yes'])('rejects ambiguous demo switches: %s', (value) => {
    expect(() => resolveAuthConfig({ UMI_APP_DEMO_MODE: value })).toThrow('must be true or false');
  });

  it('rejects conflicting demo and real backend settings', () => {
    expect(() => resolveAuthConfig({ UMI_APP_DEMO_MODE: 'true', UMI_APP_API_BASE: '/' })).toThrow(
      'cannot be configured together',
    );
  });

  it.each([
    '',
    'https://api.example.test',
    '//api.example.test',
    '/\\api.example.test',
    '/backend?x=1',
    '/backend#x',
    '/backend/../api',
    '/./api',
    '/%2e%2e/api',
    '/%252e%252e/api',
    '/back%2fend',
    '/back%5cend',
    '/backend\n',
    '/back end',
    '/backend//api',
  ])('rejects unsafe API base representations: %s', (apiBase) => {
    expect(() => resolveAuthConfig({ UMI_APP_API_BASE: apiBase })).toThrow('same-origin path prefix');
  });
});
