/**
 * 演示后端的接口实现。路径与返回结构即前后端契约（src/services/*.ts 调用、src/services/types.ts 定义），
 * 接真实后端时按同一契约实现即可，前端零改动。
 *
 * 授权口径（审查 F02 修复）：每条路由声明所需权限点（src/constants/permissions.ts 的 key），
 * 服务端按「当前会话用户 → 用户角色 → 角色权限记录」逐请求解析——角色权限被修改后，
 * 已有会话与重新登录的会话立即执行同一份权限。隐藏按钮只是 UX，这里才是真正的检查。
 */
import { DEFAULT_ROLE_PERMISSIONS, PERMISSION_KEYS, ROLE_KEYS } from '@/constants/permissions';
import type {
  AlarmHandleAction,
  CalendarEvent,
  CalendarEventInput,
  DepartmentKey,
  EventType,
  LogAction,
  OperationLog,
  RoleKey,
  Ticket,
  TicketStatus,
  User,
  UserBatchAction,
  UserImportResult,
  UserImportRow,
  UserInput,
  UserStatus,
} from '@/services/types';
import { applyDerivedStatus } from '../availability';
import { DEPARTMENTS, REGION_OWNER, ROLE_NAMES, TICKET_TITLES, USER_AGENTS } from '../catalog';
import { demoClock } from '../clock';
import { DAY, SLA_HOURS, type Dataset, type DemoLocale } from '../generate';
import type { DemoStore } from '../store';
import { demoRoleFor, issueDemoToken, type DemoRole } from '../token';
import { buildOverview } from './dashboard';
import { BizFailure, HttpError, inRange, matches, paginate } from './http';
import { message, type MessageKey } from './messages';

export type Session = {
  username: string;
  role: DemoRole;
  user?: User;
  /** 用户五种业务角色之一（无种子记录的演示登录名没有 roleKey） */
  roleKey?: RoleKey;
  /** 逐请求解析的生效权限点（来自角色记录；管理员演示约定为全量） */
  permissions: string[];
};

export type RouteContext = {
  params: Record<string, string>;
  query: Record<string, unknown>;
  body: Record<string, unknown>;
  store: DemoStore;
  session?: Session;
  locale: DemoLocale;
};

export type Route = {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  /** 'public' 免登录；缺省需登录；其余值为所需权限点 key（PERMISSION_KEYS 之一） */
  access?: 'public' | (string & {});
  handle: (ctx: RouteContext) => unknown;
};

const DEPARTMENT_KEYS = DEPARTMENTS.map((d) => d.key);
const USER_STATUSES: UserStatus[] = ['active', 'disabled', 'locked'];
const EVENT_TYPES: EventType[] = ['duty', 'inspection', 'review', 'training', 'maintenance', 'release'];
/** 受保护账号：五种快捷体验账号不能被停用/删除/改名，避免演示自断入口 */
const PROTECTED_USERNAMES = new Set(['admin', 'guest', 'lead', 'operator', 'analyst']);
const BOARD_DONE_DAYS = 3;

const nowIso = (ctx: RouteContext) => ctx.store.now().toISOString();
const fail = (ctx: RouteContext, key: MessageKey): never => {
  throw new BizFailure(message(key, ctx.locale));
};
const notFound = (ctx: RouteContext): never => {
  throw new HttpError(404, message('notFound', ctx.locale));
};
const data = (ctx: RouteContext): Dataset => ctx.store.dataset;
const requirePermission = (ctx: RouteContext, key: string) => {
  if (!ctx.session?.permissions.includes(key)) throw new HttpError(403, message('forbidden', ctx.locale));
};

let logSeq = 0;
/** 把演示后端里发生的写操作记进操作日志（日志页能看到自己的操作） */
const writeLog = (ctx: RouteContext, action: LogAction, target: string, result: OperationLog['result'] = 'success') => {
  const now = ctx.store.now();
  logSeq += 1;
  ctx.store.create('logs', {
    id: `LOG-${now.getTime().toString(36).toUpperCase()}-${logSeq}`,
    actorId: ctx.session?.user?.id ?? '',
    actorName: ctx.session?.user?.name ?? ctx.session?.username ?? '',
    action,
    target,
    result,
    ip: '192.0.2.10',
    userAgent: USER_AGENTS[0],
    createdAt: now.toISOString(),
  });
};

