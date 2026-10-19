import { matchRoutes, useAppData, useLocation } from '@umijs/max';

/**
 * 命中当前路径的「命名路由链」（client route 对象携带 config/routes.ts 的 name/access 等字段，
 * 布局包裹层与无名占位路由不参与）。三种消费方：
 * GroupNav（找一级分组与二级项）、Cesium 场景壳（找兄弟场景）、DemoPage（算页面标题文案键）。
 */
export type NavRoute = {
  path?: string;
  name?: string;
  access?: string;
  redirect?: string;
  hideInMenu?: boolean;
  /** plugin-access 按 access 键标记（键缺失也算不可访问）；ProLayout 菜单数据里还会顺手删掉 name */
  unaccessible?: boolean;
  routes?: NavRoute[];
  /** ProLayout 菜单数据（MenuDataItem）用 children 承载子项，clientRoutes 用 routes */
  children?: NavRoute[];
};

/** 单测里 @umijs/max 常被最小 mock（只给 useIntl），路由 hook 缺失时安全返回 undefined */
const safeCall = <T>(fn?: () => T): T | undefined => {
  try {
    return fn?.();
  } catch {
    return undefined;
  }
};

export const useNamedChain = (): NavRoute[] => {
  const clientRoutes = safeCall(useAppData)?.clientRoutes;
  const pathname = safeCall(useLocation)?.pathname;
  if (!clientRoutes?.length || !pathname) return [];
  // IClientRoute 携带 umi 配置字段（name/access/routes），比 react-router 的 RouteObject 宽
  const routes = clientRoutes as unknown as Parameters<typeof matchRoutes>[0];
  const chain = (matchRoutes(routes, pathname) ?? []).map((match) => match.route as NavRoute);
  return chain.filter((route) => route.name);
};

/** 路由链里第一个自带命名子路由的项即一级分组（dashboard 等单页没有分组） */
export const groupOf = (chain: NavRoute[]) => chain.find((route) => (route.routes ?? []).some((child) => child.name));

/** pathname 属于哪个导航项：取 key 是 pathname 前缀的最长一项（/map/cesium/geohash → /map/cesium） */
export const matchedKey = (keys: string[], pathname: string) =>
  keys.filter((key) => pathname === key || pathname.startsWith(`${key}/`)).sort((a, b) => b.length - a.length)[0];

/**
 * 路由的 access 键是否放行，与 plugin-access 给 ProLayout 菜单打标同一口径：
 * 无 access 键 → 放行；检测器是函数 → 按路由调用；布尔 → 取值；键在 access 对象里缺失 → 不可访问
 * （曾按「!== false」判断，键名笔误时菜单隐藏了、页签与命令面板却照样显示，点进去是 403）
 */
export const canAccessRoute = (access: Record<string, unknown>, route: Pick<NavRoute, 'access'>) => {
  if (typeof route.access !== 'string') return true;
  const detector = access[route.access];
  if (typeof detector === 'function') return Boolean((detector as (route: unknown) => unknown)(route));
  if (typeof detector === 'boolean') return detector;
  return detector !== undefined;
};

/**
 * 分组的默认落点：深度优先找第一个可见且可访问的叶子页。分组路由自身的 redirect（/system → /system/users）
 * 是静态的，不看权限：没有 system.user.view 的角色点分组标题会落进 403，所以点击跳转用它算目标。
 * 菜单数据（children）与 clientRoutes（routes）两种形态都接受；找不到返回 undefined。
 */
export const firstAccessibleLeaf = (node: NavRoute): string | undefined => {
  if (node.hideInMenu || node.unaccessible || !node.path) return undefined;
  // 无权子项在菜单数据里已没有 name，仍要算作子项：否则「子项全无权」的分组会被当成叶子返回自身路径
  const children = (node.children ?? node.routes ?? []).filter(
    (child) => child.path && !child.redirect && (child.name || child.unaccessible),
  );
  if (!children.length) return node.path;
  for (const child of children) {
    const leaf = firstAccessibleLeaf(child);
    if (leaf) return leaf;
  }
  return undefined;
};
