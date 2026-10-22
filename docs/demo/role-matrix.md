# 角色权限矩阵（审查 F02 / F1 / F12 / F7 修复后的唯一口径）

权限点的唯一来源是 [src/constants/permissions.ts](../../src/constants/permissions.ts) 的 `PERMISSION_TREE`：菜单（[config/routes.ts](../../config/routes.ts) 的 `access`）、按钮（`useAccess`）与演示接口（[src/demo/server/routes.ts](../../src/demo/server/routes.ts)）三处共用同一份 key。中文显示名取自 [src/locales/zh-CN/enums.ts](../../src/locales/zh-CN/enums.ts) 的 `permission.<key>`。下表与 `DEFAULT_ROLE_PERMISSIONS` 逐项核对过（叶子权限点共 21 项），可直接作为验收基线。

> **边界声明**：演示模式的授权校验发生在浏览器内的虚构后端里，它是「前后端契约」的演示，**不是真实安全边界**——所有校验都在用户自己的浏览器进程中执行，用户可完全控制它。真实系统必须由真实后端逐请求校验身份、角色与数据范围，见 [SECURITY.md](../../SECURITY.md)。

## 快捷体验账号

登录页（演示模式）提供五个一键体验入口，实现见 [src/pages/Login/index.tsx](../../src/pages/Login/index.tsx) 与 [src/demo/scenarios.ts](../../src/demo/scenarios.ts) 的 `DEMO_ACCOUNTS`。演示环境任意密码均可登录，约定统一填 `demo`：

| 账号       | 角色                | 登录页按钮       | 定位                               |
| ---------- | ------------------- | ---------------- | ---------------------------------- |
| `admin`    | admin 系统管理员    | 以管理员体验     | 全部权限，负责账号、角色与平台配置 |
| `lead`     | lead 值班长         | 以值班长体验     | 当班指挥：告警研判、工单派发与关闭 |
| `operator` | operator 运维工程师 | 以运维工程师体验 | 现场处置：处理告警与工单           |
| `analyst`  | analyst 数据分析员  | 以数据分析员体验 | 只读业务数据，可导出报表           |
| `guest`    | viewer 访客         | 以访客体验       | 只读工作台与设备概况               |

## 权限矩阵

`✓` = `DEFAULT_ROLE_PERMISSIONS` 含该权限点；`—` = 不含。合计：admin 21 项、lead 14 项、operator 7 项、analyst 5 项、viewer 2 项。

| 权限点 | 显示名 | admin 系统管理员 | lead 值班长 | operator 运维工程师 | analyst 数据分析员 | viewer 访客 |
| --- | --- | :-: | :-: | :-: | :-: | :-: |
| `dashboard.view` | 查看工作台 | ✓ | ✓ | ✓ | ✓ | ✓ |
| `system.user.view` | 查看用户 | ✓ | ✓ | — | — | — |
| `system.user.create` | 新建用户 | ✓ | — | — | — | — |
| `system.user.update` | 编辑用户 | ✓ | — | — | — | — |
| `system.user.role.assign` | 分配用户角色 | ✓ | — | — | — | — |
| `system.user.delete` | 删除用户 | ✓ | — | — | — | — |
| `system.role.view` | 查看角色 | ✓ | — | — | — | — |
| `system.role.update` | 修改角色权限 | ✓ | — | — | — | — |
| `system.log.view` | 查看操作日志 | ✓ | ✓ | — | — | — |
| `system.demo.reset` | 演示场景与重置 | ✓ | — | — | — | — |
| `ops.device.view` | 查看设备 | ✓ | ✓ | ✓ | ✓ | ✓ |
| `ops.device.coordinate.view` | 查看设备精确坐标 | ✓ | ✓ | ✓ | — | — |
| `ops.device.update` | 维护设备 | ✓ | ✓ | — | — | — |
| `ops.alarm.view` | 查看告警 | ✓ | ✓ | ✓ | ✓ | — |
| `ops.alarm.handle` | 处置告警 | ✓ | ✓ | ✓ | — | — |
| `ops.ticket.view` | 查看工单 | ✓ | ✓ | ✓ | ✓ | — |
| `ops.ticket.assign` | 派发工单 | ✓ | ✓ | — | — | — |
| `ops.ticket.close` | 完成工单 | ✓ | ✓ | ✓ | — | — |
| `ops.ticket.accept` | 验收工单 | ✓ | ✓ | — | — | — |
| `ops.schedule.update` | 管理日程 | ✓ | ✓ | — | — | — |
| `doc.export` | 导出报表 | ✓ | ✓ | — | ✓ | — |