const findUser = (ctx: RouteContext, id: string) => data(ctx).users.find((u) => u.id === id) ?? notFound(ctx);

/** 新建/编辑用户的字段校验（部分更新时只校验传入的字段） */
const validateUser = (ctx: RouteContext, input: Partial<UserInput>, selfId?: string) => {
  if (input.name !== undefined && !String(input.name).trim()) fail(ctx, 'nameRequired');
  if (input.username !== undefined) {
    const username = String(input.username).trim().toLowerCase();
    if (!/^[a-z][a-z0-9._-]{2,31}$/.test(username)) fail(ctx, 'usernameRequired');
    if (data(ctx).users.some((u) => u.username.toLowerCase() === username && u.id !== selfId))
      fail(ctx, 'usernameTaken');
  }
  if (input.email !== undefined && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(input.email))) fail(ctx, 'emailInvalid');
  if (input.department !== undefined && !DEPARTMENT_KEYS.includes(input.department)) fail(ctx, 'notFound');
  if (input.role !== undefined && !ROLE_KEYS.includes(input.role)) fail(ctx, 'notFound');
  if (input.status !== undefined && !USER_STATUSES.includes(input.status)) fail(ctx, 'notFound');
};

const isProtected = (ctx: RouteContext, user: User) =>
  PROTECTED_USERNAMES.has(user.username) || user.id === ctx.session?.user?.id;

const pickUserInput = (body: Record<string, unknown>): Partial<UserInput> => {
  const input: Partial<UserInput> = {};
  (['name', 'username', 'email', 'department', 'role', 'status'] as const).forEach((key) => {
    if (body[key] !== undefined) (input as Record<string, unknown>)[key] = body[key];
  });
  if (typeof input.username === 'string') input.username = input.username.trim().toLowerCase();
  if (typeof input.name === 'string') input.name = input.name.trim();
  return input;
};

/** 会话展示信息（登录与 currentUser 共用）：角色 + 逐请求解析的权限点 */
const sessionProfile = (session: Session) => ({
  name: session.username,
  nickName: session.user?.name ?? session.username,
  email: session.user?.email ?? '',
  role: session.role,
  roleKey: session.roleKey,
  permissions: session.permissions,
});

/**
 * 工单状态流转：同步响应、完成时刻、关联告警与验收归档。
 * 返工语义（审查 F06）：离开「完成」时，当前生效验收归档进 acceptanceHistory（标注失效时间），
 * 当前验收清空；重新完成后需要一次新的验收。关联告警的恢复时间同步撤销（设备状态由派生规则随之回到故障/离线）。
 */
const moveTicket = (ctx: RouteContext, ticket: Ticket, status: TicketStatus) => {
  const now = nowIso(ctx);
  const changes: Partial<Ticket> =
    status === 'todo'
      ? { status, respondedAt: undefined, resolvedAt: undefined }
      : status === 'doing'
        ? { status, respondedAt: ticket.respondedAt ?? now, resolvedAt: undefined }
        : { status, respondedAt: ticket.respondedAt ?? now, resolvedAt: ticket.resolvedAt ?? now };
  if (ticket.status === 'done' && status !== 'done') {
    if (ticket.acceptance) {
      changes.acceptanceHistory = [
        ...(ticket.acceptanceHistory ?? []),
        {
          ...ticket.acceptance,
          invalidatedAt: now,
          invalidatorName: ctx.session?.user?.name ?? ctx.session?.username ?? '',
        },
      ];
      changes.acceptance = undefined;
      writeLog(ctx, 'ticketRework', ticket.id);
    } else {
      writeLog(ctx, 'ticketRework', ticket.id);
    }
  }
  ctx.store.update('tickets', ticket.id, changes);
  if (ticket.alarmId) {
    ctx.store.update('alarms', ticket.alarmId, { recoveredAt: status === 'done' ? changes.resolvedAt : undefined });
  }
  if (status === 'done' && ticket.status !== 'done') writeLog(ctx, 'ticketClose', ticket.id);
};

