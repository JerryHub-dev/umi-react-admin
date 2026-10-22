import { matchedKey, useNamedChain, type NavRoute } from '@/utils/routeNav';
import {
  AimOutlined,
  EyeOutlined,
  HeatMapOutlined,
  NodeIndexOutlined,
  SelectOutlined,
  TableOutlined,
} from '@ant-design/icons';
import { Outlet, history, useIntl, useLocation } from '@umijs/max';
import { Segmented, theme } from 'antd';
import { useEffect, useRef } from 'react';

/** 场景图标：语义取义，避开顶栏已占用的 Compass（地图组）与 Global（Cesium 组） */
const SCENE_ICONS: Record<string, React.ReactNode> = {
  geohash: <TableOutlined />,
  direction: <AimOutlined />,
  heatmap: <HeatMapOutlined />,
  trajectory: <NodeIndexOutlined />,
  select: <SelectOutlined />,
  situation: <EyeOutlined />,
};

/**
 * /map/cesium 的场景壳：全站唯一一处原三级路由的承载方式——六个三维场景不再是菜单层级，
 * 而是页内场景条切换（共享 CesiumViewer，各场景独立子路由渲染在 Outlet），路径与权限不变。
 * 场景条与 GroupNav 同构（sticky 第二排、40px、同色边框、40px 内边距、窄屏整排横滚并把选中项带回视野），
 * 带图标与页内控件（各场景自己的 Segmented 等）形成两种心智：场景条 = 导航，页内控件 = 参数。
 */
export default function CesiumLayout() {
  const chain = useNamedChain();
  const { pathname } = useLocation();
  const intl = useIntl();
  const { token } = theme.useToken();
  const scroller = useRef<HTMLDivElement>(null);

  const cesium = chain.find((route) => route.name === 'cesium');
  const scenes = (cesium?.routes ?? []).filter((route: NavRoute) => route.name && route.path);
  const options = scenes.map((route) => ({
    value: route.path!,
    label: (
      <span>
        {SCENE_ICONS[route.name!]}
        <span className="ml-1.5">{intl.formatMessage({ id: `menu.map.cesium.${route.name}` })}</span>
      </span>
    ),
  }));
  // /map/cesium 命中重定向占位的瞬间没有精确匹配项，回落到第一项避免空选中
  const value = matchedKey(
    options.map((option) => option.value),
    pathname,
  );

  // 窄屏（~375px）六个场景放不下：整排横滚，切换后把选中项带回视野（与 GroupNav 同一处理）
  useEffect(() => {
    if (!value) return;
    scroller.current
      ?.querySelector('.ant-segmented-item-selected')
      ?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [value]);

  return (
    <div>
      <div
        style={{
          position: 'sticky',
          top: 96,
          zIndex: 14,
          backgroundColor: token.colorBgContainer,
          borderBottom: `1px solid ${token.colorSplit}`,
          paddingInline: 40,
          height: 40,
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <div ref={scroller} className="min-w-0 flex-1" style={{ overflowX: 'auto', scrollbarWidth: 'none' }}>
          {/* max-content：否则 Segmented 按容器收缩，每项被省略号截断而不是横滚 */}
          <Segmented
            style={{ width: 'max-content' }}
            options={options}
            value={value ?? options[0]?.value}
            onChange={(next) => {
              if (next !== pathname) {
                history.push(next as string);
                window.scrollTo(0, 0);
              }
            }}
          />
        </div>
      </div>
      {/* 不再额外包一层内边距：各场景页自己的 DemoPage（PageContainer）已提供与其它页一致的留白。
          曾包 40/16px，叠加后内容比场景条与其它页面多缩进 40px（手机上舞台只剩一半宽），
          舞台底边也多出 16px 落到首屏之外（cesium.css 的 100vh - 216px 按无此层计算） */}
      <Outlet />
    </div>
  );
}
