import { DEMO_MODE } from '@/demo/mode';
import { useThemeMode } from '@/hooks/useThemeMode';
import { login, type LoginParams } from '@/services/auth';
import { readTheme } from '@/utils/Auth/initialState';
import { safeRedirect } from '@/utils/Auth/safeRedirect';
import { UserInfo } from '@/utils/Auth/userInfo';
import { BizError } from '@/utils/BizError';
import {
  CheckCircleFilled,
  EyeOutlined,
  MoonOutlined,
  SafetyCertificateOutlined,
  SunOutlined,
  TranslationOutlined,
} from '@ant-design/icons';
import { getLocale, history, setLocale, useIntl, useLocation, useModel } from '@umijs/max';
import { App, Button, Card, Divider, Dropdown, Form, Input, Typography } from 'antd';
import { useEffect, useState } from 'react';

const HIGHLIGHTS = ['dashboard', 'system', 'maps', 'i18n'];

const Login: React.FC = () => {
  // App 上下文中的 message：跳转离开登录页后提示仍然可见
  const { message: messageApi } = App.useApp();
  const intl = useIntl();
  const t = (id: string) => intl.formatMessage({ id });
  const location = useLocation();
  const { initialState, setInitialState } = useModel('@@initialState');
  const { dark, toggle } = useThemeMode();
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
    // 背景与文字色用 antd token 类（登录页在 umi 包裹的 antd <App> 容器内），暗色模式随算法切换
    <div className="flex min-h-screen bg-bg-layout">
      <aside
        className="hidden w-5/12 max-w-[640px] flex-col justify-between p-12 text-white lg:flex"
        style={{ background: 'linear-gradient(150deg, #0b1a33 0%, #12345c 55%, #1d4f8f 100%)' }}
      >
        <div className="flex items-center gap-3 text-lg font-semibold">
          <img src={`${PUBLIC_PATH}logo.svg`} alt="" className="h-8 w-8" />
          React Admin
        </div>
        <div>
          <h1 className="m-0 text-3xl leading-snug font-semibold">{t('login.headline')}</h1>
          <p className="mt-4 text-base leading-relaxed opacity-80">{t('login.subhead')}</p>
          <ul className="mt-8 list-none space-y-3 p-0">
            {HIGHLIGHTS.map((key) => (
              <li key={key} className="flex items-start gap-3 opacity-90">
                <CheckCircleFilled className="mt-1" style={{ color: '#69b1ff' }} />
                {t(`login.highlight.${key}`)}
              </li>
            ))}
          </ul>
        </div>
        <div className="text-xs opacity-60">Umi Max · React 19 · Ant Design 6 · AntV · Cesium · OpenLayers</div>
      </aside>

      <main className="relative flex flex-1 items-center justify-center px-4 py-16">
        <div className="absolute top-4 right-4 flex gap-1">
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
            <Button type="text" aria-label={t('header.language')} icon={<TranslationOutlined />} />
          </Dropdown>
        </div>

        <div className="w-full max-w-sm">
          {/* 窄屏隐藏了左侧产品介绍：卡片上方保留标识与一句话定位，不至于只剩一个孤零零的登录框 */}
          <div className="mb-6 flex items-center gap-3 lg:hidden">
            <img src={`${PUBLIC_PATH}logo.svg`} alt="" className="h-10 w-10" />
            <div className="min-w-0">
              <Typography.Text strong className="block text-lg">
                React Admin
              </Typography.Text>
              <Typography.Text type="secondary" className="text-xs">
                {t('login.headline')}
              </Typography.Text>
            </div>
          </div>
          <Card className="shadow-sm" title={t('login.title')}>
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
              onFinish={signIn}
            >
              <Form.Item
                label={t('login.username')}
                name="name"
                rules={[{ required: true, message: t('login.usernameRequired') }]}
              >
                <Input autoComplete="username" />
              </Form.Item>
              <Form.Item
                label={t('login.password')}
                name="password"
                rules={[{ required: true, message: t('login.passwordRequired') }]}
              >
                <Input.Password autoComplete="current-password" />
              </Form.Item>
              <Button block htmlType="submit" loading={!!pending}>
                {t('login.submit')}
              </Button>
            </Form>
            {DEMO_MODE && (
              <Typography.Paragraph type="secondary" className="mt-4 mb-0 text-center text-xs">
                {t('login.demoHint')}
              </Typography.Paragraph>
            )}
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Login;
