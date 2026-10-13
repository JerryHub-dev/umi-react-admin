# 角色权限矩阵（审查 F02 修复后的唯一口径）

权限点的唯一来源是 [src/constants/permissions.ts](../../src/constants/permissions.ts) 的 `PERMISSION_TREE`：菜单（[config/routes.ts](../../config/routes.ts) 的 `access`）、按钮（`useAccess`）与演示接口（[src/demo/server/routes.ts](../../src/demo/server/routes.ts)）三处共用同一份 key。中文显示名取自 [src/locales/zh-CN/enums.ts](../../src/locales/zh-CN/enums.ts) 的 `permission.<key>`。下表与 `DEFAULT_ROLE_PERMISSIONS` 逐项核对过，可直接作为验收基线。

## 快捷体验账号

登录页（演示模式）提供五个一键体验入口，实现见 [src/pages/Login/index.tsx](../../src/pages/Login/index.tsx) 与 [src/demo/scenarios.ts](../../src/demo/scenarios.ts) 的 `DEMO_ACCOUNTS`。演示环境任意密码均可登录，约定统一填 `demo`：

| 账号       | 角色                | 登录页按钮     | 定位                               |
| ---------- | ------------------- | -------------- | ---------------------------------- |
| `admin`    | admin 系统管理员    | 以管理员体验   | 全部权限，负责账号、角色与平台配置 |
| `lead`     | lead 值班长         | 值班长体验     | 当班指挥：告警研判、工单派发与关闭 |
| `operator` | operator 运维工程师 | 运维工程师体验 | 现场处置：处理告警与工单           |
| `analyst`  | analyst 数据分析员  | 数据分析员体验 | 只读业务数据，可导出报表           |
| `guest`    | viewer 访客         | 访客体验       | 只读工作台与设备概况               |

## 权限矩阵

`✓` = `DEFAULT_ROLE_PERMISSIONS` 含该权限点；`—` = 不含。合计：admin 19 项、lead 13 项、operator 7 项、analyst 5 项、viewer 2 项。

| 权限点 | 显示名 | admin 系统管理员 | lead 值班长 | operator 运维工程师 | analyst 数据分析员 | viewer 访客 |
| --- | --- | :-: | :-: | :-: | :-: | :-: |
| `dashboard.view` | 查看工作台 | ✓ | ✓ | ✓ | ✓ | ✓ |
| `system.user.view` | 查看用户 | ✓ | ✓ | — | — | — |
| `system.user.create` | 新建用户 | ✓ | — | — | — | — |
| `system.user.update` | 编辑用户 | ✓ | — | — | — | — |
| `system.user.delete` | 删除用户 | ✓ | — | — | — | — |
| `system.role.view` | 查看角色 | ✓ | — | — | — | — |
| `system.role.update` | 修改角色权限 | ✓ | — | — | — | — |
| `system.log.view` | 查看操作日志 | ✓ | ✓ | — | — | — |
| `system.demo.reset` | 演示场景与重置 | ✓ | — | — | — | — |
| `ops.device.view` | 查看设备 | ✓ | ✓ | ✓ | ✓ | ✓ |
| `ops.device.update` | 维护设备 | ✓ | ✓ | — | — | — |
| `ops.alarm.view` | 查看告警 | ✓ | ✓ | ✓ | ✓ | — |
| `ops.alarm.handle` | 处置告警 | ✓ | ✓ | ✓ | — | — |
| `ops.ticket.view` | 查看工单 | ✓ | ✓ | ✓ | ✓ | — |
| `ops.ticket.assign` | 派发工单 | ✓ | ✓ | — | — | — |
| `ops.ticket.close` | 完成工单 | ✓ | ✓ | ✓ | — | — |
| `ops.ticket.accept` | 验收工单 | ✓ | ✓ | — | — | — |
| `ops.schedule.update` | 管理日程 | ✓ | ✓ | — | — | — |
| `doc.export` | 导出报表 | ✓ | ✓ | — | ✓ | — |

