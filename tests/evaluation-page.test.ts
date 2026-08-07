import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("public evaluation page", () => {
  const html = readFileSync(join(process.cwd(), "public/essayflow-evaluate.html"), "utf8");

  it("uses the approved blue-white editorial design and the live v6 endpoint", () => {
    expect(html).toContain("--blue: #1847ff");
    expect(html).toContain("开始 EssayFlow 评测");
    expect(html).toContain("/api/v6/evaluate");
    expect(html).not.toContain("--brand:#1f6047");
  });
});
