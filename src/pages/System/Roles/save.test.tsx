// @vitest-environment jsdom
import { act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

/** 角色页的安全边界：提交前必须把勾选键收敛到服务端认得的权限键集合，管理员角色只读 */
const roles = vi.hoisted(() => [
  { id: 'lead', permissions: ['dashboard.view'], memberCount: 2, updatedAt: '2026-10-14T00:00:00.000Z' },
  {
    id: 'admin',
    permissions: ['dashboard.view', 'system.user.create'],
    memberCount: 1,
    updatedAt: '2026-10-14T00:00:00.000Z',
  },
]);

const api = vi.hoisted(() => ({ reload: vi.fn() }));
vi.mock('@/hooks/useApi', () => ({
  useApi: () => ({ data: roles, loading: false, error: undefined, reload: api.reload }),
}));

const services = vi.hoisted(() => ({
  listRoles: vi.fn(),
  updateRolePermissions: vi.fn(),
  resetRolePermissions: vi.fn(),
}));
vi.mock('@/services/system', () => services);

/** 当前会话：默认是持有全部权限的管理员；用例可改成定制角色 */
const session = vi.hoisted(() => ({ roleKey: 'admin', held: undefined as Set<string> | undefined }));
vi.mock('@umijs/max', () => ({
  useIntl: () => ({ locale: 'zh-CN', formatMessage: ({ id }: { id: string }) => id }),
  useAccess: () => ({ permission: (key: string) => session.held?.has(key) ?? true }),
  useModel: () => ({ initialState: { roleKey: session.roleKey } }),
}));
vi.mock('@/components/DemoPage', () => ({ default: ({ children }: { children: ReactNode }) => <>{children}</> }));
vi.mock('@/hooks/useEnums', () => ({ useEnums: () => ({ label: (_g: string, key: string) => key }) }));

const message = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
type TreeNode = { key: string; disabled?: boolean; disableCheckbox?: boolean; children?: TreeNode[] };
/** Tree mock 收到的 treeData（断言哪些权限点可勾选） */
const tree = vi.hoisted(() => ({ data: [] as { key: string; disableCheckbox?: boolean; children?: unknown[] }[] }));

vi.mock('antd', () => {
  const PassThrough = ({ children }: { children?: ReactNode }) => <div>{children}</div>;
  return {
    Alert: ({ title }: { title?: ReactNode }) => <div data-testid="role-locked">{title}</div>,
    App: { useApp: () => ({ message }) },
    Button: ({ children, onClick, disabled }: { children?: ReactNode; onClick?: () => void; disabled?: boolean }) => (
      <button type="button" onClick={onClick} disabled={disabled}>
        {children}
      </button>
    ),
    Card: ({ children, actions }: { children?: ReactNode; actions?: ReactNode }) => (
      <div>
        {actions}
        {children}
      </div>
    ),
    Col: PassThrough,
    Listy: ({
      items,
      itemRender,
    }: {
      items: typeof roles;
      itemRender: (item: (typeof roles)[number]) => ReactNode;
    }) => (
      <div>
        {items.map((item) => (
          <div key={item.id}>{itemRender(item)}</div>
        ))}
      </div>
    ),
    Row: PassThrough,
    Skeleton: PassThrough,
    Space: PassThrough,
    Tree: ({ onCheck, treeData }: { onCheck: (keys: string[]) => void; treeData: TreeNode[] }) => {
      tree.data = treeData;
      return (
        <button type="button" data-role="check" onClick={() => onCheck(['dashboard.view', 'forge.superuser'])}>
          check
        </button>
      );
    },
    Typography: { Paragraph: PassThrough, Text: PassThrough },
  };
});

import Roles from './index';

beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  services.updateRolePermissions.mockReset().mockResolvedValue(undefined);
  services.resetRolePermissions.mockReset().mockResolvedValue(undefined);
  message.success.mockReset();
  api.reload.mockReset();
  session.roleKey = 'admin';
  session.held = undefined;
});

const leaf = (key: string) =>
  (tree.data as TreeNode[]).flatMap((group) => group.children ?? []).find((node) => node.key === key);

const mount = () => {
  const host = document.createElement('div');
  document.body.append(host);
  const root: Root = createRoot(host);
  act(() => root.render(<Roles />));
  const button = (label: string) =>
    [...host.querySelectorAll('button')].find((element) => element.textContent === label);
  return { host, root, button, unmount: () => act(() => root.unmount()) };
};

const click = (element: Element | null | undefined) =>
  act(() => {
    element?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });

/** 保存是异步的：点击与等 promise 链必须在同一个 async act 内，否则状态更新落在 act 之外 */
const clickAndSettle = (element: Element | null | undefined) =>
  act(async () => {
    element?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await new Promise((resolve) => {
      setTimeout(resolve, 0);
    });
  });

describe('Roles permission save boundary', () => {
  it('sends only permission keys the server knows, dropping forged ones', async () => {
    const harness = mount();

    // 勾选里混入一个不在 PERMISSION_KEYS 里的键（伪造/陈旧节点）
    await click(harness.host.querySelector('[data-role="check"]'));
    await clickAndSettle(harness.button('common.save'));

    expect(services.updateRolePermissions).toHaveBeenCalledWith('lead', ['dashboard.view']);
    expect(api.reload).toHaveBeenCalled();
    harness.unmount();
  });

  it('keeps the admin role read-only (no save/restore actions, no writes)', async () => {
    const harness = mount();

    await click([...harness.host.querySelectorAll('[role="button"]')].find((el) => el.textContent?.includes('admin')));

    expect(harness.button('common.save')).toBeUndefined();
    expect(harness.button('roles.restoreDefault')).toBeUndefined();
    expect(services.updateRolePermissions).not.toHaveBeenCalled();
    harness.unmount();
  });

  it('locks the signed-in role (no save/restore) because the server refuses self-edits', async () => {
    session.roleKey = 'lead';
    const harness = mount();

    expect(harness.host.querySelector('[data-testid="role-locked"]')?.textContent).toBe('roles.selfLocked');
    expect(harness.button('common.save')).toBeUndefined();
    expect(harness.button('roles.restoreDefault')).toBeUndefined();
    harness.unmount();
  });

  it('greys out permissions the caller does not hold unless the role already has them', () => {
    session.roleKey = 'viewer';
    session.held = new Set(['dashboard.view', 'system.role.view', 'system.role.update']);
    const harness = mount();

    expect(leaf('system.user.role.assign')?.disableCheckbox).toBe(true);
    expect(leaf('system.role.update')?.disableCheckbox).toBe(false);
    // lead 角色原本就有 dashboard.view：保留 / 收回都不算授予
    expect(leaf('dashboard.view')?.disableCheckbox).toBe(false);
    expect(harness.host.textContent).toContain('roles.grantLimitHint');
    harness.unmount();
  });
});