## 各角色能做什么 / 不能做什么（API 级）

演示后端每条路由声明的权限点见 [src/demo/server/routes.ts](../../src/demo/server/routes.ts)。路由 access key 到权限点的映射见 [src/access.ts](../../src/access.ts)。

### 接口 → 权限点对照

| 接口 | 所需权限 |
| --- | --- |
| `POST /api/v1/login` | 公开（免登录） |
| `GET /api/v1/currentUser`、`POST /api/v1/logout`、`GET /api/v1/events`、`GET /api/v1/demo/clock` | 仅需登录 |
| `GET /api/v1/users`、`GET /api/v1/users/:id` | `system.user.view` |
| `POST /api/v1/users`、`POST /api/v1/users/import` | `system.user.create` |
| `PUT /api/v1/users/:id`、`POST /api/v1/users/batch` | `system.user.update`（批量删除在处理器内再加验 `system.user.delete`） |
| `DELETE /api/v1/users/:id` | `system.user.delete` |
| `GET /api/v1/roles` | `system.role.view` |
| `PUT /api/v1/roles/:id`、`POST /api/v1/roles/:id/reset` | `system.role.update` |
| `GET /api/v1/logs` | `system.log.view` |
| `GET /api/v1/devices`、`/all`、`/:id` | `ops.device.view` |
| `GET /api/v1/alarms` | `ops.alarm.view` |
| `POST /api/v1/alarms/:id/handle`（转工单 / 标记已恢复 / 误报关闭） | `ops.alarm.handle` |
| `GET /api/v1/tickets`、`GET /api/v1/tickets/:id` | `ops.ticket.view` |
| `PUT /api/v1/tickets/:id` | 基线 `ops.ticket.view` + 按动作区分：流转到「待处理」或从「已完成」离开（退回）→ `ops.ticket.assign`；开工（处理中）/ 完成 → `ops.ticket.close`；改派处理人 → `ops.ticket.assign` |
| `POST /api/v1/tickets/:id/rework`（返工） | `ops.ticket.assign` |
| `POST /api/v1/tickets/:id/acceptance`（验收签字） | `ops.ticket.accept` |
| `GET /api/v1/dashboard/overview` | `dashboard.view` |
| `POST/PUT/DELETE /api/v1/events…` | `ops.schedule.update` |
| `POST /api/v1/demo/reset`、`POST /api/v1/demo/clock`、`POST /api/v1/demo/scenario` | `system.demo.reset` |

页面级（[config/routes.ts](../../config/routes.ts)）：`/dashboard` 需 `dashboard.view`；`/system/users`、`/system/roles`、`/system/logs` 分别需 `system.user.view` / `system.role.view` / `system.log.view`；`/ops/devices` 与 `/ops/spectrum` 需 `ops.device.view`；`/ops/alarms` 需 `ops.alarm.view`；`/ops/tickets` 需 `ops.ticket.view`。地图、组件、多媒体、文档、异常页与 `/system/access` 不设 access（登录即可见）。

### admin 系统管理员（19 项，全量）

- 能：上述全部接口与页面；角色权限编辑（除 admin 自身锁定）；进入/退出固定演示场景与重置演示数据（头像菜单里的入口仅对持有 `system.demo.reset` 的角色出现，见 [src/layouts/RightContent.tsx](../../src/layouts/RightContent.tsx)）。
- 不能：无（本地演示范围内的完全控制；仍受保护账号规则约束，见下）。

### lead 值班长（13 项）

- 能：工作台；用户与日志查看；设备维护（`ops.device.update`）；告警处置（含转工单、误报关闭）；工单派发/改派/退回/完成/验收/返工；日程管理；报表导出。
- 不能：用户增删改与批量导入（`system.user.create/update/delete`）；角色权限查看与修改；演示场景与数据重置。

### operator 运维工程师（7 项）

