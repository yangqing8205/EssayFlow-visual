import type { EssayInput } from "@/lib/schemas";

export const DEMO: EssayInput = {
  promptText: `阅读下面材料，根据其内容和所给段落开头语续写两段，使之构成一篇完整的短文。

Mia had trained for the school charity race for weeks, hoping to raise money for the town library. On the morning of the race, heavy rain turned the path into mud. Halfway through, she saw Leo, her strongest competitor, sitting beside the path with an injured ankle. The other runners hurried past. Mia remembered how Leo had once stayed after class to help her understand a difficult math problem. The finish line was close, and winning would bring the library much-needed attention. She slowed down as the crowd shouted from afar.

注意：
（1）续写词数应为150个左右；
（2）请按如下格式在答题卡的相应位置作答。
Without another thought, Mia turned back toward Leo.
When they finally reached the finish line together, the crowd fell silent for a moment.`,
  studentParagraph1: "She put his arm over her shoulder and helped him stand. The muddy path made every step difficult, but neither of them complained. Leo told her to leave him and win the race. Mia shook her head, saying that the library mattered, but a friend in need mattered more.",
  studentParagraph2: "Then cheers rose from every side. Although Mia did not win the race, several parents promised to donate to the library after hearing what she had done. Leo thanked her with tears in his eyes. Mia realized that kindness could carry a message farther than any first-place medal.",
};
