import { describe, expect, it } from "vitest";
import { buildCompletionRequest } from "@/lib/providers";

describe("DeepSeek completion request", () => {
  it("disables thinking for extraction stages", () => {
    const request = buildCompletionRequest(
      "deepseek-v4-flash",
      "system",
      { sourceText: "source" },
      { thinking: "disabled", maxCompletionTokens: 2000 },
    );

    expect(request.thinking).toEqual({ type: "disabled" });
    expect(request.max_completion_tokens).toBe(2000);
    expect(request.response_format).toEqual({ type: "json_object" });
  });

  it("enables thinking for reasoning stages without returning a repair as system text", () => {
    const request = buildCompletionRequest(
      "deepseek-v4-flash",
      "system",
      { essay: "student" },
      { thinking: "enabled", maxCompletionTokens: 6000 },
      "repair only the score mapping",
    );

    expect(request.thinking).toEqual({ type: "enabled" });
    expect(request.messages.at(-1)).toEqual({ role: "user", content: "repair only the score mapping" });
  });
});