- 能：工作台；设备/告警/工单查看；告警处置（`ops.alarm.handle`）；工单开工与完成（`ops.ticket.close`）。
- 不能：派工 / 改派 / 退回 / 返工 / 验收签字（`ops.ticket.assign`、`ops.ticket.accept`）；日程管理；报表导出；全部系统管理页面（左侧菜单不出现「系统管理」分组）。

### analyst 数据分析员（5 项）

- 能：工作台；设备 / 告警 / 工单只读；`doc.export` 报表导出权限点。
- 不能：任何处置 / 派工 / 完成工单 / 验收 / 日程写操作；用户与日志查看。注意：Excel 页的「导出全部用户」实际拉取 `GET /api/v1/users`（需 `system.user.view`），因此该按钮对 analyst 会在接口层收到 403——`doc.export` 只覆盖业务报表语义，不给用户数据读权限。

### viewer 访客（2 项）

- 能：工作台；设备台账与频谱占用（两页同用 `ops.device.view`）。
- 不能：告警、工单、用户、角色、日志的一切接口（均 403）；处置 / 验收 / 日程 / 导出。地图、组件、多媒体、文档页可打开，但依赖业务接口的页面（如页面截图需 `ops.alarm.view` + `ops.device.view`）会被请求层整页带到 /exception/403（请求层既有行为）并弹出接口错误提示。

## 规则说明（验收时逐条核对）

1. **权限逐请求解析，改权限立即生效**：会话权限不进 token、不缓存。[src/demo/server/index.ts](../../src/demo/server/index.ts) 的 `resolveSession` 在每个请求按「用户记录的角色 → 角色权限记录」现算（`resolvePermissions`）。管理员修改某角色权限后，该角色**已有会话的下一个请求**即按新权限执行（例如告警处置立刻 403）；前端菜单与按钮的显隐来自登录时 `currentUser` 返回的权限快照，刷新页面（或重新登录）后与接口口径一致。隐藏按钮只是 UX，接口才是真正的检查。
2. **admin 角色锁定为全量**：`PUT /api/v1/roles/admin` 提交的权限少于全量时被拒绝（`adminRoleLocked`：系统管理员角色必须保留全部权限）；角色管理页对 admin 显示锁定提示且权限树不可勾选（[src/pages/System/Roles/index.tsx](../../src/pages/System/Roles/index.tsx)）。`resolvePermissions` 也恒定给 admin 全量，即使角色记录被外部改小。
3. **受保护账号不可停用 / 删除 / 改名**：`admin`、`guest`、`lead`、`operator`、`analyst` 五个快捷体验账号与当前登录账号自身，服务端拒绝停用、删除（`protectedAccount`：体验账号与当前登录账号不能停用或删除），编辑时登录名字段被忽略（[src/demo/server/routes.ts](../../src/demo/server/routes.ts) `PROTECTED_USERNAMES` 与 `isProtected`）。用户页只对 `admin`/`guest` 禁用了停用/删除按钮，对 `lead`/`operator`/`analyst` 点操作会被服务端拒绝并弹错——这是有意的（按钮级只是 UX）。
4. **无角色记录时回落不放大**：角色记录缺失时回落该角色默认权限，绝不放大为全量；无种子记录的演示登录名按「管理员体验给全量、受限体验名（`guest`/`dontHaveAccess`）按访客默认」的旧约定处理（[src/demo/token.ts](../../src/demo/token.ts)）。
5. **停用/锁定账号无法登录且旧 token 失效**：登录分别返回「账号已停用，请联系管理员」「账号已锁定（连续多次密码错误），请联系管理员」；种子用户被停用后已签发的演示 token 随之失效（`resolveSession` 校验 `status === 'active'`）。
6. **数据范围声明**：本演示无生产多租户，**不承诺行级数据范围控制**——持有查看权限的角色看到的是同一份全量数据，不按大区 / 部门 / 个人过滤。`/system/access` 页的「精确坐标仅管理员可见」是前端脱敏演示，真实系统必须在服务端脱敏。
