import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";

const rubricPath = path.join(process.cwd(), "lib/scoring/V6_RUBRIC.txt");
const hashPath = path.join(process.cwd(), "lib/scoring/V6_RUBRIC.sha256");

function expectedHashPrefix() {
  return readFileSync(hashPath, "utf8").trim().split(/\s+/)[0];
}

export function verifyRubric(text: string) {
  const actual = createHash("sha256").update(text).digest("hex");
  if (!actual.startsWith(expectedHashPrefix())) {
    throw new Error("V6 rubric hash mismatch");
  }
  return true;
}

export function loadV6Rubric() {
  const text = readFileSync(rubricPath, "utf8");
  verifyRubric(text);
  return text;
}

export const V6_RUBRIC = loadV6Rubric();
