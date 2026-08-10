import type { V6EvaluateInput, V6Stage1, V6Stage2 } from "@/lib/workflow/v6/types";
import { wordCount } from "@/lib/workflow/parser";
import { V6_RUBRIC } from "@/lib/scoring/rubric";

const STAGE3_HEADER = `你正在执行 EssayFlow v6 的第三阶段：把学生续写逐项与已经锁定的原文事实和故事方向核对。
不得重新解释原文，不得根据学生写成什么反推原文主题。只输出合法 JSON，不要输出推理过程。
所有 evidence 必须逐字存在于输入文本。四项 key 必须依次为 conflict、cohesion、theme、plausibility。
解决矛盾必须评价“问题—行动—结果”的完整程度，不得仅因结尾出现道歉、接受或和解就判为表现充分。必须检查核心冲突是否被面对、人物态度变化是否有过程、解决是否主要依靠原文内生信息；礼物或其他新增物品只能辅助行动，不能替代沟通与认知变化。

输出结构：
{"conflictAudit":{"coreConflictResponse":"充分回应|部分回应|未回应","processClosure":"完整|简化|缺失","resolutionDriver":"原文内生信息|内生信息与外部细节并用|主要依赖外部替代","resultOnly":false,"evidence":"逐字证据；多条用空格斜线空格分隔"},"factChecks":[{"claim":"核对项","status":"consistent|conflict|not-established","evidence":"逐字证据"}],"draftJudgements":[{"key":"conflict|cohesion|theme|plausibility","status":"表现充分|轻微瑕疵|明显问题|失败/硬伤","judgement":"初步判断","evidence":"逐字证据；多条用空格斜线空格分隔"}]}

以下是唯一权威评分标准，必须逐字遵守：
`;

export const STAGE3_PROMPT = `${STAGE3_HEADER}${V6_RUBRIC}`;

export const STAGE3_RECOVERY_PROMPT = `把输入中的原文事实、故事方向和学生续写整理为下面的 JSON。不要输出标题、解释或外层对象。
factChecks 可以为空数组；draftJudgements 必须恰好四项并依次使用 conflict、cohesion、theme、plausibility。
status 只能是 表现充分、轻微瑕疵、明显问题、失败/硬伤。evidence 必须逐字来自输入。
conflict 不以结尾是否和好为标准：必须检查核心冲突、人物主动行动、态度变化过程和结果是否形成闭环。若只有道歉、礼物和立即接受，缺少真实沟通或转变过程，不得判为表现充分。过程简化或理想化只评价 conflict，不得在 plausibility 重复扣分。
{"conflictAudit":{"coreConflictResponse":"充分回应|部分回应|未回应","processClosure":"完整|简化|缺失","resolutionDriver":"原文内生信息|内生信息与外部细节并用|主要依赖外部替代","resultOnly":false,"evidence":"逐字证据"},"factChecks":[{"claim":"核对项","status":"consistent|conflict|not-established","evidence":"逐字证据"}],"draftJudgements":[{"key":"conflict|cohesion|theme|plausibility","status":"表现充分|轻微瑕疵|明显问题|失败/硬伤","judgement":"判断","evidence":"逐字证据"}]}`;

export function buildStage3Input(input: V6EvaluateInput, stage1: V6Stage1, stage2: V6Stage2) {
  return {
    ...input,
    studentOriginalWordCount: wordCount(input.studentParagraph1) + wordCount(input.studentParagraph2),
    sourceFacts: stage1,
    sourceDirection: stage2,
  };
}
