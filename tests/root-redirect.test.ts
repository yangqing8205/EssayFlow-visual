import { beforeEach, describe, expect, it, vi } from "vitest";

const { redirect } = vi.hoisted(() => ({ redirect: vi.fn() }));

vi.mock("next/navigation", () => ({ redirect }));

import LandingPage from "@/app/page";

describe("scoring service root", () => {
  beforeEach(() => redirect.mockClear());

  it("opens the blue-white evaluation page", () => {
    LandingPage();

    expect(redirect).toHaveBeenCalledWith("/essayflow-evaluate.html");
  });
});