两个新增权限点的取值口径：

- `system.user.role.assign`（F1）：只有它能把用户的 `role` 写进记录，三条写入通道（新建 / 资料更新带 role / 导入行角色非空）同一口径。默认矩阵里仅 admin 持有——admin 拿的是全量集合；其余四个角色的 `pick()` 前缀都不覆盖它，因此它们只能被显式授予。
- `ops.device.coordinate.view`（F12）：lead 通过 `pick(['…','ops.',…])` 的 `ops.` 前缀批量取得，operator 通过显式列举取得；analyst 与 viewer 不持有，只能拿到粗化坐标。

## 各角色能做什么 / 不能做什么（API 级）

演示后端每条路由声明的权限点见 [src/demo/server/routes.ts](../../src/demo/server/routes.ts)。路由 access key 到权限点的映射见 [src/access.ts](../../src/access.ts)。

### 接口 → 权限点对照

| 接口 | 所需权限 |
| --- | --- |
| `POST /api/v1/login` | 公开（免登录） |
| `GET /api/v1/currentUser`、`POST /api/v1/logout`、`GET /api/v1/events`、`GET /api/v1/demo/clock` | 仅需登录 |
| `GET /api/v1/users`、`GET /api/v1/users/:id` | `system.user.view` |
| `POST /api/v1/users` | `system.user.create`；请求体携带 `role` 时另需 `system.user.role.assign`（否则 403） |
| `POST /api/v1/users/import` | `system.user.create`；**任意一行**指定了角色（`role` 非空、非纯空白）时另需 `system.user.role.assign`（否则整批 403、零写入，不是「某几行无效」）；角色留空 = 未指定，按 `viewer` 落库；行内 `role` 只接受可分配范围内的角色 key，越界或传界面标签只是该行「无效」；问题行按客户端带来的 Excel 行号回报 |
| `PUT /api/v1/users/:id` | `system.user.update`；请求体携带 `role` 时另需 `system.user.role.assign`，且目标账号的当前角色也须在可分配范围内（否则 403）。资料字段（姓名/登录名/邮箱/部门/状态）仍然只需要 `system.user.update`；当前登录账号改自己的登录名被拒（`selfRenameForbidden`）。目标账号当前角色是 admin / lead 时只有管理员角色能调用：其他调用者不论请求体是什么都 403（`privilegedAccountLocked`，见「规则说明」第 4 条） |
| `POST /api/v1/users/batch` | `system.user.update`（批量删除在处理器内再加验 `system.user.delete`）；选中的账号里混入 admin / lead 且调用者不是管理员角色时整批 403（`privilegedAccountLocked`，启用也一样），零写入 |
| `DELETE /api/v1/users/:id` | `system.user.delete`（记 `userDelete`）；目标是 admin / lead 账号时只有管理员角色能删（否则 403 `privilegedAccountLocked`） |
| `GET /api/v1/roles` | `system.role.view` |
| `PUT /api/v1/roles/:id`、`POST /api/v1/roles/:id/reset` | `system.role.update`；不能改写 / reset 自己所在的角色（`selfRoleUpdateForbidden`，admin 角色锁定为全量故例外），新增的权限点必须是调用者自己持有的（`permissionGrantForbidden`），均为 403 |
| `GET /api/v1/logs` | `system.log.view` |
| `GET /api/v1/devices`、`/all`、`/:id` | `ops.device.view`；精确经纬度另需 `ops.device.coordinate.view`（缺失时服务端把坐标粗化到 0.1° 格网并标 `coordinatePrecision: 'coarse'`） |
| `GET /api/v1/alarms` | `ops.alarm.view` |
| `POST /api/v1/alarms/:id/handle`（转工单 / 标记已恢复 / 误报关闭） | `ops.alarm.handle` |
| `GET /api/v1/tickets`、`GET /api/v1/tickets/:id` | `ops.ticket.view` |
| `PUT /api/v1/tickets/:id` | 基线 `ops.ticket.view` + 按动作区分：流转到「待处理」或从「已完成」离开（退回）→ `ops.ticket.assign`；开工（处理中）/ 完成 → `ops.ticket.close`；改派处理人 → `ops.ticket.assign` |
| `POST /api/v1/tickets/:id/rework`（返工） | `ops.ticket.assign` |
| `POST /api/v1/tickets/:id/acceptance`（验收签字） | `ops.ticket.accept` |
| `GET /api/v1/dashboard/overview` | `dashboard.view` |
| `POST /api/v1/events`、`PUT /api/v1/events/:id`、`DELETE /api/v1/events/:id` | `ops.schedule.update` |
| `POST /api/v1/demo/reset`、`POST /api/v1/demo/clock`、`POST /api/v1/demo/scenario` | `system.demo.reset` |

