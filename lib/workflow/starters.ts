import type { LanguageIssue, ParsedEssay } from "@/lib/schemas";
import { wordCount } from "@/lib/workflow/parser";

function normalize(text: string) {
  return text.toLocaleLowerCase().replace(/[\s\p{P}]+/gu, " ").trim();
}

/** 段首语属于锁定内容：命中给定首句的精修条目一律剔除，不允许被纠错。 */
export function stripStarterIssues(issues: LanguageIssue[], parsed: ParsedEssay) {
  const locked = [parsed.starter1, parsed.starter2].map(normalize).filter(Boolean);
  return issues.filter(issue => {
    const target = normalize(issue.sentence);
    if (!target) return false;
    return !locked.some(starter => target === starter || target.includes(starter) || starter.includes(target));
  });
}

/** 学生原创词数只统计两段续写，给定首句不计入。 */
export function studentOriginalWordCount(parsed: ParsedEssay) {
  return wordCount(parsed.studentParagraph1) + wordCount(parsed.studentParagraph2);
}

/** 优化版必须原样保留两句给定首句；模型漏写时在段首补回，无法定位段落时退回学生原文。 */
export function ensureStartersPreserved(polished: string, parsed: ParsedEssay) {
  const body = normalize(polished);
  const starters = [parsed.starter1, parsed.starter2];
  if (starters.every(starter => body.includes(normalize(starter)))) return polished;
  const blocks = polished.split(/\n\s*\n/).map(block => block.trim()).filter(Boolean);
  if (blocks.length === 2) {
    return blocks
      .map((block, index) => {
        const starter = starters[index];
        return normalize(block).includes(normalize(starter)) ? block : `${starter} ${block}`;
      })
      .join("\n\n");
  }
  return `${parsed.starter1} ${parsed.studentParagraph1}\n\n${parsed.starter2} ${parsed.studentParagraph2}`;
}
