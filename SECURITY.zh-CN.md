# 安全策略（中文版）

> 英文主文档：[SECURITY.md](./SECURITY.md)；本文件为其完整中文副本，两者同步维护。

## 报告漏洞

**请勿使用公开 issue 报告安全问题。** 推荐渠道：

1. GitHub 私有漏洞报告：仓库页面 **Security** 标签 → **Report a vulnerability**（维护者需先在 Settings → Code security 中开启 Private vulnerability reporting）
2. 邮件：lishuai4415@gmail.com（package.json author）

请在报告中包含：影响版本/commit、复现步骤、影响评估。我们会在 **3 个工作日内确认收到**，修复进度会通过原渠道反馈。

## 支持版本

| 版本            | 支持状态 |
| --------------- | -------- |
| master 分支最新 | ✅       |
| 历史 tag        | ❌       |

## 质量门禁

- PR 阶段 CI：typecheck / 严格 lint（含 .mjs）/ vitest / 两条显式演示构建 / 体积预算与样式覆盖 / **产物密钥扫描**（仅核对已声明的公开客户端 token 指纹）/ 全量依赖公告与真实补丁验证 / Playwright（包含第三方引起的 CSP 违规，不作忽略）
- 部署后：等待线上 `version.json` 切到本次提交，对线上地址跑 `@smoke` 用例
- 提交阶段：pre-commit（lint-staged + typecheck）
- 仓库卫生测试：可提交文件不含 JWT 形态秘钥与本地工件

## 已知限制

仓库只有前端模板，没有真实后端。纯前端演示必须显式设置 `UMI_APP_DEMO_MODE=true`。演示不校验密码，也无法建立可信数据隔离——权限点在浏览器内演示后端逐请求校验（可演示权限差异），但一切校验都在用户自己的浏览器里执行，不构成真实安全边界。演示只使用虚构数据，登录 token 在 sessionStorage；启动会移除旧版 localStorage token。浏览器内的数据与脚本均由用户控制。

默认关闭演示。真实生产构建必须设置同源 `UMI_APP_API_BASE`，否则失败；GitHub Pages 仅允许公开演示。真实模式采用 Cookie 会话，删除持久 bearer 入口，禁止跨源及单次请求覆盖 API 地址，登录回跳规范化后限制在本站应用内。前端权限展示不能替代服务端授权。

Vercel 与 nginx 强制 CSP，生产 HTML 带 meta CSP。GitHub Pages 无法提供 `frame-ancestors`/`X-Frame-Options` 响应头，因此不能承载需要防嵌入保护的真实管理后台。Cesium 的 Knockout 控件需要 `unsafe-eval`，antd 样式需要内联样式；富文本须持续经 DOMPurify，PDF 禁用 eval/脚本，上传与 URL 输入须经过相应边界。未配置地图 key 时不使用第三方共享凭据，未审查的统计集成拒绝构建。

本地 preview 默认仅监听 127.0.0.1，拒绝目录越界、逃逸符号链接及异常编码。它用于本机验证；生产应使用 HTTPS 静态服务入口。nginx 监听内网 8080，TLS 在部署入口终止；HSTS 只有浏览器收到 HTTPS 响应时才生效。

## 真实后端接入契约

当前没有后端实现，以下要求在接入时由服务端落实，不能用前端测试代替：

- 会话 Cookie 使用 `Secure`、`HttpOnly`、合适的 `SameSite`，限制 Path，避免宽泛 Domain；登录重新签发会话，退出在服务端失效会话。
- 每个业务接口独立校验身份、角色、对象归属及数据范围；不能接受客户端传来的角色或演示 token。
- 状态变更使用 POST/PUT/PATCH/DELETE，检查可信 Origin 和前端发送的 `X-Requested-With: XMLHttpRequest`，拒绝跨源 CORS/简单请求；GET/HEAD 不得修改状态。若引入额外跨源场景须配套真正的 CSRF 方案。
- 登录、退出、currentUser 响应 `Cache-Control: no-store`；错误使用正确 HTTP 状态，接口不得返回 SPA HTML。口令只发往固定同源 API，服务端负责限速、口令存储和会话寿命。
- HTTPS 入口配置证书、同源 API 代理、CSP 和其他安全头，并验证真实响应与权限回归。模板本身没有可声明已通过的线上后端或 TLS 环境。

## 文档及依赖边界

XLSX 在交给 ExcelJS 前校验 ZIP、实际解压量、XML、坐标、合并和命名区域；有文件/行列/字段预算，可终止 worker 的 10 秒时限。PDF 有文件/页数/可见窗口/画布与图片预算，并取消旧任务。这些预算限制模板允许的输入，不能证明浏览器原生解码器对任意未知畸形文件不存在缺陷。

历史公告不再登记为无修复的接受项。真实升级、移除或源码补丁见 [THIRD-PARTY-NOTICES.md](./THIRD-PARTY-NOTICES.md)。原始 `pnpm audit` 根据真实版本号仍可能命中本地已修补包；保留原始结果，`pnpm audit:security` 必须同时验证所有安装实例的源码哈希和真实攻击回归，新公告及未证明修补的实例均失败。不得通过忽略公告、伪造版本号或只评估不可达来让门禁通过。
