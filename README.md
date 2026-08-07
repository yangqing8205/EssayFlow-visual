# EssayFlow｜高中英语读后续写评测与辅导

EssayFlow 是一个独立重构的作品集 Demo，不是任何原公司系统或官方产品。它帮助高中生把“一个分数”变成有原文和作文证据支撑、可执行、可复盘的写作反馈。

## 核心体验

完整主链路为：粘贴完整题目并提交 P1/P2 → 系统自动提取原文和两句段首语 → 用户确认内容边界 → 内容判档与语言档内定分 → 报告 → 修改复评。解决矛盾、文本衔接、主题升华、情节合理性四项内容标准共同决定档位；语言整体表现决定该档内的具体分数。总分 25 分，但不采用“五维各 5 分”相加。

系统严格区分原文、固定首句与学生原创，并以 Zod 验证边界数据。评测先综合四项内容标准判档，再通读学生原创语言的准确性、清晰度、自然度、流畅度、丰富性及叙事支撑效果，决定档内高、中、低位。系统不机械统计硬性错误数量，也不设置审核 Prompt；固定首句始终锁定且不参与语言纠错。

## 本地运行

```bash
npm install
npm run dev
```

打开 `http://localhost:3000` 是产品介绍首页，`/evaluate` 是评测工作台。

真实模型接入：复制 `.env.example` 为 `.env.local`，配置 `OPENAI_API_KEY`、`EVALUATION_ACCESS_CODE` 和 `ESSAYFLOW_ALLOWED_ORIGINS`。默认使用 DeepSeek OpenAI-compatible 地址与 `deepseek-v4-flash`，也可通过 `OPENAI_BASE_URL`、`OPENAI_MODEL` 切换兼容提供商。Key 只从服务端环境变量读取，不进入前端、仓库或日志；`/api/provider-status` 只返回“是否已配置”与模型名。

作品集静态页使用 `POST /api/v6/evaluate`。该接口按 NDJSON 依次发送四阶段进度与最终报告：原文既定事实、原文线索与认知终点、学生续写事实核对、四项判档与语言定位。前两阶段不会收到学生续写；评分标准只读取 `lib/scoring/V6_RUBRIC.txt`，并由哈希测试防止意外改写。最终报告还会经过分数与档内位置、第五档熔断、逐字证据、给定首句锁定等服务端断言。

未配置模型时，真实评测不会退回任何示例数据，而是返回 HTTP 503 与“当前未配置 AI 模型，暂时无法分析你的作文”，前端同时禁用提交。模型输出不符合 `FinalReport` Schema 时，系统按有限次数请求模型修复结构，仍不合规则返回 502 真实错误，绝不展示编造的报告。

脱敏示例报告只能由显式入口产生：`/evaluate?demo=1` 或对 `/api/evaluate` 提交 `{"mode":"demo"}`（该请求不接受作文内容）。每份报告都带 `reportKind`，页面据此标注“真实作文评测”或“脱敏示例报告”。

## 工程命令

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

`evals/cases.json` 包含 12 个自编评测场景索引。没有真实模型运行时，本项目不会伪造准确率。`tests/` 中的用例通过注入 Provider 验证产品契约，不访问网络。

## 隐私设计

- 不含真实学生作文、内部地址、公司 Prompt 或密钥。
- 页面提示不要提交姓名、学校等信息。
- MVP 不实现账户和数据库，服务端也不记录完整作文，刷新即清除。
- API Key 仅从环境变量读取；`.env*` 默认被 Git 忽略，仓库中只有 `.env.example`。

## 技术栈与结构

Next.js、React、TypeScript、Tailwind CSS、Zod、Vitest、OpenAI-compatible SDK。页面与路由在 `app/`，UI 在 `components/`（落地页文案与预览在 `components/landing/`），数据契约、编排、Provider、Prompt 和 Rubric 分别置于 `lib/` 对应目录，示例展示素材在 `data/examples/`。详细说明见 `docs/architecture.md`。

## 已知限制与路线图

MVP 不含登录、支付、班级、文件上传或永久存储。真实评测必须配置 Key 才能运行，这是有意的设计：没有模型时宁可报错，也不展示任何与本次作文无关的内容。

V6 真实评测由四次隔离调用完成，并通过 NDJSON 实时发送阶段状态。第 1、2 阶段关闭思考模式，第 3、4 阶段开启思考模式；每阶段最多进行一次结构或语义修复。评分稳定性（同一输入多次运行的分数波动）仍需在配置真实 DeepSeek Key 后建立基线。下一步包括：完整修订差异视图、持久化限流、真实模型 eval 基线与可访问性审计。

## 部署

可直接部署到 Vercel 或其他支持 Next.js 的 Node 平台。构建命令 `npm run build`，启动命令 `npm start`。部署环境必须配置 `OPENAI_API_KEY`、`EVALUATION_ACCESS_CODE`、`ESSAYFLOW_ALLOWED_ORIGINS`；建议显式配置 `OPENAI_BASE_URL=https://api.deepseek.com` 与 `OPENAI_MODEL=deepseek-v4-flash`。访问码和模型 Key 只能保存在平台 Secret 中。

静态原型页默认调用 `http://localhost:3000/api/v6/evaluate`。部署后，在加载页面前设置线上接口地址：

```html
<script>window.ESSAYFLOW_API_URL = "https://你的服务域名/api/v6/evaluate";</script>
```

接口同时强制来源白名单、访问码和按 IP 的每小时限流。当前限流存于单个函数实例内存，适合低流量 Beta，不应当被视为严格计费配额；正式开放前应换成共享存储。
