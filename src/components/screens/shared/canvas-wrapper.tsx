'use client'

import { useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import { useReducedMotion } from 'framer-motion'

const Stage = dynamic(() => import('react-konva').then((m) => m.Stage), { ssr: false })
const Layer = dynamic(() => import('react-konva').then((m) => m.Layer), { ssr: false })

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center w-full h-full text-muted-foreground text-sm">
      Loading...
    </div>
  )
}

interface CanvasWrapperProps {
  children: React.ReactNode
  width?: number
  height?: number
  ariaLabel?: string
}

export function CanvasWrapper({
  children,
  width: initialWidth = 600,
  height = 400,
  ariaLabel = 'Interactive canvas',
}: CanvasWrapperProps) {
  const prefersReducedMotion = useReducedMotion()
  const containerRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(initialWidth)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (entry) {
        setWidth(entry.contentRect.width)
      }
    })

    observer.observe(container)
    return () => observer.disconnect()
  }, [])

  if (!mounted) {
    return <LoadingFallback />
  }

  return (
    <div ref={containerRef} className="relative w-full" style={{ height }}>
      <Stage width={width} height={height}>
        <Layer>{children}</Layer>
      </Stage>
      <div
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
        data-reduced-motion={prefersReducedMotion ?? false}
      />
    </div>
  )
}
