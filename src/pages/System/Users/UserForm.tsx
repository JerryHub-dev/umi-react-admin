import { DEPARTMENT_KEYS, USER_STATUS_KEYS } from '@/constants/enums';
import { ASSIGNABLE_ROLE_KEYS, ROLE_KEYS } from '@/constants/permissions';
import { useEnums } from '@/hooks/useEnums';
import type { RoleKey, User, UserCreateInput } from '@/services/types';
import { ModalForm, ProFormRadio, ProFormSelect, ProFormText } from '@ant-design/pro-components';
import { useAccess, useIntl, useModel } from '@umijs/max';

const PROTECTED = new Set(['admin', 'guest']);

type UserFormProps = {
  /** undefined 关闭；null 新建；User 编辑 */
  user: User | null | undefined;
  onClose: () => void;
  /**
   * 统一提交入口：资料字段 + 可选的 role。
   * 调用方负责把 role 路由到独立入口（编辑走 assignUserRole），
   * 表单本身不决定权限——它只按 access 决定渲染什么。
   */
  onSubmit: (values: UserCreateInput) => Promise<void>;
};

/**
 * 组装提交载荷（导出以便单测：这是 F1 的 UI 侧边界，写错会把整条资料编辑路径打断）。
 *
 * 关键约束：**role 只在「本次表单真的可以分配角色」时才进入载荷**。
 * - 无 system.user.role.assign 的调用者只编辑资料：一旦带上 role，服务端会按 F1 判 403，
 *   整条编辑路径会被打断（E2E「重置演示数据清除改动」就是这样暴露出来的）。
 * - 改自己 / 既有 admin、lead 时角色只读，同样不得回传。
 * 表单里 disabled 的控件仍会出现在 values 中（antd Form 会带上禁用的字段值），
 * 所以这里必须显式按权限裁剪，不能依赖 disabled 本身。
 */
export const buildUserSubmission = (
  values: Record<string, unknown>,
  { roleEditable }: { roleEditable: boolean },
): UserCreateInput => ({
  name: String(values.name ?? ''),
  username: String(values.username ?? ''),
  email: String(values.email ?? ''),
  department: values.department as UserCreateInput['department'],
  ...(roleEditable && values.role ? { role: values.role as RoleKey } : {}),
  ...(values.status ? { status: values.status as UserCreateInput['status'] } : {}),
});

export default function UserForm({ user, onClose, onSubmit }: UserFormProps) {
  const intl = useIntl();
  const t = (id: string) => intl.formatMessage({ id });
  const enums = useEnums();
  const access = useAccess();
  const { initialState } = useModel('@@initialState');
  const editing = !!user;
  const roleSelectable = access.systemUserRoleAssign;
  /**
   * 自己也不能改自己的角色（审查 F1）：服务端对所有身份一律 403，
   * UI 在这里同步置灰，避免走完表单才被拒。判定口径与会话用户名一致。
   */
  const isSelf = editing && !!initialState?.name && initialState.name === user.username;
  const roleReadOnly = editing && (isSelf || user.role === 'admin' || user.role === 'lead');
  /**
   * 可分配范围由 ASSIGNABLE_ROLE_KEYS 决定（与演示后端同一份常量）。
   * admin / lead 不在范围内：委派管理员不能把别人提升到自己之上，也就没有二级跳板。
   * 只读场景（自己 / 既有 admin / lead）只展示当前角色，不提供下拉。
   */
  const roleOptions = roleSelectable
    ? enums.options('role', roleReadOnly ? ([user.role] as RoleKey[]) : ASSIGNABLE_ROLE_KEYS)
    : enums.options('role', ROLE_KEYS);
  const roleHint = isSelf
    ? t('users.roleSelfHint')
    : roleReadOnly
      ? t('users.roleLockedHint')
      : roleSelectable
        ? t('users.roleAssignHint')
        : undefined;
  /** 角色是否可编辑：无权限、改自己、既有 admin/lead 都不可编辑（只读展示） */
  const roleEditable = roleSelectable && !roleReadOnly;

  return (
    <ModalForm<Record<string, unknown>>
      title={t(editing ? 'users.edit' : 'users.create')}
      open={user !== undefined}
      width={520}
      // 新建时给可分配范围内的默认角色（否则 required 的角色选择器会让表单无法提交）；
      // 无角色分配权限时不给默认值，避免把 role 带进载荷
      initialValues={user ?? { department: 'support', ...(roleEditable ? { role: 'viewer' } : {}) }}
      modalProps={{ destroyOnHidden: true, onCancel: onClose }}
      onFinish={async (values) => {
        await onSubmit(buildUserSubmission(values, { roleEditable }));
        return true;
      }}
    >
      <ProFormText name="name" label={t('users.column.name')} rules={[{ required: true }]} />
      <ProFormText
        name="username"
        label={t('users.column.username')}
        // 当前登录账号也不能改登录名：演示会话按登录名解析，服务端同样拒绝（routes.ts selfRenameForbidden）
        disabled={!!user && (PROTECTED.has(user.username) || isSelf)}
        tooltip={
          user && PROTECTED.has(user.username)
            ? t('users.protectedHint')
            : isSelf
              ? t('users.selfUsernameHint')
              : undefined
        }
        rules={[{ required: true }, { pattern: /^[a-z][a-z0-9._-]{2,31}$/i, message: t('users.usernameRule') }]}
      />
      <ProFormText name="email" label={t('users.column.email')} rules={[{ required: true }, { type: 'email' }]} />
      <ProFormSelect
        name="department"
        label={t('users.column.department')}
        options={enums.options('department', DEPARTMENT_KEYS)}
        rules={[{ required: true }]}
      />
      {/* 角色分配独立权限（F1）：没有权限、改自己、或既有 admin/lead 时只读展示 */}
      <ProFormSelect
        name="role"
        label={t('users.column.role')}
        options={roleOptions}
        disabled={!roleEditable}
        tooltip={roleHint}
        rules={roleEditable ? [{ required: true }] : undefined}
      />
      {editing && (
        <ProFormRadio.Group
          name="status"
          label={t('users.column.status')}
          radioType="button"
          options={enums.options('userStatus', USER_STATUS_KEYS)}
        />
      )}
    </ModalForm>
  );
}