/** 可派工的处理人：设备所在大区的运维部门在职值班长/工程师 */
const assignableUsers = (ctx: RouteContext, region: string) =>
  data(ctx).users.filter(
    (u) =>
      u.status === 'active' &&
      (u.role === 'operator' || u.role === 'lead') &&
      u.department === REGION_OWNER[region as keyof typeof REGION_OWNER],
  );

/** 会话生效权限（index.ts 的 resolveSession 与登录路由共用）：按用户角色的当前记录解析 */
export const resolvePermissions = (
  dataset: Dataset,
  user: User | undefined,
  tokenRole: DemoRole,
): { roleKey?: RoleKey; permissions: string[] } => {
  if (!user) {
    // 无种子记录的演示登录名：管理员体验给全量，受限体验按访客默认（旧约定，见 token.ts）
    const permissions =
      tokenRole === 'admin' ? [...DEFAULT_ROLE_PERMISSIONS.admin] : [...DEFAULT_ROLE_PERMISSIONS.viewer];
    return { permissions };
  }
  const roleKey = user.role;
  const role = dataset.roles.find((r) => r.id === roleKey);
  // 管理员角色受保护恒为全量；其余按记录现算（改权限立即生效），记录缺失回落默认、不放大为全量
  const permissions =
    roleKey === 'admin'
      ? [...DEFAULT_ROLE_PERMISSIONS.admin]
      : [...(role?.permissions ?? DEFAULT_ROLE_PERMISSIONS[roleKey])];
  return { roleKey, permissions };
};

/** 设备读路径统一按可用性规则派生状态（F07：列表、详情、地图、KPI 同一口径） */
const applyDeviceStatus = (ctx: RouteContext) => {
  const dataset = data(ctx);
  return applyDerivedStatus(dataset.devices, dataset.alarms, ctx.store.now().toISOString());
};

