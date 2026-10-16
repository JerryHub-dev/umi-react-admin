import { describe, expect, it } from 'vitest';
import { appPathOf, loginPath, readLoginReason } from './loginUrl';
import { safeRedirect } from './safeRedirect';

const loc = (pathname: string, search = '', hash = '') => ({ pathname, search, hash });

describe('登录地址', () => {
  it('带上回跳地址与原因，且回跳值能通过 safeRedirect', () => {
    const url = loginPath('/system/users?keyword=iris', 'expired');
    expect(url).toBe('/login?redirect=%2Fsystem%2Fusers%3Fkeyword%3Diris&reason=expired');
    expect(safeRedirect(url.slice(url.indexOf('?')))).toBe('/system/users?keyword=iris');
    expect(readLoginReason(url.slice(url.indexOf('?')))).toBe('expired');
  });

  it('根路径与登录页本身不带回跳；没有原因时不带 reason', () => {
    expect(loginPath('/')).toBe('/login');
    expect(loginPath('/', 'expired')).toBe('/login?reason=expired');
    expect(loginPath('/login?redirect=%2Fx', 'expired')).toBe('/login?reason=expired');
    expect(loginPath('/LOGIN/')).toBe('/login');
    expect(loginPath('/dashboard')).toBe('/login?redirect=%2Fdashboard');
  });

  it('浏览器地址去掉部署前缀后得到应用内路由', () => {
    expect(appPathOf(loc('/umi-react-admin/system/users', '?a=1', '#top'), '/umi-react-admin/')).toBe(
      '/system/users?a=1#top',
    );
    expect(appPathOf(loc('/umi-react-admin'), '/umi-react-admin/')).toBe('/');
    expect(appPathOf(loc('/system/users'), '/')).toBe('/system/users');
    expect(appPathOf(loc('/elsewhere/page'), '/umi-react-admin/')).toBe('/');
  });

  it('未知原因一律忽略', () => {
    expect(readLoginReason('?reason=expired')).toBe('expired');
    expect(readLoginReason('?reason=%3Cscript%3E')).toBeUndefined();
    expect(readLoginReason('')).toBeUndefined();
  });
});
