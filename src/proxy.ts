import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"

const publicPaths = new Set(["/", "/login", "/register"])

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl

  const isPublic =
    publicPaths.has(pathname) ||
    pathname.startsWith("/api/")

  if (isPublic) {
    return NextResponse.next()
  }

  const session = await auth()

  if (!session) {
    return NextResponse.redirect(new URL("/login", req.nextUrl.origin))
  }

  if (session && (pathname === "/login" || pathname === "/register")) {
    return NextResponse.redirect(new URL("/", req.nextUrl.origin))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.png$).*)",
  ],
}
