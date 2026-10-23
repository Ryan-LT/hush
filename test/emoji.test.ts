import { describe, expect, it } from 'vitest'
import { EMOJI_CATEGORIES, emojiGlyph, extractEmoji, isEmojiCode, resolveCustomEmoji } from '../src/shared/emoji'

describe('emoji data', () => {
  const items = EMOJI_CATEGORIES.flatMap((c) => c.items)

  it('has the full standard set in Slack category order', () => {
    expect(items.length).toBeGreaterThan(1500)
    expect(EMOJI_CATEGORIES.map((c) => c.name)).toEqual([
      'Smileys & People',
      'Nature',
      'Food & Drink',
      'Activities',
      'Travel & Places',
      'Objects',
      'Symbols',
      'Flags',
    ])
    expect(items.some((i) => i.name.startsWith('skin-tone'))).toBe(false)
  })

  it('has unique shortcodes that all pass isEmojiCode', () => {
    const names = items.flatMap((i) => [i.name, ...i.aliases])
    expect(new Set(names).size).toBe(names.length)
    expect(names.filter((n) => !isEmojiCode(`:${n}:`))).toEqual([])
  })

  it('builds lowercase search text from aliases and name words', () => {
    const thumbs = items.find((i) => i.name === '+1')
    expect(thumbs?.search).toContain('thumbsup')
    expect(items.find((i) => i.name === 'coffee')?.search).toContain('beverage')
  })
})

describe('emojiGlyph', () => {
  it('resolves names and aliases', () => {
    expect(emojiGlyph(':sandwich:')).toBe('🥪')
    expect(emojiGlyph(':+1:')).toBe('👍')
    expect(emojiGlyph(':thumbsup:')).toBe('👍')
    expect(emojiGlyph(':satisfied:')).toBe(emojiGlyph(':laughing:'))
    expect(emojiGlyph('coffee')).toBe('☕')
  })

  it('ignores a skin-tone suffix and returns the base glyph', () => {
    expect(emojiGlyph(':wave::skin-tone-3:')).toBe('👋')
    expect(emojiGlyph(':+1::skin-tone-6:')).toBe('👍')
  })

  it('still resolves legacy shortcodes and returns null for custom emoji', () => {
    expect(emojiGlyph(':runner:')).toBe('🏃')
    expect(emojiGlyph(':party_parrot:')).toBeNull()
    expect(emojiGlyph('')).toBeNull()
  })
})

describe('extractEmoji', () => {
  it('finds a flag', () => {
    expect(extractEmoji('🇯🇵 Tokyo offsite')).toEqual({ code: ':jp:', rest: 'Tokyo offsite' })
    expect(extractEmoji('Trip 🏴󠁧󠁢󠁳󠁣󠁴󠁿 Edinburgh')).toEqual({ code: ':flag-scotland:', rest: 'Trip Edinburgh' })
  })

  it('finds a ZWJ sequence as one emoji', () => {
    expect(extractEmoji('Pairing 👩‍💻 session')).toEqual({ code: ':female-technologist:', rest: 'Pairing session' })
    expect(extractEmoji('🏳️‍🌈 Pride planning')).toEqual({ code: ':rainbow-flag:', rest: 'Pride planning' })
  })

  it('handles variation selectors and skin tones', () => {
    expect(extractEmoji('Planning ☕️ sync')).toEqual({ code: ':coffee:', rest: 'Planning sync' })
    expect(extractEmoji('Planning ☕ sync')).toEqual({ code: ':coffee:', rest: 'Planning sync' })
    expect(extractEmoji('Intro 👋🏽 call')).toEqual({ code: ':wave:', rest: 'Intro call' })
    expect(extractEmoji('1️⃣ First')).toEqual({ code: ':one:', rest: 'First' })
  })

  it('returns null for a plain sentence', () => {
    expect(extractEmoji('Weekly sync with the design team')).toBeNull()
    expect(extractEmoji('Acme™ © 2026 review 1-2')).toBeNull()
  })
})

describe('resolveCustomEmoji', () => {
  it('resolves aliases to the target URL or to a standard glyph', () => {
    expect(
      resolveCustomEmoji({
        parrot: 'https://emoji.slack-edge.com/T1/parrot/abc.gif',
        party_parrot: 'alias:parrot',
        bird: 'alias:party_parrot',
        yes: 'alias:thumbsup',
        broken: 'alias:does_not_exist',
        loop: 'alias:loop',
      }),
    ).toEqual({
      parrot: 'https://emoji.slack-edge.com/T1/parrot/abc.gif',
      party_parrot: 'https://emoji.slack-edge.com/T1/parrot/abc.gif',
      bird: 'https://emoji.slack-edge.com/T1/parrot/abc.gif',
      yes: '👍',
    })
  })
})
