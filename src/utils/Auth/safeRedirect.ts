const REDIRECT_ORIGIN = 'https://redirect.invalid';

/** Return a canonical application route before Umi appends the deployment basename. */
export const safeRedirect = (search: string): string => {
  if (search.length > 8192) return '/';
  const target = new URLSearchParams(search).get('redirect');
  if (
    !target ||
    target.length > 2048 ||
    !target.startsWith('/') ||
    target.startsWith('//') ||
    /[\\\u0000-\u001f\u007f]/.test(target)
  ) {
    return '/';
  }
  try {
    const url = new URL(target, REDIRECT_ORIGIN);
    if (
      url.origin !== REDIRECT_ORIGIN ||
      url.pathname.startsWith('//') ||
      /%(?:2f|5c|25|0[0-9a-f]|1[0-9a-f]|7f)/i.test(url.pathname)
    ) {
      return '/';
    }
    const pathname = decodeURIComponent(url.pathname).replace(/\/+$/, '').toLowerCase();
    // React Router matches paths case-insensitively and decodes pathname escapes.
    if (pathname === '/login' || pathname.startsWith('/login/')) return '/';
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return '/';
  }
};
