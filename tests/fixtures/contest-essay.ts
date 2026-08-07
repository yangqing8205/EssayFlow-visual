import type { EssayInput } from "@/lib/schemas";

/**
 * 端到端测试用的自编「参加作文比赛」题目，与 Mia 示例完全无关。
 * 用于验证真实评测链路只使用本次输入。
 */
export const CONTEST_ESSAY: EssayInput = {
  promptText: `阅读下面材料，根据其内容和所给段落开头语续写两段，使之构成一篇完整的短文。

Daniel had always believed that writing was something he did only for himself. He filled cheap notebooks with small observations: his grandfather's fishing boat, the smell of rain on the pier, the way his mother hummed while cooking. When his English teacher, Ms. Reed, urged him to enter the national essay competition, Daniel hesitated, because competitions meant judges, rankings and comparison. Still, he sent in a piece about his grandfather, and weeks later his name appeared on the shortlist. In the final round the twelve finalists had three hours to write a new essay on a topic revealed on the spot. The topic was one word: Home. Around him keyboards rattled. Daniel stared at his blank page and realised that every sentence he tried sounded like something built to impress the judges rather than something true.

注意：
（1）续写词数应为150个左右；
（2）请按如下格式在答题卡的相应位置作答。
With twenty minutes left, Daniel put down his pen and closed his eyes.
When the results were announced, Daniel was not among the top three.`,
  studentParagraph1:
    "He thought about his grandfather's boat and the sound of water against old wood. Slowly he began to write again, not about what home should mean, but about the narrow kitchen where his mother hummed on winter mornings. The sentences came without effort now. He stopped counting how many lines the others had finished. When the bell rang his hands were shaking, but the page in front of him finally felt like his own.",
  studentParagraph2:
    "Ms. Reed found him in the corridor and asked whether he was disappointed. Daniel shook his head and said he had written something he wanted to keep. That evening he read the essay aloud to his grandfather on the pier. The old man listened without speaking, then said he could hear the boat in it. Daniel understood that the writing had never needed a judge to be worth something.",
};

/** Mock 报告特有的词汇；真实评测结果中出现任何一个都说明发生了污染。 */
export const MOCK_MARKERS = ["Mia", "Leo", "library", "图书馆", "charity", "medal"];
