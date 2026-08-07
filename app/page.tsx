import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { ReportPreview } from "@/components/landing/ReportPreview";
import { CTA, FLOW_STEPS, HERO, LOOP_STEPS, METHOD_CONTENT, METHOD_NOTES, QUESTIONS } from "@/components/landing/content";

export default function LandingPage() {
  return (
    <main className="app-shell">
      <SiteHeader variant="landing" />

      <section className="lp-hero">
        <div className="page-width lp-hero-inner">
          <div className="lp-hero-copy">
            <span className="pill">{HERO.eyebrow}</span>
            <h1>{HERO.title}</h1>
            <p>{HERO.body}</p>
            <div className="button-row">
              <Link className="btn btn-primary" href="/evaluate">
                开始评测
              </Link>
              <Link className="btn btn-ghost" href="/evaluate?demo=1">
                查看示例报告
              </Link>
            </div>
            <small>无需注册 · 草稿只存在你的浏览器里 · 请勿粘贴姓名、学校等个人信息</small>
          </div>
          <aside className="lp-hero-aside" aria-label="评分逻辑示意">
            <p className="lp-aside-title">分数是怎么来的</p>
            <div className="lp-aside-band">
              <span>内容四项共同定档</span>
              <ol>
                {METHOD_CONTENT.map(item => (
                  <li key={item.label}>{item.label}</li>
                ))}
              </ol>
            </div>
            <div className="lp-aside-arrow" aria-hidden>
              ↓
            </div>
            <div className="lp-aside-language">
              <span>语言整体表现</span>
              <p>决定这一档里的高位、中位或低位</p>
            </div>
          </aside>
        </div>
      </section>

      <section className="lp-section" id="questions">
        <div className="page-width">
          <header className="lp-section-head">
            <p className="eyebrow">学生真实困惑</p>
            <h2>改对了语法，分数还是没动</h2>
            <p>这四个问题几乎出现在每一次讲评里。它们的答案都不在语法层面。</p>
          </header>
          <div className="lp-qa">
            {QUESTIONS.map(item => (
              <article key={item.ask}>
                <h3>{item.ask}</h3>
                <p>{item.answer}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="lp-section lp-section-alt" id="method">
        <div className="page-width">
          <header className="lp-section-head">
            <p className="eyebrow">评分方法</p>
            <h2>内容定档，语言定分</h2>
            <p>档位来自四项内容标准的整体判断；分数在档位内由语言整体表现决定。</p>
          </header>
          <div className="lp-method">
            <div className="lp-method-list">
              {METHOD_CONTENT.map(item => (
                <article key={item.label}>
                  <h3>{item.label}</h3>
                  <p>{item.detail}</p>
                </article>
              ))}
            </div>
            <aside className="lp-method-notes">
              <p className="lp-aside-title">三条硬约束</p>
              <ul>
                {METHOD_NOTES.map(note => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
            </aside>
          </div>
        </div>
      </section>

      <section className="lp-section" id="flow">
        <div className="page-width">
          <header className="lp-section-head">
            <p className="eyebrow">AI 评测流程</p>
            <h2>六个步骤，按顺序进行</h2>
            <p>顺序本身是评分逻辑的一部分：先读懂原文，才有资格判断续写。</p>
          </header>
          <ol className="lp-flow">
            {FLOW_STEPS.map((step, index) => (
              <li key={step.title}>
                <span className="lp-flow-index">{String(index + 1).padStart(2, "0")}</span>
                <div>
                  <h3>{step.title}</h3>
                  <p>{step.detail}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="lp-section lp-section-alt" id="preview">
        <div className="page-width">
          <header className="lp-section-head">
            <p className="eyebrow">报告预览</p>
            <h2>报告里会看到什么</h2>
            <p>切换标签查看各部分内容。以下为自编示例文本，不是真实学生作文。</p>
          </header>
          <ReportPreview />
        </div>
      </section>

      <section className="lp-section" id="loop">
        <div className="page-width">
          <header className="lp-section-head">
            <p className="eyebrow">学习闭环</p>
            <h2>一次评测不是终点</h2>
            <p>同一篇作文可以反复提交，用同一套标准比较前后差别。</p>
          </header>
          <ol className="lp-loop">
            {LOOP_STEPS.map(step => (
              <li key={step.title}>
                <h3>{step.title}</h3>
                <p>{step.detail}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="lp-cta">
        <div className="page-width lp-cta-inner">
          <div>
            <h2>{CTA.title}</h2>
            <p>{CTA.body}</p>
          </div>
          <Link className="btn btn-primary" href="/evaluate">
            {CTA.action}
          </Link>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
