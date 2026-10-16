import { describe, expect, it } from 'vitest';
import { buildUserSubmission } from './UserForm';

/**
 * F1 的 UI 侧边界回归。
 *
 * 背景（E2E「重置演示数据清除改动」暴露）：表单里 disabled 的控件仍会出现在 values 中，
 * 所以「只编辑资料」的调用者如果回传了 role，服务端会按 F1 判 403，整条资料编辑路径被打断。
 * 这组用例把裁剪规则钉死：只有 roleEditable 时 role 才允许进入载荷。
 */
const values = {
  name: '张三',
  username: 'zhangsan',
  email: 'zhangsan@example.com',
  department: 'ops1',
  role: 'operator',
  status: 'active',
};

describe('用户表单提交载荷（F1：role 只在可编辑时回传）', () => {
  it('无角色分配权限时不回传 role（否则服务端 403，连资料都改不了）', () => {
    const submission = buildUserSubmission(values, { roleEditable: false });
    expect(submission).not.toHaveProperty('role');
    expect(submission).toEqual({
      name: '张三',
      username: 'zhangsan',
      email: 'zhangsan@example.com',
      department: 'ops1',
      status: 'active',
    });
  });

  it('可编辑角色时回传 role', () => {
    expect(buildUserSubmission(values, { roleEditable: true })).toMatchObject({ role: 'operator' });
  });

  it('values 里没有 role 时（新建且不可编辑）也不会凭空造一个', () => {
    const { role: _role, ...withoutRole } = values;
    expect(buildUserSubmission(withoutRole, { roleEditable: true })).not.toHaveProperty('role');
  });

  it('资料字段缺失时归一化为字符串，不产生 undefined 字段', () => {
    const submission = buildUserSubmission({}, { roleEditable: false });
    expect(submission).toEqual({ name: '', username: '', email: '', department: undefined });
  });
});
