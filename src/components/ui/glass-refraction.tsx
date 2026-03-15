'use client'

import * as React from 'react'
import { useReducedMotion } from 'framer-motion'

import { cn } from '@/lib/utils'

function detectChromiumRefractionSupport(): boolean {
  if (typeof window === 'undefined') return false
  if (typeof CSS === 'undefined' || typeof CSS.supports !== 'function') return false
  return CSS.supports('backdrop-filter', 'url(#test) blur(1px)')
}

export function useGlassSupport() {
  const [supportsRefraction, setSupportsRefraction] = React.useState(false)

  React.useEffect(() => {
    setSupportsRefraction(detectChromiumRefractionSupport())
  }, [])

  return { supportsRefraction }
}

export function useGlassRefraction(options?: {
  intensity?: number
  turbulence?: number
}) {
  const { intensity = 15, turbulence = 0.015 } = options ?? {}
  const rawId = React.useId()
  const filterId = `glass-refraction-${rawId.replace(/[^a-zA-Z0-9-_]/g, '_')}`
  const { supportsRefraction } = useGlassSupport()
  const prefersReduced = useReducedMotion() ?? false

  const active = supportsRefraction && !prefersReduced

  const filterSvg = active ? (
    <svg
      width={0}
      height={0}
      style={{ position: 'absolute' }}
      aria-hidden="true"
    >
      <defs>
        <filter id={filterId}>
          <feTurbulence
            type="fractalNoise"
            baseFrequency={turbulence}
            numOctaves={1}
            result="noise"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="noise"
            scale={intensity}
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>
      </defs>
    </svg>
  ) : null

  const backdropPrefix = active ? `url(#${filterId}) ` : ''

  return { filterSvg, backdropPrefix }
}

interface GlassRefractionProps extends React.HTMLAttributes<HTMLDivElement> {
  intensity?: number
  turbulence?: number
  children?: React.ReactNode
}

const GlassRefraction = React.forwardRef<HTMLDivElement, GlassRefractionProps>(
  ({ intensity = 15, turbulence = 0.015, className, children, style, ...props }, ref) => {
    const rawId = React.useId()
    const filterId = `glass-refraction-${rawId.replace(/[^a-zA-Z0-9-_]/g, '_')}`

    const { supportsRefraction } = useGlassSupport()
    const prefersReduced = useReducedMotion() ?? false

    const effectiveScale = prefersReduced ? 0 : intensity

    const backdropValue = supportsRefraction
      ? `url(#${filterId}) blur(var(--glass-blur)) saturate(var(--glass-saturation)) brightness(var(--glass-brightness))`
      : 'blur(var(--glass-blur)) saturate(var(--glass-saturation)) brightness(var(--glass-brightness))'

    const mergedStyle: React.CSSProperties = {
      backdropFilter: backdropValue,
      WebkitBackdropFilter: backdropValue,
      contain: 'layout style',
      isolation: 'isolate',
      ...style,
    }

    return (
      <>
        {supportsRefraction && (
          <svg
            width={0}
            height={0}
            style={{ position: 'absolute' }}
            aria-hidden="true"
          >
            <defs>
              <filter id={filterId}>
                <feTurbulence
                  type="fractalNoise"
                  baseFrequency={turbulence}
                  numOctaves={1}
                  result="noise"
                />
                <feDisplacementMap
                  in="SourceGraphic"
                  in2="noise"
                  scale={effectiveScale}
                  xChannelSelector="R"
                  yChannelSelector="G"
                />
              </filter>
            </defs>
          </svg>
        )}
        <div
          ref={ref}
          className={cn('relative', className)}
          style={mergedStyle}
          {...props}
        >
          {children}
        </div>
      </>
    )
  }
)
GlassRefraction.displayName = 'GlassRefraction'

export { GlassRefraction }