export const routes: Route[] = [
  // ------------------------------------------------ 鉴权
  {
    method: 'POST',
    path: '/api/v1/login',
    access: 'public',
    handle: (ctx) => {
      const name = String(ctx.body.name ?? '').trim();
      if (!name) throw new HttpError(400, message('usernameRequired', ctx.locale));
      const user = data(ctx).users.find((u) => u.username.toLowerCase() === name.toLowerCase());
      if (user?.status === 'disabled') fail(ctx, 'accountDisabled');
      if (user?.status === 'locked') fail(ctx, 'accountLocked');
      // 演示约定：种子用户按其角色签发（管理员才有管理权限）；其余任意用户名放行为管理员，受限体验名除外。
      // 权限点在每次请求时按角色记录解析（见 index.ts resolveSession），改权限对已有会话立即生效。
      const role: DemoRole = user ? (user.role === 'admin' ? 'admin' : 'user') : demoRoleFor(name);
      const session: Session = {
        username: user?.username ?? name,
        role,
        user,
        ...resolvePermissions(data(ctx), user, role),
      };
      if (user) {
        ctx.store.update('users', user.id, { lastLoginAt: nowIso(ctx), lastLoginIp: '192.0.2.10' });
      }
      writeLog({ ...ctx, session }, 'login', '');
      return {
        token: issueDemoToken(session.username, role),
        user: sessionProfile(session),
      };
    },
  },
  {
    method: 'GET',
    path: '/api/v1/currentUser',
    handle: ({ session }) => sessionProfile(session!),
  },
  {
    method: 'POST',
    path: '/api/v1/logout',
    handle: (ctx) => {
      writeLog(ctx, 'logout', '');
      return null;
    },
  },

  // ------------------------------------------------ 用户
  {
    method: 'GET',
    path: '/api/v1/users',
    access: 'system.user.view',
    handle: (ctx) => {
      const { keyword, department, role, status } = ctx.query;
      const list = data(ctx).users.filter(
        (u) =>
          matches(keyword, u.name, u.username, u.email, u.id) &&
          (!department || u.department === department) &&
          (!role || u.role === role) &&
          (!status || u.status === status),
      );
      return paginate(list, ctx.query);
    },
  },
  {
    method: 'GET',
    path: '/api/v1/users/:id',
    access: 'system.user.view',
    handle: (ctx) => findUser(ctx, ctx.params.id),
  },
  {
    method: 'POST',
    path: '/api/v1/users',
    access: 'system.user.create',
    handle: (ctx) => {
      const input = pickUserInput(ctx.body);
      validateUser(ctx, { name: '', username: '', email: '', ...input });
      const maxId = Math.max(...data(ctx).users.map((u) => Number(u.id.slice(1)) || 0), 1000);
      const user: User = {
        id: `U${maxId + 1}`,
        name: input.name!,
        username: input.username!,
        email: input.email!,
        phone: '',
        department: (input.department ?? 'support') as DepartmentKey,
        role: (input.role ?? 'viewer') as RoleKey,
        status: input.status ?? 'active',
        createdAt: nowIso(ctx),
      };
      ctx.store.create('users', user);
      writeLog(ctx, 'userCreate', user.name);
      return user;
    },
  },
  {
    method: 'PUT',
    path: '/api/v1/users/:id',
    access: 'system.user.update',
    handle: (ctx) => {
      const user = findUser(ctx, ctx.params.id);
      const input = pickUserInput(ctx.body);
      validateUser(ctx, input, user.id);
      if (input.status && input.status !== 'active' && isProtected(ctx, user)) fail(ctx, 'protectedAccount');
      if (PROTECTED_USERNAMES.has(user.username)) delete input.username;
      const updated = ctx.store.update('users', user.id, input)!;
      writeLog(ctx, input.status === 'disabled' ? 'userDisable' : 'userUpdate', updated.name);
      return updated;
    },
  },
  {
    method: 'DELETE',
    path: '/api/v1/users/:id',
    access: 'system.user.delete',
    handle: (ctx) => {
      const user = findUser(ctx, ctx.params.id);
      if (isProtected(ctx, user)) fail(ctx, 'protectedAccount');
      ctx.store.remove('users', user.id);
      writeLog(ctx, 'userUpdate', user.name);
      return user.id;
    },
  },
  {
    method: 'POST',
    path: '/api/v1/users/batch',
    access: 'system.user.update',
    handle: (ctx) => {
      const ids = Array.isArray(ctx.body.ids) ? (ctx.body.ids as string[]) : [];
      const action = ctx.body.action as UserBatchAction;
      if (action === 'delete') requirePermission(ctx, 'system.user.delete');
      const users = ids.map((id) => findUser(ctx, id));
      if (action !== 'enable' && users.some((u) => isProtected(ctx, u))) fail(ctx, 'protectedAccount');
      users.forEach((user) => {
        if (action === 'delete') {
          ctx.store.remove('users', user.id);
        } else {
          ctx.store.update('users', user.id, { status: action === 'enable' ? 'active' : 'disabled' });
        }
        writeLog(ctx, action === 'disable' ? 'userDisable' : 'userUpdate', user.name);
      });
      return users.length;
    },
  },
  {
    // Excel 批量导入（F04）：服务端逐行复核，准确报告创建/重复/无效计数，不重复写入
    method: 'POST',
    path: '/api/v1/users/import',
    access: 'system.user.create',
    handle: (ctx) => {
      const rows = Array.isArray(ctx.body.rows) ? (ctx.body.rows as UserImportRow[]) : [];
      if (!rows.length) fail(ctx, 'notFound');
      const existing = new Set(data(ctx).users.map((u) => u.username.toLowerCase()));
      const result: UserImportResult = { created: 0, duplicated: 0, invalid: 0, createdIds: [], issues: [], users: [] };
      const seenInFile = new Set<string>();
      rows.forEach((row, index) => {
        const rowNo = index + 2; // Excel 原始行号（第 1 行是表头）
        const username = String(row.username ?? '')
          .trim()
          .toLowerCase();
        const input = pickUserInput(row as Record<string, unknown>);
        const problems: string[] = [];
        if (!input.name?.trim()) problems.push(message('nameRequired', ctx.locale));
        if (!/^[a-z][a-z0-9._-]{2,31}$/.test(username)) problems.push(message('usernameRequired', ctx.locale));
        if (input.email !== undefined && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(input.email)))
          problems.push(message('emailInvalid', ctx.locale));
        if (input.department !== undefined && !DEPARTMENT_KEYS.includes(input.department as DepartmentKey))
          problems.push(message('notFound', ctx.locale));
        if (input.role !== undefined && !ROLE_KEYS.includes(input.role as RoleKey))
          problems.push(message('notFound', ctx.locale));
        if (problems.length) {
          result.invalid += 1;
          result.issues.push({ row: rowNo, reason: 'invalid', message: problems.join('；') });
          return;
        }
        if (existing.has(username) || seenInFile.has(username)) {
          result.duplicated += 1;
          result.issues.push({ row: rowNo, reason: 'duplicate', message: message('usernameTaken', ctx.locale) });
          return;
        }
        seenInFile.add(username);
        const maxId = Math.max(...data(ctx).users.map((u) => Number(u.id.slice(1)) || 0), 1000);
        const user: User = {
          id: `U${maxId + 1}`,
          name: input.name!,
          username,
          email: input.email ?? `${username}@example.com`,
          phone: '',
          department: (input.department ?? 'support') as DepartmentKey,
          role: (input.role ?? 'viewer') as RoleKey,
          status: 'active',
          createdAt: nowIso(ctx),
        };
        ctx.store.create('users', user);
        existing.add(username);
        result.created += 1;
        result.createdIds.push(user.id);
        result.users.push(user);
      });
      writeLog(ctx, 'userImport', `+${result.created}`);
      return result;
    },
  },

  // ------------------------------------------------ 角色
  {
    method: 'GET',
    path: '/api/v1/roles',
    access: 'system.role.view',
    handle: (ctx) =>
      data(ctx).roles.map((role) => ({
        ...role,
        memberCount: data(ctx).users.filter((u) => u.role === role.id).length,
      })),
  },
  {
    method: 'PUT',
    path: '/api/v1/roles/:id',
    access: 'system.role.update',
    handle: (ctx) => {
      const role = data(ctx).roles.find((r) => r.id === ctx.params.id) ?? notFound(ctx);
      const permissions = (Array.isArray(ctx.body.permissions) ? (ctx.body.permissions as string[]) : []).filter(
        (key) => PERMISSION_KEYS.includes(key),
      );
      if (role.id === 'admin' && permissions.length !== PERMISSION_KEYS.length) fail(ctx, 'adminRoleLocked');
      const updated = ctx.store.update('roles', role.id, { permissions, updatedAt: nowIso(ctx) })!;
      writeLog(ctx, 'roleUpdate', ROLE_NAMES[role.id][ctx.locale === 'en-US' ? 'en' : 'zh']);
      return { ...updated, memberCount: data(ctx).users.filter((u) => u.role === role.id).length };
    },
  },
  {
    method: 'POST',
    path: '/api/v1/roles/:id/reset',
    access: 'system.role.update',
    handle: (ctx) => {
      const role = data(ctx).roles.find((r) => r.id === ctx.params.id) ?? notFound(ctx);
      ctx.store.update('roles', role.id, {
        permissions: [...DEFAULT_ROLE_PERMISSIONS[role.id]],
        updatedAt: nowIso(ctx),
      });
      return null;
    },
  },

  // ------------------------------------------------ 操作日志
  {
    method: 'GET',
    path: '/api/v1/logs',
    access: 'system.log.view',
    handle: (ctx) => {
      const { keyword, action, result, from, to, actorId } = ctx.query;
      const list = data(ctx).logs.filter(
        (log) =>
          matches(keyword, log.actorName, log.target, log.ip) &&
          (!action || log.action === action) &&
          (!result || log.result === result) &&
          (!actorId || log.actorId === actorId) &&
          inRange(log.createdAt, from, to),
      );
      return paginate(list, ctx.query);
    },
  },

  // ------------------------------------------------ 设备
  {
    method: 'GET',
    path: '/api/v1/devices',
    access: 'ops.device.view',
    handle: (ctx) => {
      const { keyword, region, status, model } = ctx.query;
      const derived = applyDeviceStatus(ctx);
      const list = derived.filter(
        (d) =>
          matches(keyword, d.name, d.id, d.city) &&
          (!region || d.region === region) &&
          (!status || d.status === status) &&
          (!model || d.model === model),
      );
      return paginate(list, ctx.query);
    },
  },
  {
    method: 'GET',
    path: '/api/v1/devices/all',
    access: 'ops.device.view',
    handle: (ctx) => applyDeviceStatus(ctx),
  },
  {
    method: 'GET',
    path: '/api/v1/devices/:id',
    access: 'ops.device.view',
    handle: (ctx) => {
      const derived = applyDeviceStatus(ctx);
      const device = derived.find((d) => d.id === ctx.params.id) ?? notFound(ctx);
      return {
        ...device,
        recentAlarms: data(ctx)
          .alarms.filter((a) => a.deviceId === device.id)
          .slice(0, 10),
      };
    },
  },

  // ------------------------------------------------ 告警
  {
    method: 'GET',
    path: '/api/v1/alarms',
    access: 'ops.alarm.view',
    handle: (ctx) => {
      const { keyword, deviceId, level, type, status, unrecovered, region, from, to } = ctx.query;
      const list = data(ctx).alarms.filter((a) => {
        if (unrecovered === true || unrecovered === 'true') {
          // 只看未恢复（F08）：按业务恢复语义筛选——活动 + 已转工单但未恢复；
          // recovered / falsePositive / 已随工单完成恢复的不在内
          if (a.status !== 'active' && !(a.status === 'ticketed' && !a.recoveredAt)) return false;
        }
        return (
          matches(keyword, a.id, a.deviceName, a.city) &&
          (!deviceId || a.deviceId === deviceId) &&
          (!level || a.level === level) &&
          (!type || a.type === type) &&
          (!status || a.status === status) &&
          (!region || a.region === region) &&
          inRange(a.occurredAt, from, to)
        );
      });
      return paginate(list, ctx.query);
    },
  },
  {
    method: 'POST',
    path: '/api/v1/alarms/:id/handle',
    access: 'ops.alarm.handle',
    handle: (ctx) => {
      const alarm = data(ctx).alarms.find((a) => a.id === ctx.params.id) ?? notFound(ctx);
      if (alarm.status !== 'active') fail(ctx, 'alarmClosed');
      const action = ctx.body.action as AlarmHandleAction;
      const now = nowIso(ctx);
      if (action === 'ticket') {
        const device = data(ctx).devices.find((d) => d.id === alarm.deviceId)!;
        // 指派：显式指定的处理人（须为该大区可派工人员）优先，否则会话用户（若可派工），否则按大区规则取第一位
        const requested = String(ctx.body.assigneeId ?? '');
        const pool = assignableUsers(ctx, device.region);
        const assignee =
          pool.find((u) => u.id === requested) ??
          (ctx.session?.user && pool.some((u) => u.id === ctx.session!.user!.id) ? ctx.session.user : undefined) ??
          pool[0] ??
          data(ctx).users[0]!;
        const priority = alarm.level === 'critical' ? 'P1' : alarm.level === 'major' ? 'P2' : 'P3';
        const ticket: Ticket = {
          id: `WO-${alarm.id.slice(4)}`,
          title: `${device.name} · ${TICKET_TITLES[alarm.type][ctx.locale === 'en-US' ? 'en' : 'zh']}`,
          kind: 'fault',
          alarmId: alarm.id,
          deviceId: device.id,
          deviceName: device.name,
          city: device.city,
          priority,
          status: 'todo',
          assigneeId: assignee.id,
          assigneeName: assignee.name,
          createdAt: now,
          slaHours: SLA_HOURS[priority],
        };
        ctx.store.create('tickets', ticket);
        ctx.store.update('alarms', alarm.id, { status: 'ticketed', ticketId: ticket.id });
      } else {
        ctx.store.update('alarms', alarm.id, {
          status: action === 'recover' ? 'recovered' : 'falsePositive',
          recoveredAt: now,
        });
      }
      writeLog(ctx, 'alarmHandle', alarm.id);
      return data(ctx).alarms.find((a) => a.id === alarm.id);
    },
  },

  // ------------------------------------------------ 工单
  {
    method: 'GET',
    path: '/api/v1/tickets',
    access: 'ops.ticket.view',
    handle: (ctx) => {
      const { status, board, keyword, priority, kind, deviceId, from, to } = ctx.query;
      const since = ctx.store.now().getTime() - BOARD_DONE_DAYS * DAY;
      const list = data(ctx).tickets.filter(
        (t) =>
          (!status || t.status === status) &&
          (!priority || t.priority === priority) &&
          (!kind || t.kind === kind) &&
          (!deviceId || t.deviceId === deviceId) &&
          matches(keyword, t.id, t.deviceName, t.title, t.city) &&
          inRange(t.createdAt, from, to) &&
          (!board || board === 'false' || t.status !== 'done' || new Date(t.resolvedAt!).getTime() >= since),
      );
      return paginate(list, { pageSize: board ? 200 : 20, ...ctx.query });
    },
  },
  {
    // 按 ID 独立加载（F03）：历史工单深链接不依赖看板「近三天完成」窗口
    method: 'GET',
    path: '/api/v1/tickets/:id',
    access: 'ops.ticket.view',
    handle: (ctx) => data(ctx).tickets.find((t) => t.id === ctx.params.id) ?? notFound(ctx),
  },
  {
    method: 'PUT',
    path: '/api/v1/tickets/:id',
    access: 'ops.ticket.view',
    handle: (ctx) => {
      const ticket = data(ctx).tickets.find((t) => t.id === ctx.params.id) ?? notFound(ctx);
      // 状态流转按目标状态区分权限：开工/完成为处理权限；退回/重派为派工权限
      const status = ctx.body.status as TicketStatus | undefined;
      if (status && status !== ticket.status) {
        if (status === 'todo' || ticket.status === 'done') requirePermission(ctx, 'ops.ticket.assign');
        else requirePermission(ctx, 'ops.ticket.close');
        moveTicket(ctx, ticket, status);
      }
      // 改派处理人（派工权限）
      const assigneeId = String(ctx.body.assigneeId ?? '');
      if (assigneeId && assigneeId !== ticket.assigneeId) {
        requirePermission(ctx, 'ops.ticket.assign');
        const assignee = data(ctx).users.find(
          (u) => u.id === assigneeId && u.status === 'active' && (u.role === 'operator' || u.role === 'lead'),
        );
        if (!assignee) fail(ctx, 'notFound');
        ctx.store.update('tickets', ticket.id, { assigneeId: assignee!.id, assigneeName: assignee!.name });
        writeLog(ctx, 'ticketAssign', ticket.id);
      }
      return data(ctx).tickets.find((t) => t.id === ticket.id);
    },
  },
  {
    method: 'POST',
    path: '/api/v1/tickets/:id/rework',
    access: 'ops.ticket.assign',
    handle: (ctx) => {
      const ticket = data(ctx).tickets.find((t) => t.id === ctx.params.id) ?? notFound(ctx);
      if (ticket.status !== 'done') fail(ctx, 'ticketNotDone');
      moveTicket(ctx, ticket, 'doing');
      return data(ctx).tickets.find((t) => t.id === ticket.id);
    },
  },
  {
    method: 'POST',
    path: '/api/v1/tickets/:id/acceptance',
    access: 'ops.ticket.accept',
    handle: (ctx) => {
      const ticket = data(ctx).tickets.find((t) => t.id === ctx.params.id) ?? notFound(ctx);
      if (ticket.status !== 'done') fail(ctx, 'ticketNotDone');
      if (ticket.acceptance) fail(ctx, 'ticketAccepted');
      // 服务端同样校验签名形状（复查 P3-7：不能只靠客户端拦截空签名）
      const signature = String(ctx.body.signature ?? '');
      if (!signature.startsWith('data:image/png;base64,') || signature.length < 40) fail(ctx, 'signatureInvalid');
      const updated = ctx.store.update('tickets', ticket.id, {
        acceptance: {
          signerName: ctx.session?.user?.name ?? ctx.session?.username ?? '',
          signedAt: nowIso(ctx),
          signature,
        },
      })!;
      writeLog(ctx, 'ticketAccept', ticket.id);
      return updated;
    },
  },

  // ------------------------------------------------ 工作台
  {
    method: 'GET',
    path: '/api/v1/dashboard/overview',
    access: 'dashboard.view',
    handle: (ctx) => buildOverview(data(ctx), ctx.store.now()),
  },

  // ------------------------------------------------ 日程
  {
    method: 'GET',
    path: '/api/v1/events',
    handle: (ctx) => data(ctx).events.filter((e) => inRange(e.start, ctx.query.from, ctx.query.to)),
  },
  {
    method: 'POST',
    path: '/api/v1/events',
    access: 'ops.schedule.update',
    handle: (ctx) => {
      const input = ctx.body as Partial<CalendarEventInput>;
      if (!input.title?.trim()) fail(ctx, 'titleRequired');
      const event: CalendarEvent = {
        id: `EV-U${ctx.store.now().getTime().toString(36).toUpperCase()}`,
        title: input.title!.trim(),
        type: EVENT_TYPES.includes(input.type as EventType) ? (input.type as EventType) : 'review',
        start: String(input.start),
        end: input.end ? String(input.end) : undefined,
        allDay: !!input.allDay,
      };
      ctx.store.create('events', event);
      return event;
    },
  },
  {
    method: 'PUT',
    path: '/api/v1/events/:id',
    access: 'ops.schedule.update',
    handle: (ctx) => {
      const event = data(ctx).events.find((e) => e.id === ctx.params.id) ?? notFound(ctx);
      const changes: Partial<CalendarEvent> = {};
      (['title', 'type', 'start', 'end', 'allDay'] as const).forEach((key) => {
        if (key in ctx.body) (changes as Record<string, unknown>)[key] = ctx.body[key] ?? undefined;
      });
      return ctx.store.update('events', event.id, changes);
    },
  },
  {
    method: 'DELETE',
    path: '/api/v1/events/:id',
    access: 'ops.schedule.update',
    handle: (ctx) => {
      if (!ctx.store.remove('events', ctx.params.id)) notFound(ctx);
      return ctx.params.id;
    },
  },

  // ------------------------------------------------ 演示数据与演示时钟
  {
    // 重置/进入/退出场景不写操作日志：它们本身会清空补丁，重置后再补一条日志反而造成数量漂移（D03）
    method: 'POST',
    path: '/api/v1/demo/reset',
    access: 'system.demo.reset',
    handle: (ctx) => {
      ctx.store.reset();
      // 受控演示模式下重置 = 重新锚定到当前时刻（再次演示无需修数据）
      if (demoClock.snapshot().mode === 'frozen') demoClock.freeze();
      return null;
    },
  },
  {
    // 读时钟公开（登录页顶栏也要展示受控标记）：需要登录会在未登录时触发 401 →
    // 请求层整页跳登录并丢失 redirect 参数（2026-10-12 整改中真实踩到）
    method: 'GET',
    path: '/api/v1/demo/clock',
    access: 'public',
    handle: () => {
      const snapshot = demoClock.snapshot();
      return { mode: snapshot.mode, anchor: snapshot.anchor, demoTime: demoClock.now().toISOString() };
    },
  },
  {
    method: 'POST',
    path: '/api/v1/demo/clock',
    access: 'system.demo.reset',
    handle: (ctx) => {
      const mode = String(ctx.body.mode ?? '');
      if (mode === 'live') demoClock.resume();
      else if (mode === 'frozen') demoClock.freeze(typeof ctx.body.ts === 'number' ? ctx.body.ts : undefined);
      else fail(ctx, 'notFound');
      ctx.store.syncFromStorage();
      return {
        mode: demoClock.snapshot().mode,
        anchor: demoClock.snapshot().anchor,
        demoTime: demoClock.now().toISOString(),
      };
    },
  },
  {
    // 进入/退出固定演示场景（D04）：进入 = 冻结时钟 + 清空补丁（场景初始态）；退出 = 回实时 + 清空补丁
    method: 'POST',
    path: '/api/v1/demo/scenario',
    access: 'system.demo.reset',
    handle: (ctx) => {
      const action = String(ctx.body.action ?? '');
      if (action === 'enter') demoClock.freeze();
      else if (action === 'exit') demoClock.resume();
      else fail(ctx, 'notFound');
      ctx.store.reset();
      return { mode: demoClock.snapshot().mode, demoTime: demoClock.now().toISOString() };
    },
  },
];