页面级（[config/routes.ts](../../config/routes.ts)）：`/dashboard` 需 `dashboard.view`；`/system/users`、`/system/roles`、`/system/logs` 分别需 `system.user.view` / `system.role.view` / `system.log.view`；`/ops/devices` 与 `/ops/spectrum` 需 `ops.device.view`；`/ops/alarms` 需 `ops.alarm.view`；`/ops/tickets` 需 `ops.ticket.view`。地图、组件、多媒体、文档、异常页与 `/system/access` 不设 access（登录即可见）。

### admin 系统管理员（21 项，全量）

- 能：上述全部接口与页面；角色权限编辑（除 admin 自身锁定）；分配用户角色（`system.user.role.assign`，全站唯一持有者）；进入/退出固定演示场景与重置演示数据（头像菜单里的入口仅对持有 `system.demo.reset` 的角色出现，见 [src/layouts/RightContent.tsx](../../src/layouts/RightContent.tsx)）。
- 不能：修改自己的角色（见下「角色分配规则」，管理员也没有例外）；受保护账号规则仍然生效。

### lead 值班长（14 项）

- 能：工作台；用户与日志查看；设备维护（`ops.device.update`）与精确坐标（`ops.device.coordinate.view`）；告警处置（含转工单、误报关闭）；工单派发/改派/退回/完成/验收/返工；日程管理；报表导出。
- 不能：用户增删改与批量导入（`system.user.create/update/delete`）；角色权限查看与修改；分配用户角色；演示场景与数据重置。即使 lead 角色被授予用户编辑 / 删除权限，也只能维护可分配范围内的账号——其他 lead、admin 以及自己的账号都不能停用、删除或改资料（「规则说明」第 4 条）。

### operator 运维工程师（7 项）

- 能：工作台；设备/告警/工单查看；精确设备坐标（`ops.device.coordinate.view`）；告警处置（`ops.alarm.handle`）；工单开工与完成（`ops.ticket.close`）。
- 不能：派工 / 改派 / 退回 / 返工 / 验收签字（`ops.ticket.assign`、`ops.ticket.accept`）；日程管理；报表导出；全部系统管理页面（顶部菜单不出现「系统管理」分组）。

### analyst 数据分析员（5 项）

- 能：工作台；设备 / 告警 / 工单只读（坐标由服务端粗化）；`doc.export` 报表导出权限点。
- 不能：精确设备坐标（接口只返回粗化值）；任何处置 / 派工 / 完成工单 / 验收 / 日程写操作；用户与日志查看。注意：Excel 页的「导出全部用户」实际拉取 `GET /api/v1/users`（需 `system.user.view`），因此该按钮对 analyst 会在接口层收到 403——`doc.export` 只覆盖业务报表语义，不给用户数据读权限。

