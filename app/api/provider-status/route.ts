import { NextResponse } from "next/server";
import { providerStatus } from "@/lib/providers";

/** 只暴露"是否已配置"和模型名，绝不返回 API Key。 */
export async function GET() {
  return NextResponse.json(providerStatus());
}
