import { NextResponse } from "next/server";
import { DemoEvaluateRequestSchema, RealEvaluateRequestSchema } from "@/lib/schemas";
import { runDemoWorkflow, runWorkflow } from "@/lib/workflow/run";
import {
  ModelCallFailedError,
  ModelOutputInvalidError,
  ProviderNotConfiguredError,
} from "@/lib/providers";

type ErrorBody = { error: string; code: string; detail?: string };

function failure(body: ErrorBody, status: number) {
  return NextResponse.json(body, { status });
}

export async function POST(req: Request) {
  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return failure({ error: "请求内容不是合法 JSON", code: "BAD_REQUEST" }, 400);
  }

  // 脱敏示例必须显式请求，且不接受用户作文，杜绝混入真实评测路径。
  const demo = DemoEvaluateRequestSchema.safeParse(payload);
  if (demo.success) return NextResponse.json(runDemoWorkflow());

  const real = RealEvaluateRequestSchema.safeParse(payload);
  if (!real.success) {
    return failure(
      {
        error: real.error.issues[0]?.message ?? "提交内容不完整，无法开始评测",
        code: "INVALID_INPUT",
        detail: real.error.issues.map(issue => `${issue.path.join(".") || "root"}: ${issue.message}`).join("; "),
      },
      400,
    );
  }

  // mode 只用于路由判断，不进入评测输入。
  const parsed = {
    sourceText: real.data.sourceText,
    starter1: real.data.starter1,
    studentParagraph1: real.data.studentParagraph1,
    starter2: real.data.starter2,
    studentParagraph2: real.data.studentParagraph2,
  };
  try {
    return NextResponse.json(await runWorkflow(parsed));
  } catch (error) {
    if (error instanceof ProviderNotConfiguredError) {
      return failure({ error: error.message, code: error.code }, 503);
    }
    if (error instanceof ModelOutputInvalidError) {
      return failure({ error: error.message, code: error.code, detail: error.detail }, 502);
    }
    if (error instanceof ModelCallFailedError) {
      return failure({ error: error.message, code: error.code, detail: error.detail }, 502);
    }
    return failure(
      { error: error instanceof Error ? error.message : "评测失败", code: "UNEXPECTED_ERROR" },
      500,
    );
  }
}
