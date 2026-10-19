import { canAccessRoute, groupOf, matchedKey, useNamedChain, type NavRoute } from '@/utils/routeNav';
import { history, useAccess, useIntl, useLocation } from '@umijs/max';
import { Menu, theme } from 'antd';
import { useEffect, useRef } from 'react';

/**
 * 组内二级导航：顶栏（layout: 'top'）只承载一级分组，进入分组后这里渲染一排水平页签，
 * 贴在内容区顶部（sticky 于 56px 顶栏之下），取代原 mix 布局的双层导航壳。
 * - 权限过滤与 ProLayout 菜单同口径（canAccessRoute）：access 键为 false 或在 useAccess 里缺失都不渲染；
 * - 文案复用菜单同一套 menu.<组>.<名> 键（scripts/routes.test.ts 把关）；
 * - 尾部常驻组名小字：滚动后语境只剩页签，弱化的组名标签保留「我在哪个区」；
 *   放右端是为保住左缘参考线——页签与页面内容共用 40px 对齐（组名占左端会把页签顶偏）
 * - 横向不放「···」收纳（选中项被收进去会丢当前位置），改为整排横滚并自动滚到选中项；
 * - 切页签时滚动复位：内容页多为长表格，带着旧偏移落页像"没刷新"；
 * - antd Menu horizontal 自带键盘导航；<nav aria-label> 补页面地标。
 */
export default function GroupNav() {
  const chain = useNamedChain();
  const { pathname } = useLocation();
  const access = useAccess() as Record<string, unknown>;
  const intl = useIntl();
  const { token } = theme.useToken();
  const scroller = useRef<HTMLDivElement>(null);

  const group = groupOf(chain);
  const groupLabel = group ? intl.formatMessage({ id: `menu.${group.name}` }) : '';
  const items = (group?.routes ?? [])
    .filter((route: NavRoute) => route.name && route.path)
    .filter((route) => canAccessRoute(access, route))
    .map((route) => ({
      key: route.path!,
      label: intl.formatMessage({ id: `menu.${group!.name}.${route.name}` }),
    }));

  const selected =
    group && items.length >= 2
      ? matchedKey(
          items.map((item) => item.key),
          pathname,
        )
      : undefined;

  // 选中项可能滚出可视区（窄屏/长组名），路径变化后带回视野
  useEffect(() => {
    if (!selected) return;
    scroller.current
      ?.querySelector('li.ant-menu-item-selected')
      ?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [selected]);

  // 单页（dashboard）与无权限分组（子项全被过滤）不渲染导航条。
  // 注意分组根路径的重定向瞬态帧（/system → /system/users）没有精确选中项：保持挂载、
  // 亮第一项以外的空选中——卸载再挂载会让内容区跳 40px
  if (!group || items.length < 2) return null;

  return (
    <nav
      aria-label={groupLabel}
      data-tour="groupnav"
      style={{
        position: 'sticky',
        top: 56,
        zIndex: 15,
        display: 'flex',
        alignItems: 'stretch',
        height: 40,
        backgroundColor: token.colorBgContainer,
        borderBottom: `1px solid ${token.colorSplit}`,
        paddingInline: 40,
        gap: token.marginSM,
      }}
    >
      <div ref={scroller} className="min-w-0 flex-1" style={{ overflowX: 'auto', scrollbarWidth: 'none' }}>
        <Menu
          mode="horizontal"
          disabledOverflow
          selectedKeys={selected ? [selected] : []}
          items={items}
          onClick={({ key }) => {
            if (key !== pathname) {
              history.push(key);
              window.scrollTo(0, 0);
            }
          }}
          style={{
            borderBottom: 'none',
            background: 'transparent',
            minWidth: 0,
            lineHeight: '40px',
          }}
        />
      </div>
      <span
        className="hidden self-center text-xs font-medium tracking-wider whitespace-nowrap uppercase md:inline"
        style={{ color: token.colorTextTertiary, marginInlineStart: 'auto' }}
      >
        {groupLabel}
      </span>
    </nav>
  );
}
