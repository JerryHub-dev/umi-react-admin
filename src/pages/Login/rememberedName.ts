/**
 * 「记住账号」：只记用户名，不记密码（密码交给浏览器自带的密码管理器）。
 * 存储不可用（隐私模式、被禁用）时静默降级为不记住，登录本身不受影响。
 */
export const REMEMBERED_NAME_KEY = 'umi-react-admin:login-name';

const storage = () => (typeof window === 'undefined' ? undefined : window.localStorage);

export const readRememberedName = () => {
  try {
    return storage()?.getItem(REMEMBERED_NAME_KEY)?.slice(0, 256) ?? '';
  } catch {
    return '';
  }
};

/** 传入用户名则记住，传空则忘掉 */
export const writeRememberedName = (name?: string) => {
  try {
    const trimmed = name?.trim();
    if (trimmed) storage()?.setItem(REMEMBERED_NAME_KEY, trimmed);
    else storage()?.removeItem(REMEMBERED_NAME_KEY);
  } catch {
    // 存储不可用：本次不记住
  }
};
