import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "汉字对对碰",
  description: "面向小学低年级的汉字词语消除游戏",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Ma+Shan+Zheng&family=ZCOOL+KuaiLe&display=swap" rel="stylesheet" />
      </head>
      <body>{children}</body>
    </html>
  );
}
