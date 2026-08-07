import type { V6EvaluateInput, V6Stage1 } from "@/lib/workflow/v6/types";

export const STAGE2_PROMPT = `你正在执行 EssayFlow v6 的第二阶段：依据原文、题目给定首句和第一阶段事实，确定故事方向。
你不得看到或推测学生原创续写。只输出合法 JSON，不要解释，不要输出推理过程。
sourceKeywords 除 p2Prerequisite 外，每条 quote 必须逐字来自原文且为 1—7 个英文词。
p2Prerequisite 的 quote 必须完整逐字等于 starter2；它的 function 用于穷尽说明该首句依赖的前提及其来源。
themeObject 必须是字符串。

输出结构：
{"conflict":"核心矛盾","concreteConflicts":["具体冲突"],"foreshadowing":["原文伏笔"],"sourceKeywords":[{"category":"catalyst|emotion|theme|constraint|p2Prerequisite","quote":"逐字引文","function":"功能"}],"themeTrajectory":{"initialBelief":"初始认识","development":"变化过程","cognitiveEndpoint":"认知终点","cognitiveEndpointQuote":"原文直接证据","endpointStatus":"已经形成认知终点|仅给出未完成走向","themeSubject":"认知主体","themeObject":"认知对象","themeValue":"具体价值"}}`;

export function buildStage2Input(input: V6EvaluateInput, stage1: V6Stage1) {
  return {
    sourceText: input.sourceText,
    starter1: input.starter1,
    starter2: input.starter2,
    sourceFacts: stage1,
  };
}
