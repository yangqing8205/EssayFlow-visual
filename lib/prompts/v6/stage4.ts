import { V6_RUBRIC } from "@/lib/scoring/rubric";
import { wordCount } from "@/lib/workflow/parser";
import type { V6EvaluateInput, V6Stage1, V6Stage2, V6Stage3 } from "@/lib/workflow/v6/types";

const STAGE4_HEADER = `你正在执行 EssayFlow v6 的第四阶段：依据前三阶段已经锁定的结果，完成四项判档和语言档内定位。
只输出合法 JSON，不要解释，不要输出推理过程。不得改写或替换前三阶段证据。
contentJudgements 必须依次使用 conflict、cohesion、theme、plausibility。
languagePlacement 必须使用五级：档内最高位、档内较高位、档内中位、档内较低位、档内最低位。
issues 只能分析学生原创，original 不得来自两句给定首句。
同一缺陷只能归入一个主要内容维度。若 conflict 与 plausibility 同时判为“明显问题”或“失败/硬伤”，必须分别给出互不重复的证据，并且 plausibility 必须对应第三阶段已识别的独立事实、人物动机或关键因果冲突。解决过程仅偏简化、理想化但不违反事实时，只在 conflict 评价，不得在 plausibility 重复扣分。

输出结构：
{"total":1到25整数,"band":1到5,"bandRange":"档位区间","level":"第一档到第五档","languagePlacement":"五级档内位置","summary":"总评","languageRationale":"语言档内依据","constraints":["限制"],"contentJudgements":[{"key":"conflict|cohesion|theme|plausibility","label":"项目名","status":"表现充分|轻微瑕疵|明显问题|失败/硬伤","judgement":"判断","evidence":"逐字证据；多条用空格斜线空格分隔","suggestion":"建议"}],"story":{"theme":"主题","themeTrajectory":{"initialBelief":"初始认识","development":"变化过程","cognitiveEndpoint":"认知终点","themeSubject":"认知主体","themeObject":"字符串认知对象","themeValue":"具体价值","continuationAlignment":"延续或深化|方向一致但较浅|主题降格|主题冲突或倒退","explanation":"证据说明"}},"issues":[{"original":"学生原句","problem":"问题","explanation":"解释","rewrite":"改写"}]}

以下是唯一权威评分标准，必须逐字遵守：
`;

export const STAGE4_PROMPT = `${STAGE4_HEADER}${V6_RUBRIC}`;

export function buildStage4Input(
  input: V6EvaluateInput,
  stage1: V6Stage1,
  stage2: V6Stage2,
  stage3: V6Stage3,
) {
  return {
    ...input,
    studentOriginalWordCount: wordCount(input.studentParagraph1) + wordCount(input.studentParagraph2),
    sourceFacts: stage1,
    sourceDirection: stage2,
    continuationAudit: stage3,
  };
}
