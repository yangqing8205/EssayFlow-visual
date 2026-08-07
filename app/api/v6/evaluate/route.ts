import { ModelCallFailedError, ModelOutputInvalidError } from "@/lib/providers";
import {
  EvaluationAccessError,
  allowedOrigin,
  consumeIpAllowance,
  corsHeaders,
} from "@/lib/security/evaluation-access";
import { V6PostcheckError } from "@/lib/scoring/postcheck";
import { runV6Pipeline } from "@/lib/workflow/v6/run";
import { V6EvaluateInputSchema, type V6EvaluateInput, type V6StageEvent } from "@/lib/workflow/v6/types";

type EvaluationEnv = Record<string, string | undefined>;
type Pipeline = (
  input: V6EvaluateInput,
  options: { onStage?: (event: V6StageEvent) => void },
) => Promise<unknown>;

type HandlerDependencies = {
  env?: EvaluationEnv;
  now?: () => number;
  runPipeline?: Pipeline;
};

function jsonError(error: EvaluationAccessError, origin?: string) {
  return Response.json(
    { error: error.message, code: error.code },
    { status: error.status, headers: origin ? corsHeaders(origin) : undefined },
  );
}

function safeStreamError(error: unknown) {
  if (error instanceof ModelOutputInvalidError || error instanceof V6PostcheckError) {
    return { type: "error", code: "MODEL_FORMAT_ERROR", message: "模型结果未通过评分规则校验，请重试" };
  }
  if (error instanceof ModelCallFailedError) {
    const detail = error.detail.toLowerCase();
    if (/\b401\b|authentication|invalid api key|incorrect api key/.test(detail)) {
      return { type: "error", code: "PROVIDER_AUTH_ERROR", message: "模型服务的 API Key 无效，请检查 Vercel 环境变量" };
    }
    if (/\b402\b|insufficient balance|insufficient quota|quota exceeded|余额/.test(detail)) {
      return { type: "error", code: "PROVIDER_BALANCE_ERROR", message: "模型账户余额或额度不足，请检查 DeepSeek 控制台" };
    }
    if (/\b429\b|rate.?limit|too many requests/.test(detail)) {
      return { type: "error", code: "PROVIDER_RATE_LIMIT", message: "模型服务请求过多，请稍后再试" };
    }
    if (/\b404\b|model.?not.?found|unknown model/.test(detail)) {
      return { type: "error", code: "PROVIDER_MODEL_NOT_FOUND", message: "配置的模型名称不可用，请检查 OPENAI_MODEL" };
    }
    if (/\b400\b|invalid.?request|unknown parameter|unsupported parameter|unrecognized/.test(detail)) {
      return { type: "error", code: "PROVIDER_REQUEST_INVALID", message: "模型请求参数与服务不兼容，请检查 DeepSeek API 配置" };
    }
  }
  return { type: "error", code: "MODEL_UNAVAILABLE", message: "评测服务暂时不可用，请稍后重试" };
}

export function createV6EvaluateHandler(dependencies: HandlerDependencies = {}) {
  const env = dependencies.env ?? process.env;
  const now = dependencies.now ?? Date.now;
  const pipeline = dependencies.runPipeline ?? runV6Pipeline;

  return async function handle(request: Request) {
    let origin: string | undefined;
    try {
      origin = allowedOrigin(request, env);
      consumeIpAllowance(request, env, now());
    } catch (error) {
      if (error instanceof EvaluationAccessError) return jsonError(error, origin);
      return Response.json({ error: "访问校验失败", code: "ACCESS_ERROR" }, { status: 500 });
    }

    let payload: unknown;
    try {
      if (!request.headers.get("content-type")?.includes("application/json")) {
        return Response.json(
          { error: "请求必须使用 JSON", code: "INVALID_INPUT" },
          { status: 400, headers: corsHeaders(origin) },
        );
      }
      payload = await request.json();
    } catch {
      return Response.json(
        { error: "请求内容不是合法 JSON", code: "INVALID_INPUT" },
        { status: 400, headers: corsHeaders(origin) },
      );
    }

    const parsed = V6EvaluateInputSchema.safeParse(payload);
    if (!parsed.success) {
      return Response.json(
        { error: parsed.error.issues[0]?.message ?? "提交内容不完整", code: "INVALID_INPUT" },
        { status: 400, headers: corsHeaders(origin) },
      );
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        const send = (value: unknown) => controller.enqueue(encoder.encode(`${JSON.stringify(value)}\n`));
        void (async () => {
          try {
            const result = await pipeline(parsed.data, {
              onStage: event => send({ type: "stage", ...event }),
            });
            send({ type: "result", data: result });
          } catch (error) {
            send(safeStreamError(error));
          } finally {
            controller.close();
          }
        })();
      },
    });

    return new Response(stream, {
      status: 200,
      headers: {
        ...corsHeaders(origin),
        "content-type": "application/x-ndjson; charset=utf-8",
        "cache-control": "no-store",
      },
    });
  };
}

export const POST = createV6EvaluateHandler();

export async function OPTIONS(request: Request) {
  try {
    const origin = allowedOrigin(request, process.env);
    return new Response(null, { status: 204, headers: corsHeaders(origin) });
  } catch {
    return new Response(null, { status: 403 });
  }
}
