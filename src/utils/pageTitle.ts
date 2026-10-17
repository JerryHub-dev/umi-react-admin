/** 浏览器标签页标题里的产品名（与 ProLayout 的 title、config.ts 的 title 一致） */
export const APP_TITLE = 'React Admin';

/**
 * 由匹配到的路由链得到菜单文案键，规则与菜单相同：menu.<父级>.<name>。
 * 布局包裹层、分组内的默认重定向等没有 name 的路由不参与拼接。
 */
export const menuKeyOf = (chain: { name?: unknown }[]) => {
  const names = chain.map((route) => route.name).filter((name): name is string => typeof name === 'string' && !!name);
  return names.length ? `menu.${names.join('.')}` : undefined;
};

/** 「页面名 - 产品名」；没有页面名（文案缺失、未匹配到路由）时只显示产品名 */
export const pageTitle = (label?: string) => (label ? `${label} - ${APP_TITLE}` : APP_TITLE);
