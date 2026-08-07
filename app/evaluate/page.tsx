import { Suspense } from "react";
import { EvaluateWorkbench } from "@/components/EvaluateWorkbench";

export const metadata = { title: "评测工作台｜EssayFlow" };

export default function EvaluatePage() {
  return (
    <Suspense fallback={<main className="app-shell" />}>
      <EvaluateWorkbench />
    </Suspense>
  );
}
