import { beforeEach, describe, expect, it, vi } from "vitest";

const { redirect } = vi.hoisted(() => ({ redirect: vi.fn() }));

vi.mock("next/navigation", () => ({ redirect }));

import LandingPage from "@/app/page";

describe("scoring service root", () => {
  beforeEach(() => redirect.mockClear());

  it("does not expose the retired EssayFlow landing page", () => {
    LandingPage();

    expect(redirect).toHaveBeenCalledWith("https://essayflow-demo.yangqing8205.chatgpt.site/");
  });
});
