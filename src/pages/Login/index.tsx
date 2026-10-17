import ParticleField from '@/components/ParticleField';
import { REPO_URL } from '@/constants/repo';
import { DEMO_MODE } from '@/demo/mode';
import { useThemeMode } from '@/hooks/useThemeMode';
import { login, type LoginParams } from '@/services/auth';
import { readTheme } from '@/utils/Auth/initialState';
import { readLoginReason } from '@/utils/Auth/loginUrl';
import { safeRedirect } from '@/utils/Auth/safeRedirect';
import { UserInfo } from '@/utils/Auth/userInfo';
import { BizError } from '@/utils/BizError';
import { formatDateTime } from '@/utils/format';
import { menuKeyOf } from '@/utils/pageTitle';
import {
  EyeOutlined,
  GithubOutlined,
  LockOutlined,
  MoonOutlined,
  SafetyCertificateOutlined,
  SunOutlined,
  TranslationOutlined,
  UserOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import { getLocale, history, matchRoutes, setLocale, useAppData, useIntl, useLocation, useModel } from '@umijs/max';
import type { InputRef } from 'antd';
import {
  Alert,
  App,
  Button,
  Checkbox,
  Divider,
  Dropdown,
  Form,
  Input,
  Popover,
  theme,
  Tooltip,
  Typography,
} from 'antd';
import { useEffect, useMemo, useRef, useState } from 'react';
import { readRememberedName, writeRememberedName } from './rememberedName';

// 亮点前的小圆点取自粒子色环，与背景呼应
const HIGHLIGHTS = [
  { key: 'dashboard', color: '#1677ff' },
  { key: 'system', color: '#722ed1' },
  { key: 'maps', color: '#eb2f96' },
  { key: 'i18n', color: '#fa8c16' },
];

/** 一键体验的四个非管理员角色（管理员单独一个主按钮） */
const DEMO_ROLES = ['lead', 'operator', 'analyst', 'guest'] as const;

/** 登录请求的发起处：表单提交，或某个一键体验角色 */
type Source = 'form' | 'admin' | (typeof DEMO_ROLES)[number];

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
  const [form] = Form.useForm<LoginParams>();
  const passwordRef = useRef<InputRef>(null);
  const [pending, setPending] = useState<Source>();
  const [error, setError] = useState<string>();
  const [capsLock, setCapsLock] = useState(false);
  // 光标在输入框里时让背景的浪平静下来，不和输入抢注意力
  const [typing, setTyping] = useState(false);
  // 真实登录才有「记住账号」：演示模式的表单本身就预填了 admin / demo
  const [rememberedName] = useState(() => (DEMO_MODE ? '' : readRememberedName()));
  const [remember, setRemember] = useState(!!rememberedName);
  // 会话失效被请求层整页送回来时，地址上带着原因；整页跳转冲掉了当时的 toast，这里常驻展示
  const reason = readLoginReason(location.search);
  // 带着回跳地址来的（打开受保护页面、会话失效）：告诉用户登录后回到哪一页，名称与菜单同源
  const { clientRoutes } = useAppData();
  const redirectTo = safeRedirect(location.search);
  const returnPage = useMemo(() => {
    if (redirectTo === '/') return undefined;
    // umi 的 IClientRoute 与 react-router 的 RouteObject 结构兼容，只是类型未对齐
    const chain = matchRoutes(clientRoutes as Parameters<typeof matchRoutes>[0], redirectTo.split(/[?#]/)[0]) ?? [];
    const key = menuKeyOf(chain.map((match) => match.route as { name?: unknown }));
    return key && intl.messages[key] ? intl.formatMessage({ id: key }) : undefined;
  }, [clientRoutes, redirectTo, intl]);

  // 登录态真正写入全局状态之后再跳转。此前在 setInitialState 之后立即 push：状态尚未提交时
  // 路由守卫看到的仍是未登录，又被重定向回登录页（登录请求变为异步后稳定复现）
  const signedIn = !!initialState?.name;
  useEffect(() => {
    if (signedIn) {
      history.replace(redirectTo);
    }
  }, [signedIn, redirectTo]);

  const signIn = async ({ name, password }: LoginParams, source: Source) => {
    // 同一时刻只允许一个登录请求：连点两个角色会并发登录，后返回的那个覆盖前一个
    if (pending) return;
    setPending(source);
    setError(undefined);
    try {
      const { user } = await login({ name, password });
      if (!DEMO_MODE && source === 'form') writeRememberedName(remember ? name : undefined);
      // 立即刷新全局初始状态（保留当前主题），让路由守卫与 access 权限即时生效
      await setInitialState({ ...new UserInfo(user), theme: readTheme() });
      messageApi.success(t('login.success'));
    } catch (err) {
      // 失败提示留在卡片里（toast 几秒就消失，读屏软件也未必读到），直到下一次提交
      setError(err instanceof BizError ? err.message : t('login.failed'));
      if (!DEMO_MODE && source === 'form') {
        form.setFieldValue('password', '');
        passwordRef.current?.focus();
      }
    } finally {
      setPending(undefined);
    }
  };

  const busy = (source: Source) => ({ loading: pending === source, disabled: !!pending && pending !== source });
  const onCapsLock = (event: React.KeyboardEvent) => setCapsLock(event.getModifierState('CapsLock'));
  const { sha, time, target } = BUILD_INFO;

  return (
    // 底色与文字色用 antd token（登录页在 umi 包裹的 antd <App> 容器内），暗色模式随算法切换
    <div className="relative min-h-screen overflow-hidden" style={{ background: pageBg }}>
      {/* Windows 高对比度模式下装饰画布只会干扰阅读，直接隐藏 */}
      <ParticleField
        dark={dark}
        quiet={typing}
        className="pointer-events-none absolute inset-0 h-full w-full forced-colors:hidden"
      />

      <div className="relative flex min-h-screen flex-col">
        <header className="flex items-center justify-between px-5 py-4 sm:px-10 sm:py-6">
          <div className="flex items-center gap-3 text-base font-semibold text-text">
            <img src={`${PUBLIC_PATH}logo.svg`} alt="" className="h-8 w-8" />
            React Admin
          </div>
          <div className="flex gap-1">
            {/* 源码入口只在公开演示站出现：基于模板的真实系统登录页不该指向模板仓库 */}
            {DEMO_MODE && (
              <Tooltip title={t('login.repo')}>
                <Button
                  type="text"
                  aria-label={t('login.repo')}
                  icon={<GithubOutlined />}
                  href={REPO_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                />
              </Tooltip>
            )}
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
            onFocus={(event) => setTyping(event.target instanceof HTMLInputElement)}
            onBlur={(event) => {
              const next = event.relatedTarget;
              if (!(next instanceof HTMLInputElement && event.currentTarget.contains(next))) setTyping(false);
            }}
          >
            <h2 className="m-0 text-2xl font-semibold text-text">{t('login.title')}</h2>
            <Typography.Paragraph type="secondary" className="mt-1 mb-6">
              {returnPage ? intl.formatMessage({ id: 'login.returnTo' }, { page: returnPage }) : t('login.subtitle')}
            </Typography.Paragraph>
            {(error || reason === 'expired') && (
              <Alert className="mb-5" type={error ? 'error' : 'warning'} showIcon title={error ?? t('login.expired')} />
            )}
            {DEMO_MODE && (
              <div className="flex flex-col gap-3">
                <Button
                  size="large"
                  type="primary"
                  block
                  icon={<SafetyCertificateOutlined />}
                  {...busy('admin')}
                  onClick={() => signIn({ name: 'admin', password: 'demo' }, 'admin')}
                >
                  {t('login.asAdmin')}
                </Button>
                <Typography.Text type="secondary" className="-mt-2 text-center text-xs">
                  {t('login.asAdminDesc')}
                </Typography.Text>
                {/* 五种角色的快捷体验（F02）：一次点击即以对应角色进入；悬停看该角色能做什么（口径见角色矩阵） */}
                <div className="grid grid-cols-2 gap-2">
                  {DEMO_ROLES.map((name) => (
                    <Tooltip key={name} title={t(`login.as.${name}.desc`)}>
                      <Button
                        block
                        icon={name === 'guest' ? <EyeOutlined /> : undefined}
                        {...busy(name)}
                        onClick={() => signIn({ name, password: 'demo' }, name)}
                      >
                        {t(`login.as.${name}`)}
                      </Button>
                    </Tooltip>
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
              form={form}
              initialValues={
                DEMO_MODE ? { name: 'admin', password: 'demo' } : rememberedName ? { name: rememberedName } : undefined
              }
              layout="vertical"
              requiredMark={false}
              size="large"
              onFinish={(values) => signIn(values, 'form')}
            >
              <Form.Item
                label={t('login.username')}
                name="name"
                rules={[{ required: true, whitespace: true, message: t('login.usernameRequired') }]}
              >
                <Input
                  autoComplete="username"
                  // 真实登录打开页面就能直接输入；记住了账号时光标直接落在密码框
                  autoFocus={!DEMO_MODE && !rememberedName}
                  prefix={<UserOutlined className="text-text-tertiary" />}
                />
              </Form.Item>
              <Form.Item
                label={t('login.password')}
                name="password"
                rules={[{ required: true, message: t('login.passwordRequired') }]}
                extra={
                  capsLock && (
                    <Typography.Text type="warning" className="text-sm" role="status">
                      <WarningOutlined /> {t('login.capsLock')}
                    </Typography.Text>
                  )
                }
              >
                <Input.Password
                  ref={passwordRef}
                  autoComplete="current-password"
                  autoFocus={!DEMO_MODE && !!rememberedName}
                  prefix={<LockOutlined className="text-text-tertiary" />}
                  onKeyDown={onCapsLock}
                  onKeyUp={onCapsLock}
                  onBlur={() => setCapsLock(false)}
                />
              </Form.Item>
              {!DEMO_MODE && (
                <div className="-mt-2 mb-5 flex items-center justify-between">
                  <Checkbox checked={remember} onChange={(event) => setRemember(event.target.checked)}>
                    {t('login.remember')}
                  </Checkbox>
                  {/* 后台账号由管理员开通与重置，没有自助找回：说明去找谁，比一个点了没反应的链接诚实 */}
                  <Popover
                    trigger="click"
                    placement="topRight"
                    content={<div className="max-w-64">{t('login.forgotHelp')}</div>}
                  >
                    <Button type="link" className="px-0">
                      {t('login.forgot')}
                    </Button>
                  </Popover>
                </div>
              )}
              {/* 演示模式的主操作是上方的一键体验，这里退为次要按钮；真实登录时它就是唯一的主操作 */}
              <Button block type={DEMO_MODE ? 'default' : 'primary'} htmlType="submit" {...busy('form')}>
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

        <footer className="flex flex-col items-center gap-1 px-5 pb-5 text-xs text-text-tertiary sm:px-10 lg:flex-row lg:justify-between">
          <span>Umi Max · React 19 · Ant Design 6 · AntV · Cesium · OpenLayers</span>
          {/* 与工作台页脚、dist/version.json 同源：登录前就能看出线上跑的是哪个版本 */}
          <span>
            {intl.formatMessage({ id: 'footer.build' }, { time: formatDateTime(time, 'YYYY-MM-DD HH:mm'), target })}{' '}
            {sha === 'unknown' ? (
              sha.slice(0, 7)
            ) : (
              <Typography.Link href={`${REPO_URL}/commit/${sha}`} target="_blank" rel="noopener noreferrer">
                {sha.slice(0, 7)}
              </Typography.Link>
            )}
          </span>
        </footer>
      </div>
    </div>
  );
};

export default Login;
