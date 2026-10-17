/** 登录页能展示的跳转原因：expired = 会话失效（接口返回 401） */
export type LoginReason = 'expired';

const LOGIN_REASONS: readonly LoginReason[] = ['expired'];

/**
 * 应用内登录地址（不含部署前缀）：带上回跳地址与原因。
 * 回跳到根路径或登录页本身没有意义，这两种情况不带 redirect；回跳值登录页还会经 safeRedirect 再校验一遍。
 */
export const loginPath = (appPath: string, reason?: LoginReason) => {
  const params = new URLSearchParams();
  const path = appPath.split(/[?#]/)[0].replace(/\/+$/, '').toLowerCase();
  if (appPath.startsWith('/') && path !== '' && path !== '/login' && !path.startsWith('/login/')) {
    params.set('redirect', appPath);
  }
  if (reason) params.set('reason', reason);
  const query = params.toString();
  return query ? `/login?${query}` : '/login';
};

/**
 * 浏览器地址 → 应用内路由：去掉部署前缀（GitHub Pages 部署在 /umi-react-admin/ 子路径），保留查询与锚点。
 * 不在部署前缀下的地址无法确定应用内路由，返回根路径。
 */
export const appPathOf = (location: Pick<Location, 'pathname' | 'search' | 'hash'>, publicPath: string) => {
  const base = publicPath.endsWith('/') ? publicPath : `${publicPath}/`;
  const { pathname } = location;
  let rest: string;
  if (pathname.startsWith(base)) rest = pathname.slice(base.length);
  else if (`${pathname}/` === base) rest = '';
  else return '/';
  return `/${rest}${location.search}${location.hash}`;
};

/** 读取登录页地址上的跳转原因；未知取值一律忽略，不把任意参数当提示展示 */
export const readLoginReason = (search: string): LoginReason | undefined => {
  const reason = new URLSearchParams(search).get('reason');
  return LOGIN_REASONS.find((item) => item === reason);
};
