# 架构与重构边界

## 对原工作流的结构化理解

根据需求文本（未收到实际 DSL、公司 Prompt 或截图），当前公开流程抽象为：输入解析 → 用户确认内容边界 → 故事理解与语言整体诊断 → 四项内容共同判档 → 语言表现决定档内分 → 报告整形 → 修订版本比较。可借鉴的是职责分离、结构化中间态、证据约束和人工确认点。评分不采用五维各 5 分相加，不统计硬性错误数量，也不设置审核 Prompt。

## 不可公开复用的内容

公司原始 Prompt、内部节点 ID 与名称、私有知识库、业务阈值、MCP 地址、真实学生文本、内部链接和版本记录均不进入本项目。本仓库只含重新设计的通用 Rubric、自编示例和公开风格接口。

## 数据流

```text
EssayInput → ParsedEssay（用户确认） → StoryAnalysis + LanguageAnalysis
→ 四项内容标准共同判档 → 语言整体表现决定档内分 → ScoreReport → FinalReport
→ 修订提交 → RevisionComparison
```

页面只消费结构化结果；评分规则位于 `lib/rubrics`，评测 Prompt 位于 `lib/prompts`，模型入口位于 `lib/providers`，编排与段首句锁定位于 `lib/workflow`。

## 真实评测与脱敏示例的隔离

早期版本在未配置模型时由 `lib/agents/mock.ts` 返回一份忽略入参的写死报告，导致任何作文都得到同一份示例结果。该模块已删除，示例内容迁移到 `data/examples/demo-report.ts`，只作为静态展示素材存在。

现在两条链路互不相交：

```text
POST /api/evaluate  { mode?: "real", 五个输入块 }  → runWorkflow()     → reportKind: "real"
POST /api/evaluate  { mode: "demo" }（不接受作文） → runDemoWorkflow() → reportKind: "demo"
```

`runWorkflow()` 没有任何可以产出示例数据的代码路径。它把 `sourceText`、`starter1`、`studentParagraph1`、`starter2`、`studentParagraph2` 以及 `lockedStarters` 全部传给模型，只接受符合 `ModelReportSchema` 的 JSON。失败时的行为是显式的：未配置模型抛 `ProviderNotConfiguredError`（503）；输出结构不合规时按 `MAX_REPAIR_ATTEMPTS` 有限次追加修复提示重试，仍失败抛 `ModelOutputInvalidError`（502）；调用异常抛 `ModelCallFailedError`（502）。任何情况下都不回退示例、不伪造成功。

报告不再使用布尔 `isMock`，而是用 `reportKind: "real" | "demo"` 携带来源，页面通过 `REPORT_KIND_LABEL` 标注“真实作文评测”或“脱敏示例报告”，示例报告额外显示横幅。示例报告不按文章关键词分支，系统里只有一份固定示例素材。

Provider 通过 `RunWorkflowOptions.providerFactory` 注入，测试因此完全不触网。`providerStatus()` 只读服务端环境变量并返回 `{ configured, model, baseUrlConfigured }`，不返回 Key。

## 段首句锁定

给定首句的锁定不依赖模型自觉。`lib/workflow/starters.ts` 在服务端强制执行：`stripStarterIssues()` 移除任何指向段首句的语言问题，`studentOriginalWordCount()` 只统计两段学生原创，`ensureStartersPreserved()` 在模型改写或丢弃首句时把原句补回 `polishedVersion`。

## 路由结构

`/` 是产品介绍首页（服务端组件，文案集中在 `components/landing/content.ts`），`/evaluate` 是评测工作台（`components/EvaluateWorkbench.tsx`，客户端组件，包在 `Suspense` 中以使用 `useSearchParams`），`/evaluate?demo=1` 展示脱敏示例报告。`/api/provider-status` 供前端判断是否显示未配置提示并禁用提交。
