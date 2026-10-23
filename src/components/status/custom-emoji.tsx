'use client'

import { createContext, useContext, useMemo, type ReactNode } from 'react'
import { resolveCustomEmoji } from '@/shared/emoji'

export { resolveCustomEmoji }

/**
 * Custom workspace emoji: name (no colons) -> image URL. After alias resolution a value can also be a
 * standard glyph, when a workspace alias points at a standard emoji. Use `isEmojiUrl` to tell them apart.
 */
export type CustomEmojiMap = Record<string, string>

const EMPTY: CustomEmojiMap = Object.freeze({}) as CustomEmojiMap
const CustomEmojiContext = createContext<CustomEmojiMap>(EMPTY)

export const isEmojiUrl = (value: string) => /^(https?:|data:|blob:|\/)/.test(value)

/** Makes workspace emoji available to <Emoji> and the picker. Accepts raw `emoji.list` output; aliases are resolved here. */
export function CustomEmojiProvider({ emoji, children }: { emoji: Record<string, string> | null | undefined; children: ReactNode }) {
  const value = useMemo(() => (emoji && Object.keys(emoji).length ? resolveCustomEmoji(emoji) : EMPTY), [emoji])
  return <CustomEmojiContext.Provider value={value}>{children}</CustomEmojiContext.Provider>
}

/** The workspace's custom emoji (resolved), or `{}` outside a provider. */
export function useCustomEmoji(): CustomEmojiMap {
  return useContext(CustomEmojiContext)
}
