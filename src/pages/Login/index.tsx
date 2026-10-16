import ParticleField from '@/components/ParticleField';
import { DEMO_MODE } from '@/demo/mode';
import { useThemeMode } from '@/hooks/useThemeMode';
import { login, type LoginParams } from '@/services/auth';
import { readTheme } from '@/utils/Auth/initialState';
import { safeRedirect } from '@/utils/Auth/safeRedirect';
import { UserInfo } from '@/utils/Auth/userInfo';
import { BizError } from '@/utils/BizError';
import {
  EyeOutlined,
  GlobalOutlined,
  LockOutlined,
  MoonOutlined,
  SafetyCertificateOutlined,
  SunOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { getLocale, history, setLocale, useIntl, useLocation, useModel } from '@umijs/max';
import { App, Button, Divider, Dropdown, Form, Input, theme, Typography } from 'antd';
import { useEffect, useState } from 'react';

// 亮点前的小圆点取自粒子色环，与背景呼应
const HIGHLIGHTS = [
  { key: 'dashboard', color: '#1677ff' },
  { key: 'system', color: '#722ed1' },
  { key: 'maps', color: '#eb2f96' },
  { key: 'i18n', color: '#fa8c16' },
];

const Login: React.FC = () => {
  // App 上下文中的 message：跳转离开登录页后提示仍然可见
  const { message: messageApi } = App.useApp();
  const intl = useIntl();
  const t = (id: string) => intl.formatMessage({ id });
  const location = useLocation();
  const { initialState, setInitialState } = useModel('@@initialState');
  const { dark, toggle } = useThemeMode();
  const { token } = theme.useToken();
  // 浅色用纯白底让彩色粒子最干净；暗色用更深的 layout 底，粒子像在发光
  const pageBg = dark ? token.colorBgLayout : token.colorBgContainer;
  const [pending, setPending] = useState<string>();

  // 登录态真正写入全局状态之后再跳转。此前在 setInitialState 之后立即 push：状态尚未提交时
  // 路由守卫看到的仍是未登录，又被重定向回登录页（登录请求变为异步后稳定复现）
  const signedIn = !!initialState?.name;
  useEffect(() => {
    if (signedIn) {
      history.replace(safeRedirect(location.search));
    }
  }, [signedIn, location.search]);

  const signIn = async (values: LoginParams) => {
    setPending(values.name);
    try {
      const { user } = await login(values);
      // 立即刷新全局初始状态（保留当前主题），让路由守卫与 access 权限即时生效
      await setInitialState({ ...new UserInfo(user), theme: readTheme() });
      messageApi.success(t('login.success'));
    } catch (error) {
      messageApi.error(error instanceof BizError ? error.message : t('login.failed'));
    } finally {
      setPending(undefined);
    }
  };

  return (
    // 底色与文字色用 antd token（登录页在 umi 包裹的 antd <App> 容器内），暗色模式随算法切换
    <div className="relative min-h-screen overflow-hidden" style={{ background: pageBg }}>
      <ParticleField dark={dark} className="pointer-events-none absolute inset-0 h-full w-full" />

      <div className="relative flex min-h-screen flex-col">
        <header className="flex items-center justify-between px-5 py-4 sm:px-10 sm:py-6">
          <div className="flex items-center gap-3 text-base font-semibold text-text">
            <img src={`${PUBLIC_PATH}logo.svg`} alt="" className="h-8 w-8" />
            React Admin
          </div>
          <div className="flex gap-1">
            <Button
              type="text"
              aria-label={t('header.theme')}
              icon={dark ? <SunOutlined /> : <MoonOutlined />}
              onClick={toggle}
            />
            <Dropdown
              menu={{
                items: [
                  // 语言名按惯例用该语言自身书写
                  // eslint-disable-next-line local/no-cjk-literal
                  { key: 'zh-CN', label: '简体中文' },
                  { key: 'en-US', label: 'English' },
                ],
                selectable: true,
                selectedKeys: [getLocale()],
                onClick: ({ key }) => setLocale(key),
              }}
            >
              <Button type="text" aria-label={t('header.language')} icon={<GlobalOutlined />} />
            </Dropdown>
          </div>
        </header>

        <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col items-center justify-center gap-10 px-4 pt-4 pb-12 lg:flex-row lg:justify-between lg:gap-16 lg:px-10">
          <section
            className="max-w-xl text-center lg:text-left"
            // 与底色同色的文字光晕：粒子从字形下穿过时被局部压淡，正文始终清楚，又不必给文案加底板
            style={{ textShadow: `0 0 2px ${pageBg}, 0 0 6px ${pageBg}, 0 0 12px ${pageBg}` }}
          >
            <h1 className="m-0 text-3xl leading-tight font-semibold tracking-tight text-text sm:text-4xl lg:text-5xl">
              {t('login.headline')}
            </h1>
            {/* 窄屏只保留标题，副标题与亮点从平板宽度起出现，不把登录框挤到首屏之外 */}
            <Typography.Paragraph type="secondary" className="mt-5 mb-0 hidden text-base leading-relaxed sm:block">
              {t('login.subhead')}
            </Typography.Paragraph>
            <ul className="mt-8 mb-0 hidden list-none flex-col gap-3 p-0 lg:flex">
              {HIGHLIGHTS.map(({ key, color }) => (
                <li key={key} className="flex items-center gap-3 text-sm text-text">
                  <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: color }} />
                  {t(`login.highlight.${key}`)}
                </li>
              ))}
            </ul>
          </section>

          <div
            className="w-full max-w-sm shrink-0 rounded-2xl border p-6 sm:p-8"
            style={{
              // 近乎不透明的面板：粒子只隐约透出一点。不用 backdrop-filter 毛玻璃——背后是每帧重绘的画布，
              // 无 GPU 合成（虚拟机、远程桌面、部分旧机器）时模糊要每帧重算，实测把帧率从 60 拖到 30
              background: `color-mix(in srgb, ${token.colorBgContainer} ${dark ? 86 : 90}%, transparent)`,
              borderColor: token.colorBorderSecondary,
              boxShadow: dark ? '0 24px 64px -24px rgba(0, 0, 0, 0.8)' : '0 24px 64px -28px rgba(15, 23, 42, 0.28)',
            }}
          >
            <h2 className="m-0 text-2xl font-semibold text-text">{t('login.title')}</h2>
            <Typography.Paragraph type="secondary" className="mt-1 mb-6">
              {t('login.subtitle')}
            </Typography.Paragraph>
            {DEMO_MODE && (
              <div className="flex flex-col gap-3">
                <Button
                  size="large"
                  type="primary"
                  block
                  icon={<SafetyCertificateOutlined />}
                  loading={pending === 'admin'}
                  onClick={() => signIn({ name: 'admin', password: 'demo' })}
                >
                  {t('login.asAdmin')}
                </Button>
                <Typography.Text type="secondary" className="-mt-2 text-center text-xs">
                  {t('login.asAdminDesc')}
                </Typography.Text>
                {/* 五种角色的快捷体验（F02）：一次点击即以对应角色进入，权限差异见角色矩阵文档 */}
                <div className="grid grid-cols-2 gap-2">
                  {(['lead', 'operator', 'analyst', 'guest'] as const).map((name) => (
                    <Button
                      key={name}
                      block
                      icon={name === 'guest' ? <EyeOutlined /> : undefined}
                      loading={pending === name}
                      onClick={() => signIn({ name, password: 'demo' })}
                    >
                      {t(`login.as.${name}`)}
                    </Button>
                  ))}
                </div>
                <Typography.Text type="secondary" className="-mt-1 text-center text-xs">
                  {t('login.asRolesDesc')}
                </Typography.Text>
              </div>
            )}
            {/* 分隔说明是辅助信息，用次要文字色，不和上下两组操作抢视线 */}
            {DEMO_MODE && (
              <Divider plain>
                <Typography.Text type="secondary" className="text-xs">
                  {t('login.or')}
                </Typography.Text>
              </Divider>
            )}
            <Form<LoginParams>
              initialValues={DEMO_MODE ? { name: 'admin', password: 'demo' } : undefined}
              layout="vertical"
              requiredMark={false}
              size="large"
              onFinish={signIn}
            >
              <Form.Item
                label={t('login.username')}
                name="name"
                rules={[{ required: true, message: t('login.usernameRequired') }]}
              >
                <Input autoComplete="username" prefix={<UserOutlined className="text-text-tertiary" />} />
              </Form.Item>
              <Form.Item
                label={t('login.password')}
                name="password"
                rules={[{ required: true, message: t('login.passwordRequired') }]}
              >
                <Input.Password
                  autoComplete="current-password"
                  prefix={<LockOutlined className="text-text-tertiary" />}
                />
              </Form.Item>
              {/* 演示模式的主操作是上方的一键体验，这里退为次要按钮；真实登录时它就是唯一的主操作 */}
              <Button block type={DEMO_MODE ? 'default' : 'primary'} htmlType="submit" loading={!!pending}>
                {t('login.submit')}
              </Button>
            </Form>
            {DEMO_MODE && (
              <Typography.Paragraph type="secondary" className="mt-4 mb-0 text-center text-xs">
                {t('login.demoHint')}
              </Typography.Paragraph>
            )}
          </div>
        </main>

        <footer className="px-5 pb-5 text-center text-xs text-text-tertiary sm:px-10 lg:text-left">
          Umi Max · React 19 · Ant Design 6 · AntV · Cesium · OpenLayers
        </footer>
      </div>
    </div>
  );
};

export default Login;
