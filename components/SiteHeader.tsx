"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const SECTIONS = [
  { id: "questions", label: "学生的困惑" },
  { id: "method", label: "评分方法" },
  { id: "flow", label: "评测流程" },
  { id: "preview", label: "报告预览" },
];

function Logo() {
  return (
    <span className="logo-mark" aria-hidden>
      <svg viewBox="0 0 32 32">
        <path d="M7 25C7 14 13 7 25 6c0 12-7 19-18 19Z" />
        <path d="M9 23c4-6 8-10 14-14" />
      </svg>
    </span>
  );
}

export function SiteHeader({ variant, step = 0 }: { variant: "landing" | "app"; step?: number }) {
  const [current, setCurrent] = useState("");
  useEffect(() => {
    if (variant !== "landing") return;
    const targets = SECTIONS.map(s => document.getElementById(s.id)).filter((el): el is HTMLElement => Boolean(el));
    const observer = new IntersectionObserver(
      entries => {
        const visible = entries.filter(e => e.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) setCurrent(visible.target.id);
      },
      { rootMargin: "-45% 0px -45% 0px" },
    );
    targets.forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, [variant]);

  return (
    <header className="topbar">
      <div className="page-width header-inner">
        <Link className="brand" href="/">
          <Logo />
          <span>
            Essay<b>Flow</b>
          </span>
        </Link>
        {variant === "landing" ? (
          <>
            <nav className="lp-nav" aria-label="页面小节">
              {SECTIONS.map(section => (
                <a key={section.id} href={`#${section.id}`} className={current === section.id ? "current" : ""}>
                  {section.label}
                </a>
              ))}
            </nav>
            <Link className="btn btn-primary btn-compact" href="/evaluate">
              开始评测
            </Link>
          </>
        ) : (
          <>
            {step > 0 && (
              <nav className="steps" aria-label="评测步骤">
                {["提交内容", "确认边界", "查看报告"].map((label, index) => (
                  <div className={step === index + 1 ? "active" : step > index + 1 ? "done" : ""} key={label}>
                    <span>{step > index + 1 ? "✓" : index + 1}</span>
                    {label}
                  </div>
                ))}
              </nav>
            )}
            <div className="privacy">
              <span>●</span> 本地自动保存
            </div>
          </>
        )}
      </div>
    </header>
  );
}
