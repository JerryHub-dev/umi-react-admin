import { api, compact } from './client';
import type {
  OperationLog,
  PageResult,
  User,
  UserBatchAction,
  UserImportResult,
  UserImportRow,
  UserInput,
  UserQuery,
} from './types';

export const listUsers = (query: UserQuery) =>
  api<PageResult<User>>('/api/v1/users', { method: 'GET', params: compact(query) });

export const getUser = (id: string) => api<User>(`/api/v1/users/${encodeURIComponent(id)}`);

export const createUser = (input: UserInput) => api<User>('/api/v1/users', { method: 'POST', data: input });

export const updateUser = (id: string, input: Partial<UserInput>) =>
  api<User>(`/api/v1/users/${encodeURIComponent(id)}`, { method: 'PUT', data: input });

export const deleteUser = (id: string) => api<string>(`/api/v1/users/${encodeURIComponent(id)}`, { method: 'DELETE' });

export const batchUsers = (ids: string[], action: UserBatchAction) =>
  api<number>('/api/v1/users/batch', { method: 'POST', data: { ids, action } });

/** 某个用户最近的操作记录（用户详情抽屉） */
export const listUserLogs = (actorId: string) =>
  api<PageResult<OperationLog>>('/api/v1/logs', { method: 'GET', params: { actorId, pageSize: 8 } });

/** Excel 批量导入（服务端逐行复核：准确计数，重复/无效不写入） */
export const importUsers = (rows: UserImportRow[]) =>
  api<UserImportResult>('/api/v1/users/import', { method: 'POST', data: { rows } });
