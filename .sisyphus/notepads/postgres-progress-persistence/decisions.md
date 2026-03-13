# Decisions

## 2026-03-13 Planning Phase
- Auth: NextAuth v5 (next-auth@beta) with CredentialsProvider + JWT
- DB: Vercel Postgres with Prisma ORM
- localStorage: Fully replaced, no optimistic cache
- proxy.ts not middleware.ts (Next.js 16 convention)
- bcryptjs not bcrypt (serverless safe)
- Password policy: min 8 chars
- Public routes: /, /login, /register
- Protected: /courses/*, /api/progress/*, /api/adapt/*