### viewer 访客（2 项）

- 能：工作台；设备台账与频谱占用（两页同用 `ops.device.view`，坐标为服务端粗化值）。
- 不能：精确设备坐标；告警、工单、用户、角色、日志的一切接口（均 403）；处置 / 验收 / 日程 / 导出。地图、组件、多媒体、文档页可打开，但依赖业务接口的页面（如页面截图需 `ops.alarm.view` + `ops.device.view`）会被请求层整页带到 /exception/403（请求层既有行为）并弹出接口错误提示。

## 角色分配规则（审查 F1）

1. **角色写入是独立权限，三条通道同一口径**：只有 `system.user.role.assign` 能把 `role` 写进用户记录，适用于新建用户（`POST /api/v1/users`）、资料更新（`PUT /api/v1/users/:id`）与批量导入（`POST /api/v1/users/import`）。缺权限时：新建/更新的请求体里**出现** `role` 即 403；导入文件里**任意一行**带 `role` 即整批 403 且零写入（演示后端 `validateRoleAssignment` 与导入路由的前置判定，均在写入之前）——不做「忽略该字段」的静默降级，也不把授权失败降级成「某几行无效」。
2. **任何身份都不能改自己的角色**，包括 admin：请求体里的 `role` 指向自己时返回 403（`selfRoleForbidden`）。否则被授予该权限的角色可以自我提升。
3. **可分配范围受限**：只接受 `ASSIGNABLE_ROLE_KEYS = ['viewer', 'operator', 'analyst']`，且目标账号的**当前**角色也必须在这个范围内——admin / lead 账号既不能被提升到、也不能被降出（`roleTargetLocked`，管理员本人同样适用，与用户表单对这两类账号只读一致）。admin / lead 携带系统管理与全局日程权限，委派管理员不得把别人提升到自己之上，也就没有「先提权再自我提升」的二级跳板；admin / lead 只能由运维在本模板之外显式授予。UI（[src/pages/System/Users/UserForm.tsx](../../src/pages/System/Users/UserForm.tsx)）与演示后端消费同一份常量。
4. **新建时可以带角色，但同样受该权限约束**：`UserCreateInput` 可携带 `role`，服务端在建记录前跑同一套 `validateRoleAssignment`；没有该权限时不会因为「新建」而放行。
5. **资料编辑载荷里没有 `role`**：`UserInput` = 姓名 / 登录名 / 邮箱 / 部门 / 状态（[src/services/types.ts](../../src/services/types.ts)），角色写入有独立的 `UserRoleAssignment` 载荷与独立入口 `assignUserRole`。用户页提交分两步：资料走 `updateUser`，角色只在真的变化时才走 `assignUserRole`（[src/pages/System/Users/index.tsx](../../src/pages/System/Users/index.tsx)）。
6. **批量导入是同一口径的第三条角色写入通道**：只要导入文件里**任意一行**指定了角色（`role` 非空），整批请求就与「新建用户」「带 role 的资料更新」一样要求 `system.user.role.assign`；缺权限时整批 403 且零写入（授权失败不被降级成「某几行无效」）。持有该权限时，行内 `role` 超出可分配范围仍按**行级无效**计入 `invalid`，保留逐行对账语义。角色列为空（或缺省）的行不构成角色分配，仅持有 `system.user.create` 的调用者可以正常导入，服务端按 `viewer` 落库。Excel 页把中英文角色标签映射成 key 后、只提交本地校验通过的行；没有 `system.user.role.assign` 时，角色列非空的行在本地就判无效并提示清空角色列，不会把整批请求送去换一个 403。
7. **UI 只做呈现**：没有 `system.user.role.assign` 时角色选择器置灰（新建时服务端按 `viewer` 落库）；改自己或既有 admin / lead 时角色只读展示；角色管理页对自己所在的角色只读，并把自己未持有的权限点置灰。这些只是 UX，接口层才是判定点。
8. **角色权限编辑同样不能自我提权**：持有 `system.role.update` 的角色不能改写或 reset 自己所在角色的权限（否则可给自己写入全部权限，reset 也可能把管理员收紧过的权限恢复成更大的默认值）；给其他角色新增的权限点必须是自己持有的（收回或原样保留不算授予），否则「先给别的角色加权限、再把傀儡账号分进去」就是一条两步提权。admin 持有全部权限，不受授予上限影响。

