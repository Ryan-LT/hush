'use client'

import { SmilePlus } from 'lucide-react'
import { emojiGlyph, emojiName } from '@/shared/emoji'
import { cn } from '@/lib/utils'
import { isEmojiUrl, useCustomEmoji } from './custom-emoji'

/** Renders a Slack shortcode: standard glyph, custom workspace image, or a code chip when unknown. */
export function Emoji({ code, className, placeholder = true }: { code: string; className?: string; placeholder?: boolean }) {
  const custom = useCustomEmoji()
  if (!code) {
    return placeholder ? <SmilePlus className={cn('size-[1em] text-muted-foreground/60', className)} aria-label="No emoji" /> : null
  }
  const name = emojiName(code)
  const glyph = emojiGlyph(code) ?? (Object.hasOwn(custom, name) ? custom[name] : null)
  if (glyph && isEmojiUrl(glyph)) {
    return (
      <img
        src={glyph}
        alt={`:${name}:`}
        title={`:${name}:`}
        loading="lazy"
        draggable={false}
        className={cn('inline-block size-[1em] rounded-[0.15em] object-contain align-[-0.125em]', className, 'leading-none')}
      />
    )
  }
  if (glyph) {
    return (
      <span className={cn('inline-block', className, 'leading-none')} role="img" aria-label={code}>
        {glyph}
      </span>
    )
  }
  return (
    <span className={cn('inline-flex max-w-24 items-center truncate rounded bg-muted px-1 font-mono text-[0.55em] text-muted-foreground', className)} title={code}>
      {code}
    </span>
  )
}
