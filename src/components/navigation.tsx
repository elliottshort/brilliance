"use client"

import Link from "next/link"
import { Moon, Sun, LogOut, LogIn, User } from "lucide-react"
import { useTheme } from "next-themes"
import { useSession, signOut } from "next-auth/react"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { useGlassRefraction } from "@/components/ui/glass-refraction"

export function Navigation() {
  const { resolvedTheme, setTheme } = useTheme()
  const { data: session, status } = useSession()
  const [mounted, setMounted] = useState(false)
  const { filterSvg, backdropPrefix } = useGlassRefraction()

  useEffect(() => {
    setMounted(true)
  }, [])

  const backdropValue = `${backdropPrefix}blur(var(--glass-blur)) saturate(var(--glass-saturation)) brightness(var(--glass-brightness))`

  return (
    <header
      className="sticky top-0 z-50 isolate relative overflow-hidden border-b border-[var(--glass-border)] before:absolute before:inset-x-0 before:bottom-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent after:pointer-events-none after:absolute after:inset-0 after:bg-[linear-gradient(105deg,transparent_40%,oklch(1_0_0/0.03)_45%,oklch(1_0_0/0.06)_50%,oklch(1_0_0/0.03)_55%,transparent_60%)] after:bg-[length:200%_100%] motion-safe:after:animate-glass-shimmer"
      style={{
        background: 'var(--glass-bg)',
        backdropFilter: backdropValue,
        WebkitBackdropFilter: backdropValue,
        boxShadow: 'var(--glass-shadow-outer), var(--glass-shadow-inner)',
      }}
    >
      {filterSvg}
      <nav className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="rounded-md text-lg font-semibold tracking-tight text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background">
          Brilliance
        </Link>

        <div className="flex items-center gap-1">
          {mounted && status !== "loading" && (
            <>
              {session?.user ? (
                <>
                  <div className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm text-muted-foreground">
                    <User className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">{session.user.username ?? session.user.name ?? "User"}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => signOut({ callbackUrl: "/login" })}
                    className="gap-1.5 text-muted-foreground hover:text-foreground"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Sign out</span>
                  </Button>
                </>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  asChild
                  className="gap-1.5 text-muted-foreground hover:text-foreground"
                >
                  <Link href="/login">
                    <LogIn className="h-3.5 w-3.5" />
                    <span>Sign in</span>
                  </Link>
                </Button>
              )}
            </>
          )}

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
            aria-label="Toggle theme"
          >
            {mounted ? (
              resolvedTheme === "dark" ? (
                <Sun className="h-[1.2rem] w-[1.2rem]" />
              ) : (
                <Moon className="h-[1.2rem] w-[1.2rem]" />
              )
            ) : (
              <div className="h-[1.2rem] w-[1.2rem]" />
            )}
          </Button>
        </div>
      </nav>
    </header>
  )
}
