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
  const requestOrigin = new URL(request.url).origin;
  const allowlist = (env.ESSAYFLOW_ALLOWED_ORIGINS ?? "")
    .split(",")
    .map(value => value.trim())
    .filter(Boolean);
  if (!origin || (origin !== requestOrigin && !allowlist.includes(origin))) {
    throw new EvaluationAccessError(403, "ORIGIN_FORBIDDEN", "当前网页来源未获准使用评测服务");
  }
  return origin;
}

export function consumeIpAllowance(request: Request, env: EvaluationEnv, now = Date.now()) {
  const ip = (request.headers.get("x-forwarded-for") ?? "unknown").split(",")[0].trim();
  const configuredLimit = Number.parseInt(env.EVALUATION_RATE_LIMIT_PER_HOUR ?? "3", 10) || 3;
  const limit = Math.min(3, Math.max(1, configuredLimit));
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
    "access-control-allow-headers": "content-type",
    vary: "Origin",
  };
}