## 权限列表完整性（审查 F8）

- `PUT /api/v1/roles/:id` 的 `permissions` 必须是 **string 数组**：非数组、含非字符串元素、含重复项、含未知 key 一律 400（`permissionKeyInvalid`）。非叶子 key（`dashboard` / `system` / `ops` / `doc` 这些分组 key）不在 `PERMISSION_KEYS` 里，因此同样被 400 拒绝。
- **admin 角色按集合等价判定**：提交的权限集合必须与 `PERMISSION_KEYS` 完全相等，否则 403（`adminRoleLocked`）。只比长度会让重复 key 顶替缺失 key，在「全量权限」的假象下丢掉真实权限，所以判定是 `Set` 相等而不是 `length` 相等；顺序不同但集合完整的提交被接受。
- 非 admin 角色落库前也会归一化去重。

## 导入请求预算（审查 F2）

`POST /api/v1/users/import` 在任何写入之前跑完整批校验（[src/demo/server/routes.ts](../../src/demo/server/routes.ts) 的 `validateImportRequest`），预算常量是 [src/constants/permissions.ts](../../src/constants/permissions.ts) 的 `USER_IMPORT_LIMITS`（**接口边界**的口径）。浏览器端的 XLSX 解析另有一套更早生效的预算 `XLSX_LIMITS`（[src/pages/Document/Excel/xlsxBoundary.ts](../../src/pages/Document/Excel/xlsxBoundary.ts)：压缩包 5 MiB、实际解压 16 MiB、1000 数据行 / 64 列、单元格文本 4096 字符）：前者约束「发出去的请求」，后者约束「读进来的工作簿」，两者不是同一组常量，改动其一时不要假定另一处跟着变。接口层刻意更严（单字段 256 字符 < 单元格 4096 字符）：即便工作簿合法，绕过页面直接调接口也必须另有上限，这正是 F2 要修的口子。

| 维度         | 上限         | 取值       |
| ------------ | ------------ | ---------- |
| 数据行数     | 1000 行      | 超限 → 413 |
| 单行字段数   | 8 个         | 超限 → 413 |
| 单字段长度   | 256 字符     | 超限 → 413 |
| 全批文本总量 | 200 000 字符 | 超限 → 413 |
| 序列化请求体 | 5 MiB        | 超限 → 413 |

- **字段白名单**：字符串字段只接受 `name` / `username` / `email` / `department` / `role` / `status`，另加数值元数据字段 `row`（Excel 原始行号，只接受 0–1000000 的整数，不计入文本预算）。**未知字段一律判请求非法**（400），不会把任意结构写进用户记录。
- **结构非法 → 400，超预算 → 413**：请求体不是对象、`rows` 不是数组、行不是对象、字符串字段收到数组 / 嵌套对象 / 数字 / 布尔，都是 400（`importRequestMalformed`）。
- **全有或全无**：结构非法的请求**零写入**——包括「前面几行已经合法」的情况，不存在部分提交。
- **判定顺序**：整批预算校验 → 角色权限判定（任一行角色非空时）→ 逐行写入。因此结构非法 / 超预算的请求返回 400 / 413，与调用者是否持有 `system.user.role.assign` 无关；只有通过预算校验、且带 `role` 却没权限时才返回 403。

## 操作日志（审查 F7）

