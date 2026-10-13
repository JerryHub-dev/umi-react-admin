import type { RoleKey } from '@/services/types';

/**
 * 权限点树（key 即 i18n 键 `permission.<key>` 的后缀）。角色管理页渲染它，演示后端按它初始化角色。
 * 它是菜单（config/routes.ts access）、按钮（useAccess）与演示接口（src/demo/server 路由）的唯一授权口径，
 * 三处共用同一份 key，不允许另建一套判断。
 */
export type PermissionNode = { key: string; children?: PermissionNode[] };

export const PERMISSION_TREE: PermissionNode[] = [
  { key: 'dashboard', children: [{ key: 'dashboard.view' }] },
  {
    key: 'system',
    children: [
      { key: 'system.user.view' },
      { key: 'system.user.create' },
      { key: 'system.user.update' },
      { key: 'system.user.delete' },
      { key: 'system.role.view' },
      { key: 'system.role.update' },
      { key: 'system.log.view' },
      { key: 'system.demo.reset' },
    ],
  },
  {
    key: 'ops',
    children: [
      { key: 'ops.device.view' },
      { key: 'ops.device.update' },
      { key: 'ops.alarm.view' },
      { key: 'ops.alarm.handle' },
      { key: 'ops.ticket.view' },
      { key: 'ops.ticket.assign' },
      { key: 'ops.ticket.close' },
      { key: 'ops.ticket.accept' },
      { key: 'ops.schedule.update' },
    ],
  },
  { key: 'doc', children: [{ key: 'doc.export' }] },
];

/** 叶子权限点 */
export const PERMISSION_KEYS: string[] = PERMISSION_TREE.flatMap((group) => group.children?.map((c) => c.key) ?? []);

const pick = (prefixes: string[]) => PERMISSION_KEYS.filter((key) => prefixes.some((p) => key.startsWith(p)));

/**
 * 五种角色的默认权限（完整矩阵见 docs/demo/role-matrix.md）：
 * - admin 系统管理员：完整本地演示管理与场景重置
 * - lead 值班长：业务查看、告警研判、派工/流转、验收、当班日程与日志查阅，不碰全局角色权限
 * - operator 运维工程师：按授权处理工单与告警（开始处理/完成），无系统管理与派工/验收
 * - analyst 数据分析员：业务只读 + 导出业务报表，不能处置/派工/验收/导入用户/改日程
 * - viewer 访客：只读工作台与设备概况
 */
export const DEFAULT_ROLE_PERMISSIONS: Record<RoleKey, string[]> = {
  admin: PERMISSION_KEYS,
  lead: pick(['dashboard.', 'system.user.view', 'system.log.view', 'ops.', 'doc.']),
  operator: pick([
    'dashboard.',
    'ops.device.view',
    'ops.alarm.view',
    'ops.alarm.handle',
    'ops.ticket.view',
    'ops.ticket.close',
  ]),
  analyst: pick(['dashboard.', 'ops.device.view', 'ops.alarm.view', 'ops.ticket.view', 'doc.']),
  viewer: pick(['dashboard.', 'ops.device.view']),
};

export const ROLE_KEYS: RoleKey[] = ['admin', 'lead', 'operator', 'analyst', 'viewer'];
