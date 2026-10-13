import { safeSignature } from '@/utils/signature';
import { api, compact } from './client';
import type {
  Alarm,
  AlarmHandleAction,
  AlarmQuery,
  DashboardOverview,
  Device,
  DeviceQuery,
  PageResult,
  Ticket,
  TicketQuery,
  TicketStatus,
} from './types';

export const getDashboardOverview = () => api<DashboardOverview>('/api/v1/dashboard/overview');

export const listDevices = (query: DeviceQuery) =>
  api<PageResult<Device>>('/api/v1/devices', { method: 'GET', params: compact(query) });

/** 全量设备（地图、频段图使用） */
export const listAllDevices = () => api<Device[]>('/api/v1/devices/all');

export const getDevice = (id: string) =>
  api<Device & { recentAlarms: Alarm[] }>(`/api/v1/devices/${encodeURIComponent(id)}`);

export const listAlarms = (query: AlarmQuery) =>
  api<PageResult<Alarm>>('/api/v1/alarms', { method: 'GET', params: compact(query) });

export const listTickets = (query: TicketQuery) =>
  api<PageResult<Ticket>>('/api/v1/tickets', { method: 'GET', params: compact(query) });

/** 按 ID 独立加载工单（历史工单深链接，不依赖看板窗口） */
export const getTicket = (id: string) => api<Ticket>(`/api/v1/tickets/${encodeURIComponent(id)}`);

export const moveTicket = (id: string, status: TicketStatus, assigneeId?: string) =>
  api<Ticket>(`/api/v1/tickets/${encodeURIComponent(id)}`, {
    method: 'PUT',
    data: { status, assigneeId },
  });

/** 已验收工单返工：旧验收归档失效，工单回到处理中（F06） */
export const reworkTicket = (id: string) =>
  api<Ticket>(`/api/v1/tickets/${encodeURIComponent(id)}/rework`, { method: 'POST' });

export const signTicket = (id: string, signature: string) => {
  if (!safeSignature(signature)) return Promise.reject(new Error('Invalid signature PNG'));
  return api<Ticket>(`/api/v1/tickets/${encodeURIComponent(id)}/acceptance`, { method: 'POST', data: { signature } });
};

/** 告警转工单（可显式指定处理人） */
export const handleAlarm = (id: string, action: AlarmHandleAction, assigneeId?: string) =>
  api<Alarm>(`/api/v1/alarms/${encodeURIComponent(id)}/handle`, { method: 'POST', data: { action, assigneeId } });
