import OpenAI from "openai";
import type { ProviderStatus } from "@/lib/schemas";

export interface LLMProvider {
  /** 返回模型的原始 JSON 文本；由调用方负责 Schema 校验。 */
  complete(system: string, input: unknown, repairHint?: string): Promise<string>;
  readonly modelName: string;
}

/** 未配置模型时抛出；调用方必须把它变成明确的错误状态，不得回退示例数据。 */
export class ProviderNotConfiguredError extends Error {
  readonly code = "PROVIDER_NOT_CONFIGURED";
  constructor() {
    super("当前未配置 AI 模型，暂时无法分析你的作文");
    this.name = "ProviderNotConfiguredError";
  }
}

/** 模型返回内容无法通过 Schema 校验，且修复重试已用尽。 */
export class ModelOutputInvalidError extends Error {
  readonly code = "MODEL_OUTPUT_INVALID";
  constructor(readonly detail: string) {
    super("模型返回的内容不符合报告结构要求，本次评测未完成");
    this.name = "ModelOutputInvalidError";
  }
}

/** 模型调用本身失败（网络、鉴权、限流等）。 */
export class ModelCallFailedError extends Error {
  readonly code = "MODEL_CALL_FAILED";
  constructor(readonly detail: string) {
    super("调用 AI 模型失败，本次评测未完成");
    this.name = "ModelCallFailedError";
  }
}

/** 仅从服务端环境变量读取，不暴露 Key 本身。 */
export function providerStatus(): ProviderStatus {
  const key = process.env.OPENAI_API_KEY?.trim();
  return {
    configured: Boolean(key),
    model: key ? process.env.OPENAI_MODEL?.trim() || DEFAULT_MODEL : null,
    baseUrlConfigured: Boolean(process.env.OPENAI_BASE_URL?.trim()),
  };
}

export function isProviderConfigured() {
  return providerStatus().configured;
}

const DEFAULT_MODEL = "gpt-4.1-mini";

export class OpenAICompatibleProvider implements LLMProvider {
  private client: OpenAI;
  readonly modelName: string;
  constructor() {
    const apiKey = process.env.OPENAI_API_KEY?.trim();
    if (!apiKey) throw new ProviderNotConfiguredError();
    const baseURL = process.env.OPENAI_BASE_URL?.trim();
    this.client = new OpenAI({ apiKey, ...(baseURL ? { baseURL } : {}) });
    this.modelName = process.env.OPENAI_MODEL?.trim() || DEFAULT_MODEL;
  }
  async complete(system: string, input: unknown, repairHint?: string) {
    const messages: { role: "system" | "user"; content: string }[] = [
      { role: "system", content: system },
      { role: "user", content: JSON.stringify(input) },
    ];
    if (repairHint) messages.push({ role: "user", content: repairHint });
    try {
      const response = await this.client.chat.completions.create({
        model: this.modelName,
        response_format: { type: "json_object" },
        messages,
      });
      return response.choices[0]?.message?.content ?? "";
    } catch (error) {
      throw new ModelCallFailedError(error instanceof Error ? error.message : "unknown provider error");
    }
  }
}

/** 供服务端与测试注入替代实现；默认构造真实 OpenAI-compatible Provider。 */
export type ProviderFactory = () => LLMProvider;
export const defaultProviderFactory: ProviderFactory = () => new OpenAICompatibleProvider();
