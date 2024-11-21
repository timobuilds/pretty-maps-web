import './globals.css'

export const metadata = {
  title: 'Pretty Maps Generator',
  description: 'Generate beautiful, customized maps for any location',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
