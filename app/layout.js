export default function RootLayout({ children }) {
  return (
    <html lang="zh-CN">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>内心宇宙 - AI心理分析平台</title>
      </head>
      <body>{children}</body>
    </html>
  )
}
