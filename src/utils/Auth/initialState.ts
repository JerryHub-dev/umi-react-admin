import { DEMO_MODE } from '@/demo/mode';
import { fetchCurrentUser } from '@/services/auth';
import { clearDemoToken, readDemoToken, removeLegacyToken } from './session';
import { UserInfo } from './userInfo';

export type ThemeMode = 'light' | 'realDark';

/** 全局初始状态：用户信息 + 主题（主题随 localStorage 持久化，与 app.tsx 的 antd 初始算法同源） */
export type AppInitialState = UserInfo & { theme?: ThemeMode };

export const THEME_STORAGE_KEY = 'umi_theme';

export const readTheme = (): ThemeMode => {
  try {
    return typeof window !== 'undefined' && localStorage.getItem(THEME_STORAGE_KEY) === 'realDark'
      ? 'realDark'
      : 'light';
  } catch {
    return 'light';
  }
};

/**
 * 真实模式直接查询服务端会话（JS 无法读取 HttpOnly Cookie）；演示模式需要本标签页的 token。
 * 换取失败返回 undefined，由路由守卫（app.tsx childrenRender 内 AuthGuard）引导至登录页。
 */
export async function getInitialState(): Promise<AppInitialState | undefined> {
  if (typeof window === 'undefined') {
    return undefined;
  }

  const theme = readTheme();
  removeLegacyToken();
  if (!DEMO_MODE) clearDemoToken();
  if (DEMO_MODE && !readDemoToken()) {
    return undefined;
  }

  try {
    const user = await fetchCurrentUser();
    return { ...new UserInfo(user), theme };
  } catch {
    // 失效演示 token 或服务端会话：回落到未登录态，Cookie 的失效/删除由后端负责
    clearDemoToken();
    return undefined;
  }
}
