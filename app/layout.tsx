import "./globals.css";

export const metadata = {
  title: "EssayFlow｜高中英语读后续写评测",
  description: "先读懂原文的矛盾、伏笔与主题走向，再判断续写是否真正完成故事，并给出有文本证据的反馈。",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
