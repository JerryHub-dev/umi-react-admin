import { THEME_STORAGE_KEY, type AppInitialState, type ThemeMode } from '@/utils/Auth/initialState';
import { useAntdConfigSetter, useModel } from '@umijs/max';
import { theme as antdTheme } from 'antd';

/**
 * 明暗主题切换：antd 算法经 useAntdConfigSetter 热切换，ProLayout navTheme 与持久化经 initialState 同步。
 * 顶栏与登录页共用（登录页未登录时 initialState 为空，同样可以切换）。
 */
export const useThemeMode = () => {
  const { initialState, setInitialState } = useModel('@@initialState');
  const setAntdConfig = useAntdConfigSetter();
  const dark = initialState?.theme === 'realDark';

  const apply = (mode: ThemeMode) => {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, mode);
    } catch {
      // 存储不可用：本次会话内仍然生效
    }
    setAntdConfig({
      theme: {
        algorithm: mode === 'realDark' ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
        // 与 app.tsx 启动时的说明文字对比度覆盖同源（U04）：热切换只换 algorithm 不重算 token 覆盖，
        // 这里随模式带上对应的中性灰，切换后立即生效而不是等刷新
        token: { colorTextTertiary: mode === 'realDark' ? '#8f8f8f' : '#6f6f6f' },
      },
    });
    setInitialState((prev: AppInitialState | undefined) => ({
      name: '',
      email: '',
      nickName: '',
      role: undefined,
      roleKey: undefined,
      permissions: new Set<string>(),
      ...prev,
      theme: mode,
    }));
  };

  return { dark, toggle: () => apply(dark ? 'light' : 'realDark') };
};
