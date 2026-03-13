import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/db"
import { LoginSchema } from "@/lib/schemas/auth"

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        const parsed = LoginSchema.safeParse(credentials)
        if (!parsed.success) return null

        const { username, password } = parsed.data

        const user = await prisma.user.findUnique({
          where: { username },
        })

        if (!user) return null

        const valid = await bcrypt.compare(password, user.passwordHash)
        if (!valid) return null

        return {
          id: user.id,
          username: user.username,
        }
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.userId = user.id as string
        token.username = (user as { username: string }).username
      }
      return token
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.userId as string
        session.user.username = token.username as string
      }
      return session
    },
  },
})
