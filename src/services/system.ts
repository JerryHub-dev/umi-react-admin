import { DEMO_MODE } from '@/demo/mode';
import { api, compact } from './client';
import type { DemoClockState, DemoSnapshot, LogQuery, OperationLog, PageResult, Role, RoleKey } from './types';

export const listRoles = () => api<Role[]>('/api/v1/roles');

export const updateRolePermissions = (id: RoleKey, permissions: string[]) =>
  api<Role>(`/api/v1/roles/${id}`, { method: 'PUT', data: { permissions } });

export const resetRolePermissions = (id: RoleKey) => api<null>(`/api/v1/roles/${id}/reset`, { method: 'POST' });

export const listLogs = (query: LogQuery) =>
  api<PageResult<OperationLog>>('/api/v1/logs', { method: 'GET', params: compact(query) });

/** 重置演示数据（仅演示模式可用） */
export const resetDemoData = () => {
  if (!DEMO_MODE) throw new Error('Demo reset is disabled in real mode');
  return api<null>('/api/v1/demo/reset', { method: 'POST' });
};

// ---------------- 演示时钟与固定场景（仅演示模式；写操作需 system.demo.reset 权限） ----------------

export const getDemoClock = () => api<DemoClockState>('/api/v1/demo/clock');

/** 登录页展示的实时聚合数字（免登录；失败时登录页直接不显示该区块，不弹错误） */
export const getDemoSnapshot = () => {
  if (!DEMO_MODE) throw new Error('Demo snapshot is disabled in real mode');
  return api<DemoSnapshot>('/api/v1/demo/snapshot', { method: 'GET', skipErrorHandler: true });
};

/** 进入/退出固定演示场景：进入 = 冻结演示时钟 + 清空补丁；退出 = 回实时 + 清空补丁 */
export const switchDemoScenario = (action: 'enter' | 'exit') => {
  if (!DEMO_MODE) throw new Error('Demo scenario is disabled in real mode');
  return api<{ mode: 'live' | 'frozen'; demoTime: string }>('/api/v1/demo/scenario', {
    method: 'POST',
    data: { action },
  });
};
