# EssayFlow｜高中英语读后续写 AI 评测产品

EssayFlow 是一个面向高中英语读后续写场景的 AI 评测产品，也是独立重构的作品集 Demo，不代表任何原公司系统或官方产品。

它不只是给作文一个分数，而是把教师对“矛盾是否解决、上下文是否衔接、主题是否完成、情节是否合理”等隐性判断拆解为可执行的评测规则，让学生获得有原文与作文证据支撑、可修改、可复评的写作反馈。

## 在线体验

- [打开 EssayFlow 正式网站](https://essayflow-yangqing.vercel.app/)
- [直接查看脱敏示例评测](https://essayflow-yangqing.vercel.app/evaluate?demo=1)

线上站点部署于 Vercel，无需安装。脱敏示例与真实作文评测会在界面中明确区分。

## 项目概览

通用大模型评价续写时，容易过度关注语言表面质量，忽略故事是否真正回应原文矛盾、人物行动是否合理，以及主题变化是否成立。EssayFlow 将这类隐性的教师判断组织成一条完整闭环：

**内容判档 → 语言档内定分 → 文本证据诊断 → 修改复评**

其中：

- **内容判档**：综合判断解决矛盾、文本衔接、主题升华与情节合理性，决定作文所在档位。
- **语言定分**：在内容档位内通读学生原创语言，判断准确性、清晰度、自然度、流畅度、丰富性及其对叙事的支撑效果。
- **证据诊断**：关键结论必须回到原文或学生续写中的具体文本证据，而不是只给抽象评价。
- **修改复评**：反馈指向可执行的修改方向，支持学生理解问题并再次提交验证。

总分为 25 分，但不采用“五个维度各 5 分”的机械相加方式；内容先决定档位，语言再决定档内位置。

## 我负责的工作

我独立完成了：

- 产品问题定义与核心评测闭环设计
- 教师判断标准的结构化拆解与 Rubric 设计
- 原文、固定段首句与学生原创之间的输入边界设计
- 证据链、异常状态与脱敏示例机制设计
- 模型约束方案、评测 Workflow 与服务端校验
- Web Demo 的交互实现、测试与线上部署

这不是停留在 Figma 中的概念原型，而是一套可以在线体验、具备真实模型接入能力的产品实现。

## AI 产品可信度设计

EssayFlow 特别处理了 AI 评测中容易被忽略的输入边界、证据可靠性和失败状态：

- 系统严格区分原文、固定段首句与学生原创，固定首句始终锁定且不参与语言纠错。
- 前两阶段分析原文时不会收到学生续写，避免模型用后文反向污染原文理解。
- 关键判断必须引用逐字证据，并经过服务端断言检查。
- 未配置真实模型时返回明确错误，不用无关示例冒充本次评测结果。
- 模型输出不符合结构化 Schema 时只进行有限修复；仍不合规则展示真实错误。
- 脱敏示例报告与真实作文评测通过 `reportKind` 明确标注，避免混淆。
- API Key 只保存在服务端环境变量中，不进入前端、仓库或日志。

## 产品流程

1. 粘贴完整题目与学生续写
2. 系统提取原文和两句固定段首语
3. 用户确认题目与原创内容边界
4. 系统分析原文事实、线索与人物认知终点
5. 核对学生续写事实并完成四项内容判档
6. 在档位内评估语言表现并生成证据化报告
7. 学生根据反馈修改并复评

## 技术实现

技术栈：Next.js、React、TypeScript、Tailwind CSS、Zod、Vitest 与 OpenAI-compatible SDK。

真实评测使用 `POST /api/v6/evaluate`，以 NDJSON 依次发送四阶段进度与最终报告：原文既定事实、原文线索与认知终点、学生续写事实核对、四项判档与语言定位。评分标准只读取 `lib/scoring/V6_RUBRIC.txt`，并由哈希测试防止意外改写。

页面与路由位于 `app/`，UI 位于 `components/`，数据契约、编排、Provider、Prompt 与 Rubric 分别位于 `lib/` 对应目录。详细架构见 `docs/architecture.md`。

## 开发者本地运行

以下内容仅供希望检查或继续开发源码的开发者使用；普通访客请直接打开上方正式网站。

```bash
npm install
npm run dev
```

启动后，在本机打开 `http://localhost:3000`。这个地址只在执行命令的电脑上有效，不是 EssayFlow 的公开网址。

真实模型接入：复制 `.env.example` 为 `.env.local`，配置 `OPENAI_API_KEY`、`EVALUATION_ACCESS_CODE` 和 `ESSAYFLOW_ALLOWED_ORIGINS`。默认使用 DeepSeek OpenAI-compatible 地址与 `deepseek-v4-flash`，也可通过 `OPENAI_BASE_URL`、`OPENAI_MODEL` 切换兼容提供商。

未配置模型时，真实评测返回 HTTP 503，前端同时禁用提交。脱敏示例报告只能由显式入口产生：`/evaluate?demo=1`，或对 `/api/evaluate` 提交 `{"mode":"demo"}`。

## 工程验证

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

`evals/cases.json` 包含 12 个自编评测场景索引。没有真实模型运行时，本项目不会伪造准确率；`tests/` 通过注入 Provider 验证产品契约，不访问网络。

## 隐私设计

- 仓库不含真实学生作文、内部地址、公司 Prompt 或密钥。
- 页面提示用户不要提交姓名、学校等个人信息。
- MVP 不实现账户和数据库，服务端不记录完整作文，刷新后内容即清除。
- `.env*` 默认被 Git 忽略，仓库中只保留 `.env.example`。

## 已知限制与路线图

当前 MVP 不含登录、支付、班级、文件上传或永久存储。真实评测必须配置模型 Key 才能运行；没有模型时宁可明确报错，也不展示与本次作文无关的内容。

下一步包括：完整修订差异视图、持久化限流、真实模型评测稳定性基线与可访问性审计。

## 部署

正式网站：[https://essayflow-yangqing.vercel.app/](https://essayflow-yangqing.vercel.app/)

项目通过 Vercel 部署，也可运行在其他支持 Next.js 的 Node 平台。构建命令为 `npm run build`，启动命令为 `npm start`。部署环境需要配置 `OPENAI_API_KEY`、`EVALUATION_ACCESS_CODE` 与 `ESSAYFLOW_ALLOWED_ORIGINS`；访问码和模型 Key 只能保存在部署平台的 Secret 中。