演示后端把写操作记进操作日志（每条含 `actor` / `action` / `target` / `result` / `createdAt`，另有 ip 与 userAgent），日志页可按动作筛选——筛选项由 [src/constants/enums.ts](../../src/constants/enums.ts) 的 `LOG_ACTION_KEYS` 生成，共 **22** 个动作：

`login`、`logout`、`userCreate`、`userUpdate`、`userDisable`、`userDelete`、`userImport`、`userRoleAssign`、`alarmHandle`、`ticketAssign`、`ticketStart`、`ticketReturn`、`ticketClose`、`ticketAccept`、`ticketRework`、`reportExport`、`roleUpdate`、`roleReset`、`scheduleCreate`、`scheduleUpdate`、`scheduleDelete`、`demoClock`。

- **本轮新增（F7）**：`userRoleAssign`（仅在角色**真的变化**时记一条）、`userDelete`（单条删除用户，与 `userUpdate` 可区分）、`roleReset`（恢复角色默认权限）、`scheduleCreate` / `scheduleUpdate` / `scheduleDelete`（日程增删改）、`demoClock`（切换演示时钟，记录目标 mode）。
- **未记录的写操作，以及原因**：`POST /api/v1/demo/reset` 与 `POST /api/v1/demo/scenario` 不写日志。它们本身会 `store.reset()` 清空补丁存储（日志表也在其中），写进去的条目会被紧接着的清空抹掉，造成「日志计数随重置漂移」——这是设计约定，见路由上方的注释。目标是特权但会清库的操作，不产生可核对的日志；`LogAction` 类型里保留的 `demoReset` / `demoScenario` 两个取值因此不出现在筛选清单里，也没有任何路由会写入。
- **工单每次真实的状态变化恰好记一条**：todo → doing 记 `ticketStart`，doing → todo（退回，需要派工权限）记 `ticketReturn`，→ done 记 `ticketClose`，离开 done 记 `ticketRework`；状态不变或被拒绝的请求不记。
- **失败即不记**：目标不存在（如删除不存在的日程、reset 不存在的角色）时先抛 `notFound`，不会留下「成功」的假日志；未授权调用返回 403 且不写日志。
- 日志页筛选里出现 `reportExport` 但演示后端没有导出路由会写它：它来自种子数据（[src/demo/generate.ts](../../src/demo/generate.ts) 为历史记录生成该动作），属于既有口径，不是本轮新增的写入点。
- 一处已对齐的细节：`DELETE /api/v1/users/:id` 与**批量**删除（`POST /api/v1/users/batch` 且 `action: 'delete'`）都记 `userDelete`（批量路由经 `BATCH_LOG_ACTION` 映射，与单条同一套 action 名：`enable` → `userUpdate`、`disable` → `userDisable`、`delete` → `userDelete`），因此按 `userDelete` 筛选能同时拿到单条与批量删除。

## 规则说明（验收时逐条核对）

