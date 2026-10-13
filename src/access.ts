// 参考文档 https://umijs.org/docs/max/access
import type { AppInitialState } from './utils/Auth/initialState';

/**
 * 权限口径（审查 F02 修复）：菜单（config/routes.ts 的 access）与按钮（useAccess）都消费
 * initialState.permissions——它是服务端登录时按角色记录解析的权限点快照。
 * 这里只是 UX 层：真正的校验在演示后端/真实后端逐请求完成（前端隐藏按钮≠授权检查）。
 * 权限点定义见 src/constants/permissions.ts（唯一来源），矩阵见 docs/demo/role-matrix.md。
 */
export default (initialState: AppInitialState | undefined) => {
  const has = (key: string) => initialState?.permissions?.has(key) ?? false;
  return {
    /** 任意「系统管理」查看权限即可进入系统管理区（兼容历史命名） */
    canSeeAdmin: has('system.user.view') || has('system.role.view') || has('system.log.view'),
    /** 通用权限点判断：useAccess()((access) => access.permission('ops.alarm.handle')) */
    permission: has,
    // 页面级 access key（config/routes.ts 引用）
    dashboardView: has('dashboard.view'),
    systemUserView: has('system.user.view'),
    systemRoleView: has('system.role.view'),
    systemLogView: has('system.log.view'),
    opsDeviceView: has('ops.device.view'),
    opsAlarmView: has('ops.alarm.view'),
    opsTicketView: has('ops.ticket.view'),
    docExport: has('doc.export'),
  };
};
