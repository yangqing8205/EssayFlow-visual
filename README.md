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

真实模型接入：复制 `.env.example` 为 `.env.local`，配置 `OPENAI_API_KEY`，可选 `OPENAI_BASE_URL`（网关或兼容端点）与 `OPENAI_MODEL`（默认 `gpt-4.1-mini`）。使用自建或第三方网关时，`OPENAI_MODEL` 需填该网关自己的模型 ID，可先请求其 `/v1/models` 确认。Key 只从服务端环境变量读取，不进入前端、仓库或日志；`/api/provider-status` 只返回“是否已配置”与模型名。

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

单次评测由一次模型调用产出完整报告，实测在 OpenAI-compatible 网关上耗时约 35—40 秒，前端目前只有阶段提示、没有流式输出，长等待是当前最明显的体验短板。弱模型可能需要多次结构修复才能通过 Schema。评分稳定性（同一输入多次运行的分数波动）尚未建立基线。下一步包括：完整修订差异视图、SQLite 可选本地历史、DOCX/PDF 导入、流式节点进度、真实模型 eval 基线与可访问性审计。

## 部署

可直接部署到支持 Next.js 的 Node 平台。构建命令 `npm run build`，启动命令 `npm start`。评测功能需要 `OPENAI_API_KEY`，只在部署平台的 Secret 管理中保存密钥；未配置时首页与示例报告仍可访问，真实评测会明确提示未配置模型。
