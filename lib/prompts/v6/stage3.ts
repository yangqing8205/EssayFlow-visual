import type { V6EvaluateInput, V6Stage1, V6Stage2 } from "@/lib/workflow/v6/types";
import { wordCount } from "@/lib/workflow/parser";

export const STAGE3_PROMPT = `你正在执行 EssayFlow v6 的第三阶段：把学生续写逐项与已经锁定的原文事实和故事方向核对。
不得重新解释原文，不得根据学生写成什么反推原文主题。只输出合法 JSON，不要输出推理过程。
所有 evidence 必须逐字存在于输入文本。四项 key 必须依次为 conflict、cohesion、theme、plausibility。

输出结构：
{"factChecks":[{"claim":"核对项","status":"consistent|conflict|not-established","evidence":"逐字证据"}],"draftJudgements":[{"key":"conflict|cohesion|theme|plausibility","status":"表现充分|轻微瑕疵|明显问题|失败/硬伤","judgement":"初步判断","evidence":"逐字证据"}]}`;

export function buildStage3Input(input: V6EvaluateInput, stage1: V6Stage1, stage2: V6Stage2) {
  return {
    ...input,
    studentOriginalWordCount: wordCount(input.studentParagraph1) + wordCount(input.studentParagraph2),
    sourceFacts: stage1,
    sourceDirection: stage2,
  };
}
