'use client'

import { AnimatePresence, motion } from 'motion/react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

const variants = {
  fade: { hidden: { opacity: 0, y: 4 }, gone: { opacity: 0, y: -4 } },
  pop: { hidden: { opacity: 0, scale: 0.5, rotate: -10 }, gone: { opacity: 0, scale: 0.6, rotate: 0 } },
}

/**
 * Swaps content when `id` changes. Old and new share one grid cell, so the box never collapses
 * mid-swap, and the new content waits for the old to fade out, so they never overlap.
 */
export function Swap({
  id,
  children,
  variant = 'fade',
  inline = false,
  className,
}: {
  id: string
  children: ReactNode
  variant?: keyof typeof variants
  inline?: boolean
  className?: string
}) {
  const v = variants[variant]
  return (
    <span className={cn(inline ? 'inline-grid' : 'grid', className)}>
      <AnimatePresence initial={false}>
        <motion.span
          key={id}
          className="min-w-0 [grid-area:1/1]"
          initial={v.hidden}
          animate={{ opacity: 1, y: 0, scale: 1, rotate: 0, transition: { duration: 0.2, delay: 0.1, ease: [0.22, 1, 0.36, 1] } }}
          exit={{ ...v.gone, transition: { duration: 0.1, ease: 'easeIn' } }}
        >
          {children}
        </motion.span>
      </AnimatePresence>
    </span>
  )
}
