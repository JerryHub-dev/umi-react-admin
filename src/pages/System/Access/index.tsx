import DemoPage from '@/components/DemoPage';
import UserAvatar from '@/components/UserAvatar';
import { DEMO_MODE } from '@/demo/mode';
import { useApi } from '@/hooks/useApi';
import { useEnums } from '@/hooks/useEnums';
import { login } from '@/services/auth';
import { listDevices } from '@/services/ops';
import { BizError } from '@/utils/BizError';
import { CheckCircleFilled, LockFilled, SwapOutlined } from '@ant-design/icons';
import { Access, Link, useAccess, useIntl, useModel } from '@umijs/max';
import { Alert, App, Button, Card, Col, Listy, Row, Space, Table, Tag, Typography, theme } from 'antd';

/** 前端脱敏演示：坐标只保留一位小数（约 10 公里精度）。真实系统必须在服务端脱敏，这里只演示呈现效果 */
const maskCoord = (value: number) => `${value.toFixed(1)}***`;

const ADMIN_ROUTES = [
  { path: '/system/users', menu: 'menu.system.users', permission: 'system.user.view' },
  { path: '/system/roles', menu: 'menu.system.roles', permission: 'system.role.view' },
  { path: '/system/logs', menu: 'menu.system.logs', permission: 'system.log.view' },
];

export default function AccessDemo() {
  const intl = useIntl();
  const { message } = App.useApp();
  const t = (id: string, values?: Record<string, string | number>) => intl.formatMessage({ id }, values);
  /** 文案里嵌一段代码（代码不翻译，也不写进文案：ICU 会把花括号 / 尖括号当语法解析） */
  const withCode = (id: string, code: string) =>
    intl.formatMessage({ id }, { code: <Typography.Text code>{code}</Typography.Text> });
  const enums = useEnums();
  const access = useAccess();
  const { token } = theme.useToken();
  const { initialState } = useModel('@@initialState');
  const isAdmin = access.canSeeAdmin;
  // 权限点即口径（F02）：本页展示的判断与菜单/按钮/演示接口共用同一份 key
  const canDeleteUser = access.permission('system.user.delete');
  const canExportReport = access.permission('doc.export');
  // 数据级：设备列表对所有身份开放，但精确坐标只有管理员可见
  const { data: sample } = useApi(() => listDevices({ pageSize: 5 }).then((page) => page.list));

  /** 切换身份：用另一个体验账号重新登录，整页刷新让路由、菜单、权限全部按新身份生效 */
  const switchIdentity = async () => {
    if (!DEMO_MODE) return;
    try {
      await login({ name: isAdmin ? 'guest' : 'admin', password: 'demo' });
      window.location.reload();
    } catch (error) {
      message.error(error instanceof BizError ? error.message : t('login.failed'));
    }
  };

  const rows = (sample ?? []).map((device) => ({
    key: device.id,
    name: device.name,
    coords: isAdmin
      ? `${device.lng.toFixed(4)}, ${device.lat.toFixed(4)}`
      : `${maskCoord(device.lng)}, ${maskCoord(device.lat)}`,
  }));

  return (
    <DemoPage descriptionId="page.access.desc" source="src/pages/System/Access/index.tsx">
      <Space orientation="vertical" size={16} className="w-full">
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <Space size={16}>
              <UserAvatar name={initialState?.nickName || initialState?.name || ''} size={44} />
              <div>
                <Tag color={isAdmin ? 'blue' : 'default'}>{enums.label('role', isAdmin ? 'admin' : 'viewer')}</Tag>
                <Typography.Text type="secondary">
                  {t(isAdmin ? 'access.identity.admin' : 'access.identity.user')}
                </Typography.Text>
              </div>
            </Space>
            {DEMO_MODE && (
              <Button type="primary" icon={<SwapOutlined />} onClick={switchIdentity}>
                {t(isAdmin ? 'access.switchToGuest' : 'access.switchToAdmin')}
              </Button>
            )}
          </div>
        </Card>

        <Row gutter={[16, 16]}>
          <Col xs={24} lg={8}>
            <Card title={t('access.route.title')} className="h-full">
              <Typography.Paragraph type="secondary">
                {withCode('access.route.desc', 'access: permission key')}
              </Typography.Paragraph>
              <Listy
                items={ADMIN_ROUTES}
                rowKey="path"
                styles={{ item: { paddingBlock: 12, paddingInline: 0 } }}
                itemRender={(route) => (
                  <div className="flex items-center justify-between gap-2">
                    <span className="min-w-0">
                      <Link to={route.path}>{t(route.menu)}</Link>
                      <br />
                      <Typography.Text code className="text-xs">
                        {route.permission}
                      </Typography.Text>
                    </span>
                    {access.permission(route.permission) ? (
                      <Tag icon={<CheckCircleFilled />} color="success">
                        {t('access.route.allowed')}
                      </Tag>
                    ) : (
                      <Tag icon={<LockFilled />}>{t('access.route.denied')}</Tag>
                    )}
                  </div>
                )}
              />
            </Card>
          </Col>
          <Col xs={24} lg={8}>
            <Card title={t('access.button.title')} className="h-full">
              <Typography.Paragraph type="secondary">
                {withCode('access.button.desc', '<Access accessible={…}>')}
              </Typography.Paragraph>
              <Space wrap>
                <Button disabled={!canExportReport}>{t('access.button.export')}</Button>
                <Access accessible={canDeleteUser}>
                  <Button danger>{t('access.button.deleteUser')}</Button>
                </Access>
                <Access
                  accessible={canDeleteUser}
                  fallback={<Button disabled>{t('access.button.resetPassword')}</Button>}
                >
                  <Button>{t('access.button.resetPassword')}</Button>
                </Access>
              </Space>
              {!canDeleteUser && (
                <Typography.Paragraph type="secondary" className="mt-3 text-xs">
                  {t('access.button.deleteUser')} {t('access.button.hiddenHint')}
                </Typography.Paragraph>
              )}
              <Typography.Paragraph type="secondary" className="mt-3 text-xs">
                {t('access.permissions.count', { count: initialState?.permissions?.size ?? 0 })}
              </Typography.Paragraph>
            </Card>
          </Col>
          <Col xs={24} lg={8}>
            <Card title={t('access.data.title')} className="h-full">
              <Typography.Paragraph type="secondary">{t('access.data.desc')}</Typography.Paragraph>
              <Table
                size="small"
                pagination={false}
                dataSource={rows}
                columns={[
                  { title: t('screenshot.device'), dataIndex: 'name' },
                  {
                    title: t('access.data.coords'),
                    dataIndex: 'coords',
                    render: (value: string) => (
                      <Typography.Text code style={{ color: isAdmin ? undefined : token.colorTextTertiary }}>
                        {value}
                      </Typography.Text>
                    ),
                  },
                ]}
              />
            </Card>
          </Col>
        </Row>
        <Alert type="info" showIcon title={t('access.note')} />
      </Space>
    </DemoPage>
  );
}
