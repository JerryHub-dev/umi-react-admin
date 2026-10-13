// use to init UserInfo
export type UserClaim = {
  name: string;
  email: string;
  nickName?: string;
  /** 角色声明（演示签发方或真实后端返回）；access 权限消费它 */
  role?: string;
  /** 五种业务角色之一（演示后端按用户记录解析） */
  roleKey?: string;
  /** 当前会话生效的权限点（服务端逐请求解析；真实后端可返回空数组改由 role 判断） */
  permissions?: unknown;
};

export class UserInfo {
  public name: string;
  public email: string;
  public nickName: string;
  /** undefined 视为无管理权限（见 src/access.ts：白名单式判定，不回退到「登录即 admin」） */
  public role: string | undefined;
  /** 业务角色 key（admin/lead/operator/analyst/viewer），未知时为 undefined */
  public roleKey: string | undefined;
  /** 生效权限点集合（菜单与按钮判断用；服务端仍逐请求校验，这里只是 UX 层） */
  public permissions: Set<string>;

  constructor(userClaim: UserClaim) {
    this.name = userClaim.name || '';
    this.email = userClaim.email || '';
    this.nickName = userClaim.nickName || userClaim.name || '';
    this.role = userClaim.role;
    this.roleKey = userClaim.roleKey;
    this.permissions = new Set(
      Array.isArray(userClaim.permissions)
        ? userClaim.permissions.filter((p): p is string => typeof p === 'string')
        : [],
    );
  }
}
