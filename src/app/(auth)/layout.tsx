"use client"

import Link from "next/link"
import { SessionProvider } from "next-auth/react"
import { Sparkles } from "lucide-react"

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SessionProvider>
      <div className="flex min-h-[calc(100vh-3.5rem)] flex-col items-center justify-center px-4 py-12">
        <Link
          href="/"
          className="mb-8 flex items-center gap-2 text-lg font-semibold tracking-tight text-foreground transition-colors hover:text-primary"
        >
          <Sparkles className="h-5 w-5 text-primary" />
          Brilliance
        </Link>
        <div className="w-full max-w-sm">{children}</div>
      </div>
    </SessionProvider>
  )
}
