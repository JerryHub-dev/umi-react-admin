import { useLocation } from '@umijs/max';
import type { ReactNode } from 'react';

/**
 * 页面切换微动效：以 pathname 为 key 重挂载内容区，触发 tailwind.css 里 .page-fade 的
 * 150ms 淡入（prefers-reduced-motion 时该动画自动禁用）。只包路由页面，不影响布局壳。
 */
export default function PageTransition({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  return (
    <div key={pathname} className="page-fade">
      {children}
    </div>
  );
}
