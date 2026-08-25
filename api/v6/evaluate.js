const { Readable } = require("node:stream");

const SCORING_ENDPOINT = "https://essayflow-scoring-service.vercel.app/api/v6/evaluate";

function clientIp(request) {
  const forwarded = request.headers["x-forwarded-for"];
  return typeof forwarded === "string" ? forwarded.split(",")[0].trim() : "unknown";
}

function invalidPayload(payload) {
  return !payload || typeof payload !== "object" || [
    "sourceText",
    "starter1",
    "studentParagraph1",
    "starter2",
    "studentParagraph2",
  ].some((key) => typeof payload[key] !== "string" || payload[key].trim().length < 5);
}

module.exports = async function evaluate(request, response) {
  if (request.method !== "POST") {
    response.setHeader("allow", "POST");
    return response.status(405).json({ error: "只支持 POST 评测请求", code: "METHOD_NOT_ALLOWED" });
  }
  if (invalidPayload(request.body)) {
    return response.status(400).json({ error: "请完整填写原文、开头和两段续写后再评测", code: "INVALID_INPUT" });
  }

  try {
    const upstream = await fetch(SCORING_ENDPOINT, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        // The scoring service only accepts its configured server origin. The
        // browser always talks to this same-origin proxy, so no CORS bypass is exposed.
        origin: "https://essayflow-scoring-service.vercel.app",
        "x-forwarded-for": clientIp(request),
      },
      body: JSON.stringify(request.body),
    });

    response.status(upstream.status);
    response.setHeader("content-type", upstream.headers.get("content-type") || "application/json; charset=utf-8");
    response.setHeader("cache-control", "no-store");
    if (!upstream.body) return response.end();
    Readable.fromWeb(upstream.body).pipe(response);
  } catch (error) {
    console.error("[essayflow-scoring-proxy]", error);
    response.status(502).json({ error: "评测服务暂时不可用，请稍后重试", code: "SERVICE_UNAVAILABLE" });
  }
};
