import { timingSafeEqual } from "node:crypto";

type EvaluationEnv = Record<string, string | undefined>;
type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();
const HOUR_MS = 60 * 60 * 1000;

export class EvaluationAccessError extends Error {
  constructor(readonly status: number, readonly code: string, message: string) {
    super(message);
    this.name = "EvaluationAccessError";
  }
}

export function clearEvaluationBuckets() {
  buckets.clear();
}

export function allowedOrigin(request: Request, env: EvaluationEnv) {
  const origin = request.headers.get("origin") ?? "";
  const allowlist = (env.ESSAYFLOW_ALLOWED_ORIGINS ?? "")
    .split(",")
    .map(value => value.trim())
    .filter(Boolean);
  if (!origin || !allowlist.includes(origin)) {
    throw new EvaluationAccessError(403, "ORIGIN_FORBIDDEN", "当前网页来源未获准使用评测服务");
  }
  return origin;
}

function secureEqual(received: string, expected: string) {
  const left = Buffer.from(received);
  const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
}

export function requireAccessCode(request: Request, env: EvaluationEnv) {
  const expected = env.EVALUATION_ACCESS_CODE?.trim();
  if (!expected) {
    throw new EvaluationAccessError(503, "ACCESS_NOT_CONFIGURED", "评测服务尚未配置访问保护");
  }
  const received = request.headers.get("x-essayflow-access-code") ?? "";
  if (!secureEqual(received, expected)) {
    throw new EvaluationAccessError(401, "UNAUTHORIZED", "访问码不正确");
  }
}

export function consumeIpAllowance(request: Request, env: EvaluationEnv, now = Date.now()) {
  const ip = (request.headers.get("x-forwarded-for") ?? "unknown").split(",")[0].trim();
  const limit = Math.max(1, Number.parseInt(env.EVALUATION_RATE_LIMIT_PER_HOUR ?? "10", 10) || 10);
  const current = buckets.get(ip);
  const bucket = !current || current.resetAt <= now ? { count: 0, resetAt: now + HOUR_MS } : current;
  if (bucket.count >= limit) {
    throw new EvaluationAccessError(429, "RATE_LIMITED", "本小时评测次数已用完，请稍后再试");
  }
  bucket.count += 1;
  buckets.set(ip, bucket);
}

export function corsHeaders(origin: string) {
  return {
    "access-control-allow-origin": origin,
    "access-control-allow-methods": "POST, OPTIONS",
    "access-control-allow-headers": "content-type, x-essayflow-access-code",
    vary: "Origin",
  };
}

