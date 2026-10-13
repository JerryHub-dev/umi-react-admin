import DemoPage from '@/components/DemoPage';
import UserAvatar from '@/components/UserAvatar';
import { DEPARTMENT_KEYS, USER_STATUS_KEYS } from '@/constants/enums';
import { ROLE_KEYS } from '@/constants/permissions';
import { useEnums } from '@/hooks/useEnums';
import { useResponsiveTable } from '@/hooks/useResponsiveTable';
import type { User, UserBatchAction, UserInput } from '@/services/types';
import { batchUsers, createUser, deleteUser, listUsers, updateUser } from '@/services/users';
import { formatDateTime, fromNow } from '@/utils/format';
import { DownOutlined, MoreOutlined, PlusOutlined } from '@ant-design/icons';
import { ProTable, type ActionType, type ProColumns } from '@ant-design/pro-components';
import { history, useIntl } from '@umijs/max';
import { App, Button, Dropdown, Grid, Popconfirm, Space, Tag, Tooltip, Typography } from 'antd';
import { useRef, useState } from 'react';
import UserDrawer from './UserDrawer';
import UserForm from './UserForm';

const PROTECTED = new Set(['admin', 'guest']);

export default function Users() {
  const intl = useIntl();
  const t = (id: string, values?: Record<string, string | number>) => intl.formatMessage({ id }, values);
  const enums = useEnums();
  const { message, modal } = App.useApp();
  const actionRef = useRef<ActionType>(undefined);
  const [editing, setEditing] = useState<User | null | undefined>(undefined);
  const [viewing, setViewing] = useState<User>();
  const table = useResponsiveTable();
  // 手机上只留「用户 + 状态 + 操作」三列（审计 U02：其余字段靠详情抽屉看，操作不再要横滚去找）
  const { md } = Grid.useBreakpoint();

  const reload = () => actionRef.current?.reload();

  const toggleStatus = async (user: User) => {
    await updateUser(user.id, { status: user.status === 'active' ? 'disabled' : 'active' });
    message.success(t('common.saved'));
    reload();
  };

  const runBatch = async (ids: string[], action: UserBatchAction, clear: () => void) => {
    const count = await batchUsers(ids, action);
    message.success(t('users.batchDone', { count }));
    clear();
    reload();
  };

  const columns: ProColumns<User>[] = [
    {
      title: t('users.keyword'),
      dataIndex: 'keyword',
      hideInTable: true,
      fieldProps: { placeholder: t('users.keywordPlaceholder') },
    },
    {
      title: t('users.column.user'),
      dataIndex: 'name',
      search: false,
      width: 220,
      // 点姓名/邮箱看字段摘要（详情抽屉）：与设备页一致的链接样式，手机上这是主要入口
      render: (_, user) => (
        <Typography.Link onClick={() => setViewing(user)}>
          <UserAvatar name={user.name} description={user.email} />
        </Typography.Link>
      ),
    },
    { title: t('users.column.id'), dataIndex: 'id', search: false, width: 90, sorter: true, responsive: ['md'] },
    {
      title: t('users.column.department'),
      dataIndex: 'department',
      valueEnum: enums.valueEnum('department', DEPARTMENT_KEYS),
      width: 130,
      responsive: ['md'],
    },
    {
      title: t('users.column.role'),
      dataIndex: 'role',
      valueEnum: enums.valueEnum('role', ROLE_KEYS),
      width: 120,
      responsive: ['md'],
      render: (_, user) => (
        <Tag color={user.role === 'admin' ? 'blue' : undefined}>{enums.label('role', user.role)}</Tag>
      ),
    },
    { title: t('users.column.phone'), dataIndex: 'phone', search: false, width: 130, responsive: ['xxl'] },
    {
      title: t('users.column.status'),
      dataIndex: 'status',
      width: 100,
      valueEnum: enums.valueEnum('userStatus', USER_STATUS_KEYS, (key) => ({
        status: { active: 'Success', disabled: 'Default', locked: 'Error' }[key],
      })),
    },
    {
      title: t('users.column.lastLogin'),
      dataIndex: 'lastLoginAt',
      search: false,
      sorter: true,
      width: 130,
      responsive: ['md'],
      render: (_, user) =>
        user.lastLoginAt ? (
          <Tooltip title={formatDateTime(user.lastLoginAt)}>{fromNow(user.lastLoginAt, intl.locale)}</Tooltip>
        ) : (
          t('common.none')
        ),
    },
    {
      title: t('users.column.createdAt'),
      dataIndex: 'createdAt',
      search: false,
      sorter: true,
      width: 120,
      responsive: ['xxl'],
      render: (_, user) => formatDateTime(user.createdAt, 'YYYY-MM-DD'),
    },
    {
      title: t('common.actions'),
      valueType: 'option',
      // 英文「Edit / Disable / Delete」比中文宽，按英文留足，避免最后一个按钮被截断；
      // 手机上收成一个「···」菜单（md 以下），不用横向滚动去找操作列
      width: md ? 210 : 56,
      fixed: table.fixedRight,
      render: (_, user) => {
        const locked = PROTECTED.has(user.username);
        if (!md) {
          return [
            <Dropdown
              key="more"
              menu={{
                items: [
                  { key: 'edit', label: t('common.edit') },
                  user.status === 'active'
                    ? { key: 'toggle', label: t('common.disable'), disabled: locked }
                    : { key: 'toggle', label: t('common.enable') },
                  { key: 'delete', label: t('common.delete'), danger: true, disabled: locked },
                ],
                // 手机菜单里没有 Popconfirm 的落点，停用 / 删除改用 modal.confirm（与批量操作一致）
                onClick: ({ key }) => {
                  if (key === 'edit') {
                    setEditing(user);
                  } else if (key === 'toggle') {
                    if (user.status !== 'active') toggleStatus(user);
                    else
                      modal.confirm({
                        title: t('users.disableConfirm', { name: user.name }),
                        onOk: () => toggleStatus(user),
                      });
                  } else if (key === 'delete') {
                    modal.confirm({
                      title: t('users.deleteConfirm', { name: user.name }),
                      okButtonProps: { danger: true },
                      onOk: async () => {
                        await deleteUser(user.id);
                        message.success(t('common.deleted'));
                        reload();
                      },
                    });
                  }
                },
              }}
            >
              <Button type="text" size="small" icon={<MoreOutlined />} aria-label={t('common.actions')} />
            </Dropdown>,
          ];
        }
        return [
          <Button key="edit" type="link" size="small" onClick={() => setEditing(user)}>
            {t('common.edit')}
          </Button>,
          user.status === 'active' ? (
            <Popconfirm
              key="toggle"
              title={t('users.disableConfirm', { name: user.name })}
              disabled={locked}
              onConfirm={() => toggleStatus(user)}
            >
              <Button type="link" size="small" disabled={locked}>
                {t('common.disable')}
              </Button>
            </Popconfirm>
          ) : (
            <Button key="toggle" type="link" size="small" onClick={() => toggleStatus(user)}>
              {t('common.enable')}
            </Button>
          ),
          <Popconfirm
            key="delete"
            title={t('users.deleteConfirm', { name: user.name })}
            disabled={locked}
            onConfirm={async () => {
              await deleteUser(user.id);
              message.success(t('common.deleted'));
              reload();
            }}
          >
            <Button type="link" size="small" danger disabled={locked}>
              {t('common.delete')}
            </Button>
          </Popconfirm>,
        ];
      },
    },
  ];

  const handleSubmit = async (values: UserInput) => {
    if (editing) {
      await updateUser(editing.id, values);
    } else {
      await createUser(values);
    }
    message.success(t('common.saved'));
    setEditing(undefined);
    reload();
  };

  return (
    <DemoPage descriptionId="page.users.desc" source="src/pages/System/Users/index.tsx">
      <ProTable<User>
        rowKey="id"
        actionRef={actionRef}
        columns={columns}
        scroll={table.scroll}
        search={{ labelWidth: 'auto' }}
        pagination={{ defaultPageSize: 10, showSizeChanger: true }}
        rowSelection={{}}
        tableAlertOptionRender={({ selectedRowKeys, onCleanSelected }) => {
          const ids = selectedRowKeys as string[];
          return (
            <Space>
              <Button size="small" onClick={() => runBatch(ids, 'enable', onCleanSelected)}>
                {t('users.batchEnable')}
              </Button>
              <Button size="small" onClick={() => runBatch(ids, 'disable', onCleanSelected)}>
                {t('users.batchDisable')}
              </Button>
              <Button
                size="small"
                danger
                onClick={() =>
                  modal.confirm({
                    title: t('users.batchDeleteConfirm', { count: ids.length }),
                    okButtonProps: { danger: true },
                    onOk: () => runBatch(ids, 'delete', onCleanSelected),
                  })
                }
              >
                {t('users.batchDelete')}
              </Button>
            </Space>
          );
        }}
        request={async (params, sort) => {
          const [sortField, order] = Object.entries(sort ?? {})[0] ?? [];
          const page = await listUsers({ ...params, sortField, sortOrder: order ?? undefined });
          return { data: page.list, total: page.total, success: true };
        }}
        toolBarRender={() => [
          <Button key="create" type="primary" icon={<PlusOutlined />} onClick={() => setEditing(null)}>
            {t('users.create')}
          </Button>,
          <Dropdown
            key="more"
            menu={{
              items: [{ key: 'excel', label: t('menu.document.excel') }],
              onClick: () => history.push('/document/excel'),
            }}
          >
            <Button>
              {t('users.more')} <DownOutlined />
            </Button>
          </Dropdown>,
        ]}
      />
      <UserForm user={editing} onClose={() => setEditing(undefined)} onSubmit={handleSubmit} />
      <UserDrawer user={viewing} onClose={() => setViewing(undefined)} />
    </DemoPage>
  );
}
