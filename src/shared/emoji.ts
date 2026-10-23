import { EMOJI_DATA, EMOJI_LEGACY, type EmojiRow } from './emoji-data'

/** One standard emoji. `search` is lowercase text (name, aliases, keywords) for substring matching. */
export interface EmojiItem {
  name: string
  glyph: string
  aliases: string[]
  search: string
}

/** A Slack picker category, in display order. `icon` is a representative glyph. */
export interface EmojiCategory {
  id: string
  name: string
  icon: string
  items: EmojiItem[]
}

const split = (s: string | undefined) => (s ? s.split(' ') : [])

/** Every standard Slack emoji (iamcal emoji-data), grouped like Slack's picker. */
export const EMOJI_CATEGORIES: EmojiCategory[] = EMOJI_DATA.map(([id, name, icon, groups]) => ({
  id,
  name,
  icon,
  items: groups.flatMap(([sub, rows]) =>
    rows.map(([name, glyph, aliases = '', keywords = '']) => ({
      name,
      glyph,
      aliases: split(aliases),
      search: [name, aliases, keywords, sub].filter(Boolean).join(' '),
    })),
  ),
}))

const VS16 = /️/g
const MODIFIERS = /[\u{1F3FB}-\u{1F3FF}]/gu
const strip = (s: string) => s.replace(VS16, '')

const byName = new Map<string, string>()
const byGlyph = new Map<string, string>()
function index(rows: EmojiRow[]) {
  for (const [name, glyph, aliases] of rows) {
    for (const n of [name, ...split(aliases)]) if (!byName.has(n)) byName.set(n, glyph)
    const key = strip(glyph)
    if (!byGlyph.has(key)) byGlyph.set(key, name)
  }
}
for (const [, , , groups] of EMOJI_DATA) for (const [, rows] of groups) index(rows)
index(EMOJI_LEGACY)

/** Shortcode name without colons or a skin-tone suffix: ":+1::skin-tone-3:" -> "+1". */
export const emojiName = (code: string) => code.replace(/^:|:$/g, '').split('::')[0]

/** ":sandwich:" -> "🥪". Aliases resolve (":thumbsup:"), skin tones give the base glyph. Unknown (e.g. custom workspace emoji) -> null. */
export function emojiGlyph(code: string): string | null {
  return byName.get(emojiName(code)) ?? null
}

export const isEmojiCode = (s: string) => /^:[a-z0-9_+'-]{1,100}:$/.test(s)

/**
 * Candidate emoji sequences: flags, keycaps, and pictographs with their variation selectors,
 * skin tones, tag sequences (subdivision flags) and ZWJ joins.
 */
const SEQUENCE =
  /\p{Regional_Indicator}{2}|[#*0-9]️?⃣|\p{Extended_Pictographic}(?:️|\p{Emoji_Modifier}|[\u{E0020}-\u{E007F}])*(?:‍\p{Extended_Pictographic}(?:️|\p{Emoji_Modifier})*)*/gu

/** Text-presentation symbols (©, ™, ↔ ...) only count when written as emoji (with U+FE0F) or in a sequence. */
const EMOJI_STYLE = /\p{Emoji_Presentation}|️|⃣/u

function lookup(seq: string): string | undefined {
  const plain = strip(seq)
  return byGlyph.get(plain) ?? byGlyph.get(plain.replace(MODIFIERS, '')) ?? byGlyph.get(plain.split('‍')[0].replace(MODIFIERS, ''))
}

/** First emoji in a string that maps to a Slack shortcode, plus the string without it. */
export function extractEmoji(text: string): { code: string; rest: string } | null {
  for (const match of text.matchAll(SEQUENCE)) {
    if (!EMOJI_STYLE.test(match[0])) continue
    const name = lookup(match[0])
    if (name) {
      const rest = (text.slice(0, match.index) + text.slice(match.index + match[0].length)).replace(/\s+/g, ' ').trim()
      return { code: `:${name}:`, rest }
    }
  }
  return null
}

/**
 * Resolves Slack `emoji.list` output, where aliases look like "alias:other_name", into a flat map.
 * An alias takes its target's URL (following alias chains), or the standard glyph when the target is a
 * standard emoji (e.g. "alias:thumbsup" -> "👍"). Aliases that resolve to nothing are dropped. Idempotent.
 */
export function resolveCustomEmoji(list: Record<string, string> | null | undefined): Record<string, string> {
  const out: Record<string, string> = {}
  if (!list) return out
  for (const [name, value] of Object.entries(list)) {
    let target = value
    for (let hops = 0; target.startsWith('alias:') && hops < 10; hops++) {
      const ref = target.slice('alias:'.length)
      target = Object.hasOwn(list, ref) ? list[ref] : (emojiGlyph(ref) ?? '')
    }
    if (target && !target.startsWith('alias:')) out[name] = target
  }
  return out
}
