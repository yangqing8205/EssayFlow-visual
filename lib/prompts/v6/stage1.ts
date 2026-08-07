import type { V6EvaluateInput } from "@/lib/workflow/v6/types";

export const STAGE1_PROMPT = `你正在执行 EssayFlow v6 的第一阶段：只读原文并锁定既定事实。
你看不到、也不得推测学生续写。只输出合法 JSON，不要解释，不要输出推理过程。

输出结构：
{"facts":[{"fact":"既定事实","evidence":"原文逐字引文"}],"characters":["人物"],"relationships":["人物关系"],"knownInformation":["人物已知或未知的信息"],"completedEvents":["原文已经完成的事件"]}`;

export function buildStage1Input(input: V6EvaluateInput) {
  return { sourceText: input.sourceText };
}