1. **权限逐请求解析，改权限立即生效**：会话权限不进 token、不缓存。[src/demo/server/index.ts](../../src/demo/server/index.ts) 的 `resolveSession` 在每个请求按「用户记录的角色 → 角色权限记录」现算（`resolvePermissions`）。管理员修改某角色权限后，该角色**已有会话的下一个请求**即按新权限执行（例如告警处置立刻 403）；前端菜单与按钮的显隐来自登录时 `currentUser` 返回的权限快照，刷新页面（或重新登录）后与接口口径一致。隐藏按钮只是 UX，接口才是真正的检查。
2. **admin 角色锁定为全量**：`PUT /api/v1/roles/admin` 提交的权限集合与 `PERMISSION_KEYS` 不等时被拒绝（`adminRoleLocked`：系统管理员角色必须保留全部权限）；角色管理页对 admin 显示锁定提示且权限树不可勾选（[src/pages/System/Roles/index.tsx](../../src/pages/System/Roles/index.tsx)）。`resolvePermissions` 也恒定给 admin 全量，即使角色记录被外部改小。
3. **受保护账号不可停用 / 删除 / 改名**：`admin`、`guest`、`lead`、`operator`、`analyst` 五个快捷体验账号与当前登录账号自身，服务端拒绝停用、删除（单条与批量都是——`protectedAccount`：体验账号与当前登录账号不能停用或删除），体验账号编辑时登录名字段被忽略；当前登录账号改自己的登录名直接被拒（`selfRenameForbidden`：演示会话按登录名解析，改名会让当前会话失去用户记录，之后再建同名账号还会让旧 token 指向新账号），用户表单对自己的登录名同样置灰（[src/demo/server/routes.ts](../../src/demo/server/routes.ts) `PROTECTED_USERNAMES` 与 `isProtected`）。用户页只对 `admin`/`guest` 禁用了停用/删除按钮，对 `lead`/`operator`/`analyst` 点操作会被服务端拒绝并弹错——这是有意的（按钮级只是 UX）；非管理员角色看到的 admin / lead 行另按第 4 条整行置灰。
4. **admin / lead 账号只由管理员角色维护**：目标账号当前角色是 admin 或 lead（不在 `ASSIGNABLE_ROLE_KEYS` 内）时，只有管理员角色能停用、启用、删除或修改它的资料（姓名 / 登录名 / 邮箱 / 部门）。持有 `system.user.update` / `system.user.delete` 的委派角色——包括 lead 自己——对这些账号的单条 `PUT`、`DELETE` 与批量请求一律 403（`privilegedAccountLocked`）：在任何写入之前判定、不看请求体（启用、原样回传同样拒绝），批量请求混入一个就整批拒绝、不留部分写入。否则委派管理员可以停用 / 删除真正的管理员，或改掉其邮箱与部门（部门决定派工范围）。「管理员角色」按用户记录上的业务角色判定，不看演示 token 里的签发角色（可伪造）；无种子记录的演示登录名按签发角色判定，与它拿到全量权限的口径一致。判定函数 `canManageAccount`（[src/constants/permissions.ts](../../src/constants/permissions.ts)）由演示后端与用户页共用：委派角色看到这些行时编辑 / 停用 / 启用 / 删除置灰、不能勾选进批量，角色列旁有锁形提示。角色变更另由 `roleTargetLocked` 约束（管理员本人同样适用）。
5. **无角色记录时回落不放大**：角色记录缺失时回落该角色默认权限，绝不放大为全量；无种子记录的演示登录名按「管理员体验给全量、受限体验名（`guest`/`dontHaveAccess`）按访客默认」的旧约定处理（[src/demo/token.ts](../../src/demo/token.ts)）。
6. **停用/锁定账号无法登录且旧 token 失效**：登录分别返回「账号已停用，请联系管理员」「账号已锁定（连续多次密码错误），请联系管理员」；种子用户被停用后已签发的演示 token 随之失效（`resolveSession` 校验 `status === 'active'`）。
7. **精确坐标是数据级权限，脱敏在服务端**：设备接口（列表 / `all` / 详情）统一经 [src/utils/deviceCoordinate.ts](../../src/utils/deviceCoordinate.ts) 序列化。持有 `ops.device.coordinate.view` 时标 `coordinatePrecision: 'exact'` 并返回原始经纬度；不持有时把经纬度**向下取整**到 0.1° 格网（约 10 公里）并标 `'coarse'`。UI 不参与脱敏——直接调用接口同样只能拿到粗化值：地图页按同一字段提示「位置已粗化」（[src/pages/Map/components/StationUi.tsx](../../src/pages/Map/components/StationUi.tsx)），`/system/access` 页用「切换身份重新登录」（admin ↔ guest）对比两种精度，只按接口返回的 `coordinatePrecision` 标注，不自行遮蔽。两个轴一起粗化，不用单轴精确值定位。
8. **数据范围声明**：本演示无生产多租户，**不承诺行级数据范围控制**——持有查看权限的角色看到的是同一份全量数据，不按大区 / 部门 / 个人过滤。精确坐标是唯一按权限做的字段级数据范围控制，且由接口执行。
