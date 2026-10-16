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
      // 审查 F1：角色分配与普通资料编辑分离。只有该权限能改用户的 role 字段，
      // 且任何身份都不能改自己的 role（否则被授予 system.user.update 的定制角色可自我提升为 admin）。
      { key: 'system.user.role.assign' },
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
      // 审查 F12：精确经纬度是数据级权限。没有它时接口只返回粗化坐标，
      // UI 脱敏只是呈现，不能替代这里的授权。
      { key: 'ops.device.coordinate.view' },
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
    'ops.device.coordinate.view',
    'ops.alarm.view',
    'ops.alarm.handle',
    'ops.ticket.view',
    'ops.ticket.close',
  ]),
  analyst: pick(['dashboard.', 'ops.device.view', 'ops.alarm.view', 'ops.ticket.view', 'doc.']),
  viewer: pick(['dashboard.', 'ops.device.view']),
};

export const ROLE_KEYS: RoleKey[] = ['admin', 'lead', 'operator', 'analyst', 'viewer'];

/**
 * 可被「授予角色分配权限」的调用者指派给他人的角色（审查 F1）。
 * 不允许指派 admin / lead：它们携带系统管理与全局日程权限，委派管理员不应能把别人提升到自己之上，
 * 也就不会出现「先提权再自我提升」的二级跳板。admin / lead 只能由运维在本模板之外显式授予。
 * UI 只渲染这份清单，演示后端对同一份清单做校验——两边不允许各写一套。
 */
export const ASSIGNABLE_ROLE_KEYS: RoleKey[] = ['viewer', 'operator', 'analyst'];

/**
 * 账号维护范围：admin / lead 账号（当前角色不在 ASSIGNABLE_ROLE_KEYS）只由管理员角色维护——
 * 停用、启用、删除与改资料（姓名 / 登录名 / 邮箱 / 部门）都算。持有 system.user.update / delete 的
 * 委派角色（含 lead 自己）只能维护可分配范围内的账号，否则委派管理员可以停用、删除真正的管理员，
 * 或改掉其邮箱与部门。角色变更另由演示后端的 roleTargetLocked 约束（管理员本人同样适用）。
 *
 * 「管理员角色」的判定：有业务角色（roleKey，来自用户记录）时只看它——签发角色写在演示 token 里，可被伪造；
 * 没有业务角色（无种子记录的演示登录名）时看签发角色，与演示后端给它全量权限的口径一致。
 * 演示后端（单条 PUT / DELETE 与批量接口）与用户页（按钮置灰、批量勾选）用同一个函数判定。
 */
export const canManageAccount = (caller: { roleKey?: string; role?: string } | undefined, target: { role: RoleKey }) =>
  ASSIGNABLE_ROLE_KEYS.includes(target.role) ||
  (caller?.roleKey ? caller.roleKey === 'admin' : caller?.role === 'admin');

/**
 * 导入请求的字段预算（审查 F2）：这是**接口层**的上限，独立于浏览器端的 workbook 预算。
 *
 * 两层预算管的是不同的东西，不能混为一谈：
 * - 浏览器端（src/pages/Document/Excel/xlsxBoundary.ts 的 XLSX_LIMITS）限制的是「工作簿有多大」：
 *   压缩包 5 MiB / 解压 16 MiB / 1000 行数据 / 单元格文本 4096 字符；
 * - 这里限制的是「请求体能有多大」：即便 workbook 合法，提交上来的 JSON 也必须有独立上限，
 *   否则绕过页面直接调接口就能塞进任意大的 rows（这正是 F2 的根因）。
 * 因此这里刻意更严（单字段 256 字符 < 单元格 4096 字符）；行数与 Excel 模板的 1000 行对齐。
 */
export const USER_IMPORT_LIMITS = {
  /** 一次请求最多处理的数据行数，与 Excel 模板 1000 行上限一致 */
  maxRows: 1000,
  /** 单行允许出现的字段数 */
  maxRowFields: 8,
  /** 单字段最大字符数 */
  maxFieldLength: 256,
  /** 一批请求里所有文本字段的字符总量 */
  maxTotalTextLength: 200_000,
  /** 序列化后请求体的字节上限（5 MiB） */
  maxRequestBodyBytes: 5 * 1024 * 1024,
} as const;

/** 导入行里的文本字段（allowlist）：未知字段一律判请求非法 */
export const USER_IMPORT_TEXT_FIELDS: readonly string[] = [
  'name',
  'username',
  'email',
  'department',
  'role',
  'status',
] as const;

/**
 * 导入行里的数值元数据字段。`row` 是 Excel 原始行号，由客户端带上用于对账展示，
 * 服务端只校验形状并在报告里使用自己的行号，不写进用户记录。
 */
export const USER_IMPORT_ROW_FIELDS: readonly string[] = ['row'] as const;

/** 导入行允许出现的全部字段 */
export const USER_IMPORT_FIELDS: readonly string[] = [...USER_IMPORT_TEXT_FIELDS, ...USER_IMPORT_ROW_FIELDS];
