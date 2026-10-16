import { api, compact } from './client';
import type {
  OperationLog,
  PageResult,
  RoleKey,
  User,
  UserBatchAction,
  UserCreateInput,
  UserImportResult,
  UserImportRow,
  UserInput,
  UserQuery,
  UserRoleAssignment,
} from './types';

export const listUsers = (query: UserQuery) =>
  api<PageResult<User>>('/api/v1/users', { method: 'GET', params: compact(query) });

export const getUser = (id: string) => api<User>(`/api/v1/users/${encodeURIComponent(id)}`);

export const createUser = (input: UserCreateInput) => api<User>('/api/v1/users', { method: 'POST', data: input });

/** 资料编辑：载荷类型里没有 role，角色写入必须走 assignUserRole（审查 F1 的编译期防线） */
export const updateUser = (id: string, input: Partial<UserInput>) =>
  api<User>(`/api/v1/users/${encodeURIComponent(id)}`, { method: 'PUT', data: input });

/**
 * 分配角色：唯一入口（审查 F1）。服务端要求 system.user.role.assign、拒绝改自己的角色，
 * 且只接受可分配范围内的角色（ASSIGNABLE_ROLE_KEYS）。
 */
export const assignUserRole = (id: string, role: RoleKey) =>
  api<User>(`/api/v1/users/${encodeURIComponent(id)}`, {
    method: 'PUT',
    data: { role } satisfies UserRoleAssignment,
  });

export const deleteUser = (id: string) => api<string>(`/api/v1/users/${encodeURIComponent(id)}`, { method: 'DELETE' });

export const batchUsers = (ids: string[], action: UserBatchAction) =>
  api<number>('/api/v1/users/batch', { method: 'POST', data: { ids, action } });

/** 某个用户最近的操作记录（用户详情抽屉） */
export const listUserLogs = (actorId: string) =>
  api<PageResult<OperationLog>>('/api/v1/logs', { method: 'GET', params: { actorId, pageSize: 8 } });

/** Excel 批量导入（服务端逐行复核：准确计数，重复/无效不写入） */
export const importUsers = (rows: UserImportRow[]) =>
  api<UserImportResult>('/api/v1/users/import', { method: 'POST', data: { rows } });
