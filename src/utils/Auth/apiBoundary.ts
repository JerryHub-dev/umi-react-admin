/** API base is a literal same-origin path prefix; cross-origin backends need a same-origin proxy. */
export const normalizeApiBase = (value: string): string => {
  if (
    !value ||
    value.length > 1024 ||
    !value.startsWith('/') ||
    value.includes('//') ||
    /[\\\u0000-\u0020\u007f%?#]/.test(value) ||
    value.split('/').some((segment) => segment === '.' || segment === '..')
  ) {
    throw new Error('UMI_APP_API_BASE must be a literal same-origin path prefix, such as / or /backend');
  }
  return value.replace(/\/+$/, '') || '/';
};

/** Match Axios baseURL concatenation, then enforce the existing API contract before credentials are attached. */
export const resolveApiUrl = (url: string | undefined, apiBase: string, origin: string): string => {
  const base = normalizeApiBase(apiBase);
  if (!url || url.length > 8192 || /[\\\u0000-\u0020\u007f#]/.test(url)) {
    throw new Error('Invalid API request destination');
  }
  const pathname = url.split('?')[0];
  if (
    !pathname.startsWith('/api/v1/') ||
    pathname.includes('//') ||
    /%(?:2f|5c|25|2e|0[0-9a-f]|1[0-9a-f]|7f)/i.test(pathname) ||
    pathname.split('/').some((segment) => segment === '.' || segment === '..')
  ) {
    throw new Error('API requests must use a path under /api/v1/');
  }
  decodeURIComponent(pathname);
  const target = new URL(`${base === '/' ? '' : base}${url}`, origin);
  if (target.origin !== origin) throw new Error('API requests must remain same-origin');
  return target.href;
};
