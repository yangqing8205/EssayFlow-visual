import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("public evaluation page", () => {
  const html = readFileSync(join(process.cwd(), "public/essayflow-evaluate.html"), "utf8");
  const storyHtml = readFileSync(
    join(process.cwd(), "public/essayflow-visual-prototype-v2.html"),
    "utf8",
  );

  it("uses the approved blue-white editorial design and the live v6 endpoint", () => {
    expect(html).toContain("--blue: #1847ff");
    expect(html).toContain("开始 EssayFlow 评测");
    expect(html).toContain("/api/v6/evaluate");
    expect(html).not.toContain("--brand:#1f6047");
    expect(html).not.toContain("Beta 访问码");
    expect(html).not.toContain("x-essayflow-access-code");
    expect(html).not.toContain("essayflow-beta-code");
  });

  it("does not expose internal validation diagnostics in the browser", () => {
    expect(html).not.toContain("event.diagnostic");
    expect(html).not.toContain("错误编号：");
    expect(html).toContain("event.message || '评测未完成，请重试。'");
  });

  it("keeps the reading experience and evaluation in one site", () => {
    expect(storyHtml).toContain('href="essayflow-evaluate.html"');
    expect(html).toContain('href="essayflow-visual-prototype-v2.html#page-32"');
  });
});
