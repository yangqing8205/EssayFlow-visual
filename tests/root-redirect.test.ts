import { beforeEach, describe, expect, it, vi } from "vitest";

const { redirect } = vi.hoisted(() => ({ redirect: vi.fn() }));

vi.mock("next/navigation", () => ({ redirect }));

import LandingPage from "@/app/page";

describe("scoring service root", () => {
  beforeEach(() => redirect.mockClear());

  it("opens the complete blue-white interactive essay", () => {
    LandingPage();

    expect(redirect).toHaveBeenCalledWith("/essayflow-visual-prototype-v2.html");
  });
});
