'use client'

import { motion } from 'framer-motion'
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Lightbulb, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { ExplanationScreen as ExplanationScreenData } from '@/lib/schemas/content'

interface ExplanationScreenProps {
  screen: ExplanationScreenData
  onComplete: () => void
}

const contentReveal = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.15,
    },
  },
}

const itemReveal = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.25, 0.4, 0.25, 1] as const },
  },
}

export function ExplanationScreen({ screen, onComplete }: ExplanationScreenProps) {
  return (
    <motion.div
      variants={contentReveal}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      <motion.h2
        variants={itemReveal}
        className="text-2xl font-bold tracking-tight text-foreground"
      >
        {screen.title}
      </motion.h2>

      <motion.div variants={itemReveal} className="explanation-prose">
        <Markdown
          remarkPlugins={[remarkGfm]}
          components={{
            h1: ({ children }) => (
              <h3 className="mb-3 mt-6 text-xl font-bold tracking-tight text-foreground first:mt-0">
                {children}
              </h3>
            ),
            h2: ({ children }) => (
              <h4 className="mb-2 mt-5 text-lg font-semibold tracking-tight text-foreground first:mt-0">
                {children}
              </h4>
            ),
            h3: ({ children }) => (
              <h5 className="mb-2 mt-4 text-base font-semibold text-foreground first:mt-0">
                {children}
              </h5>
            ),
            p: ({ children }) => (
              <p className="mb-4 text-[0.938rem] leading-relaxed text-foreground/85 last:mb-0">
                {children}
              </p>
            ),
            strong: ({ children }) => (
              <strong className="font-semibold text-foreground">{children}</strong>
            ),
            em: ({ children }) => (
              <em className="text-foreground/75">{children}</em>
            ),
            ul: ({ children }) => (
              <ul className="mb-4 ml-1 space-y-1.5 last:mb-0">{children}</ul>
            ),
            ol: ({ children }) => (
              <ol className="mb-4 ml-1 list-decimal space-y-1.5 pl-4 last:mb-0">{children}</ol>
            ),
            li: ({ children }) => (
              <li className="flex gap-2 text-[0.938rem] leading-relaxed text-foreground/85">
                <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-foreground/30" />
                <span>{children}</span>
              </li>
            ),
            code: ({ children, className }) => {
              const isBlock = className?.includes('language-')
              if (isBlock) {
                return (
                  <code
                    className={cn(
                      'block overflow-x-auto rounded-lg border border-border/60',
                      'bg-muted/50 px-4 py-3 font-mono text-[0.8125rem] leading-relaxed',
                      'text-foreground/90'
                    )}
                  >
                    {children}
                  </code>
                )
              }
              return (
                <code
                  className={cn(
                    'rounded-md border border-border/50 bg-muted/60',
                    'px-1.5 py-0.5 font-mono text-[0.8125rem] text-foreground/90'
                  )}
                >
                  {children}
                </code>
              )
            },
            pre: ({ children }) => (
              <pre className="mb-4 last:mb-0">{children}</pre>
            ),
            blockquote: ({ children }) => (
              <blockquote
                className={cn(
                  'mb-4 border-l-2 border-foreground/20 pl-4',
                  'text-[0.938rem] italic text-foreground/70 last:mb-0'
                )}
              >
                {children}
              </blockquote>
            ),
            table: ({ children }) => (
              <div className="mb-4 overflow-x-auto rounded-lg border border-border/60 last:mb-0">
                <table className="w-full border-collapse text-[0.875rem]">
                  {children}
                </table>
              </div>
            ),
            thead: ({ children }) => (
              <thead className="border-b border-border/60 bg-muted/40">
                {children}
              </thead>
            ),
            tbody: ({ children }) => <tbody>{children}</tbody>,
            tr: ({ children }) => (
              <tr className="border-b border-border/30 last:border-0">
                {children}
              </tr>
            ),
            th: ({ children }) => (
              <th className="px-4 py-2.5 text-left text-[0.8125rem] font-semibold text-foreground">
                {children}
              </th>
            ),
            td: ({ children }) => (
              <td className="px-4 py-2.5 text-foreground/85">
                {children}
              </td>
            ),
          }}
        >
          {screen.content}
        </Markdown>
      </motion.div>

      {screen.callout && (
        <motion.div
          variants={itemReveal}
          className={cn(
            'flex items-start gap-3 rounded-xl border p-4',
            'border-amber-200/80 bg-amber-50/60',
            'dark:border-amber-700/40 dark:bg-amber-950/20'
          )}
        >
          <Lightbulb className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
          <p className="text-[0.875rem] leading-relaxed text-amber-900/80 dark:text-amber-100/80">
            {screen.callout}
          </p>
        </motion.div>
      )}

      <motion.div variants={itemReveal} className="flex justify-end pt-2">
        <Button onClick={onComplete} size="lg" className="gap-2">
          Got it!
          <ArrowRight className="h-4 w-4" />
        </Button>
      </motion.div>
    </motion.div>
  )
}
