'use client'

import { Clock3, Search, Sparkles } from 'lucide-react'
import {
  memo,
  startTransition,
  useCallback,
  useDeferredValue,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
} from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { EMOJI_CATEGORIES, emojiGlyph, emojiName, isEmojiCode } from '@/shared/emoji'
import { cn } from '@/lib/utils'
import { isEmojiUrl, useCustomEmoji, type CustomEmojiMap } from './custom-emoji'
import { Emoji } from './emoji'

const RECENT_KEY = 'hush:recent-emoji'
const RECENT_MAX = 24
const COLS = 9
// Grid metrics in px. Section heights are computed from these so off-screen sections reserve exact space.
const ROW = 32
const GAP = 2
const HEADER = 28
const TAIL = 8
/** Cells rendered on the first frame after opening; the rest mount in a transition right after. */
const FIRST_PAINT_CELLS = COLS * 12

interface Cell {
  code: string
  names: string[]
  glyph?: string
  src?: string
  search: string
}

interface Section {
  id: string
  name: string
  icon: ReactNode
  cells: Cell[]
}

const STANDARD: Section[] = EMOJI_CATEGORIES.map((c) => ({
  id: c.id,
  name: c.name,
  icon: c.icon,
  cells: c.items.map((i) => ({ code: `:${i.name}:`, names: [i.name, ...i.aliases], glyph: i.glyph, search: i.search })),
}))
const STANDARD_BY_CODE = new Map(STANDARD.flatMap((s) => s.cells.map((c) => [c.code, c] as const)))

const customCell = (name: string, value: string): Cell =>
  isEmojiUrl(value) ? { code: `:${name}:`, names: [name], src: value, search: name } : { code: `:${name}:`, names: [name], glyph: value, search: name }

function cellFor(code: string, custom: CustomEmojiMap): Cell | null {
  const standard = STANDARD_BY_CODE.get(code)
  if (standard) return standard
  const name = emojiName(code)
  const glyph = emojiGlyph(code)
  if (glyph) return { code, names: [name], glyph, search: name }
  return Object.hasOwn(custom, name) ? customCell(name, custom[name]) : null
}

function readRecent(): string[] {
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]')
    if (!Array.isArray(raw)) return []
    return [...new Set(raw.filter((c): c is string => typeof c === 'string' && isEmojiCode(c)))].slice(0, RECENT_MAX)
  } catch {
    return []
  }
}

function saveRecent(code: string) {
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify([code, ...readRecent().filter((c) => c !== code)].slice(0, RECENT_MAX)))
  } catch {
    // Storage unavailable (private mode, blocked): recents are a convenience only.
  }
}

/** `q` compares against shortcodes ("thumbs up" -> "thumbs_up"); every token must appear in the search text. */
function normalize(query: string) {
  const q = query.trim().toLowerCase().replace(/^:+|:+$/g, '')
  return { q: q.replace(/\s+/g, '_'), tokens: q.split(/[\s:_-]+/).filter(Boolean) }
}

/** Lower is better: exact shortcode, prefix, substring, then keyword-only matches. -1 = no match. */
function rank(cell: Cell, q: string, tokens: string[]) {
  if (!tokens.every((t) => cell.search.includes(t))) return -1
  if (cell.names.includes(q)) return 0
  if (cell.names.some((n) => n.startsWith(q))) return 1
  if (cell.names.some((n) => n.includes(q))) return 2
  return 3
}

function searchCells(query: string, custom: Cell[]): Cell[] {
  const { q, tokens } = normalize(query)
  if (!tokens.length) return []
  const hits: { cell: Cell; score: number }[] = []
  const consider = (cell: Cell) => {
    const score = rank(cell, q, tokens)
    if (score >= 0) hits.push({ cell, score })
  }
  custom.forEach(consider)
  for (const s of STANDARD) s.cells.forEach(consider)
  return hits.sort((a, b) => a.score - b.score).map((h) => h.cell)
}

const sectionHeight = (count: number) => {
  const rows = Math.ceil(count / COLS)
  return HEADER + rows * ROW + Math.max(0, rows - 1) * GAP + TAIL
}

const cellCode = (target: EventTarget) => (target as Element).closest?.<HTMLElement>('[data-code]')?.dataset.code

const EmojiSection = memo(function EmojiSection({
  section,
  limit,
  value,
  register,
}: {
  section: Section
  limit: number
  value: string
  register: (id: string, el: HTMLElement | null) => void
}) {
  const height = sectionHeight(section.cells.length)
  // content-visibility skips layout and paint for off-screen sections; the intrinsic size keeps the scrollbar honest.
  const style: CSSProperties = {
    contentVisibility: 'auto',
    containIntrinsicSize: `auto ${height}px`,
    height: limit < section.cells.length ? height : undefined,
  }
  return (
    <section ref={(el) => register(section.id, el)} aria-label={section.name} style={style}>
      <h3 className="sticky top-0 z-10 flex h-7 items-center bg-popover/95 px-1 text-[11px] font-medium tracking-wide text-muted-foreground uppercase backdrop-blur-sm">
        {section.name}
      </h3>
      <div data-grid className="grid grid-cols-9 justify-items-center gap-y-0.5 pb-2">
        {section.cells.slice(0, limit).map((cell) => (
          <button
            key={cell.code}
            type="button"
            data-code={cell.code}
            aria-label={cell.code}
            className={cn(
              'flex size-8 scroll-mt-8 items-center justify-center rounded-lg text-[22px] leading-none transition-transform duration-100 select-none hover:scale-120 hover:bg-muted focus-visible:bg-muted focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:outline-none',
              value === cell.code && 'bg-accent ring-1 ring-primary/30',
            )}
          >
            {cell.src ? <img src={cell.src} alt="" loading="lazy" draggable={false} className="size-[22px] object-contain" /> : cell.glyph}
          </button>
        ))}
      </div>
    </section>
  )
})

const EmojiSections = memo(function EmojiSections({
  sections,
  value,
  budget,
  register,
}: {
  sections: Section[]
  value: string
  budget: number
  register: (id: string, el: HTMLElement | null) => void
}) {
  let left = budget
  return sections.map((section) => {
    const limit = Math.min(section.cells.length, left)
    left -= limit
    return <EmojiSection key={section.id} section={section} limit={limit} value={value} register={register} />
  })
})

/** Arrow-key movement between cells, row-aware across sections. */
function moveFocus(e: KeyboardEvent<HTMLDivElement>, input: HTMLInputElement | null) {
  const btn = (e.target as Element).closest?.<HTMLElement>('[data-code]')
  const grid = btn?.parentElement
  if (!btn || !grid) return
  if (e.key.length === 1 && e.key !== ' ' && !e.metaKey && !e.ctrlKey && !e.altKey) {
    input?.focus() // keep typing into the search box
    return
  }
  const grids = [...e.currentTarget.querySelectorAll<HTMLElement>('[data-grid]')]
  const g = grids.indexOf(grid)
  const cells = grid.children
  const i = [...cells].indexOf(btn)
  const n = cells.length
  let target: Element | null | undefined
  if (e.key === 'ArrowLeft') target = cells[i - 1] ?? grids[g - 1]?.lastElementChild
  else if (e.key === 'ArrowRight') target = cells[i + 1] ?? grids[g + 1]?.firstElementChild
  else if (e.key === 'ArrowDown') {
    if (i + COLS < n) target = cells[i + COLS]
    else if (Math.floor(i / COLS) < Math.floor((n - 1) / COLS)) target = cells[n - 1]
    else {
      const next = grids[g + 1]?.children
      target = next?.[Math.min(i % COLS, next.length - 1)]
    }
  } else if (e.key === 'ArrowUp') {
    if (i >= COLS) target = cells[i - COLS]
    else {
      const prev = grids[g - 1]?.children
      target = prev ? prev[Math.min(Math.floor((prev.length - 1) / COLS) * COLS + i, prev.length - 1)] : input
    }
  } else return
  e.preventDefault()
  ;(target as HTMLElement | null | undefined)?.focus()
}

export function EmojiPicker({ value, onChange, className }: { value: string; onChange: (code: string) => void; className?: string }) {
  const custom = useCustomEmoji()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [recent, setRecent] = useState<string[]>([])
  const [hovered, setHovered] = useState<string | null>(null)
  const [active, setActive] = useState('')
  const [ready, setReady] = useState(false)
  const deferredQuery = useDeferredValue(query)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const sectionEls = useRef(new Map<string, HTMLElement>())
  const pendingJump = useRef<string | null>(null)

  const customCells = useMemo(
    () =>
      Object.entries(custom)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([name, v]) => customCell(name, v)),
    [custom],
  )

  const browse = useMemo<Section[]>(() => {
    const recentCells = recent.map((code) => cellFor(code, custom)).filter((c): c is Cell => c !== null)
    return [
      ...(recentCells.length ? [{ id: 'recent', name: 'Recently used', icon: <Clock3 className="size-4" />, cells: recentCells }] : []),
      ...(customCells.length ? [{ id: 'custom', name: 'Your workspace', icon: <Sparkles className="size-4" />, cells: customCells }] : []),
      ...STANDARD,
    ]
  }, [recent, custom, customCells])

  const searching = normalize(deferredQuery).tokens.length > 0
  const results = useMemo(() => (searching ? searchCells(deferredQuery, customCells) : []), [searching, deferredQuery, customCells])
  const sections = useMemo<Section[]>(
    () => (searching ? (results.length ? [{ id: 'search', name: 'Search results', icon: null, cells: results }] : []) : browse),
    [searching, results, browse],
  )
  const activeId = browse.some((s) => s.id === active) ? active : browse[0]?.id

  const typed = query.trim().replace(/^:|:$/g, '').toLowerCase()
  const customCode = typed ? `:${typed}:` : ''
  const explicitCode = /^:.+:$/.test(query.trim()) && isEmojiCode(customCode)

  const register = useCallback((id: string, el: HTMLElement | null) => {
    if (el) sectionEls.current.set(id, el)
    else sectionEls.current.delete(id)
  }, [])

  const scrollToSection = (id: string) => {
    const el = sectionEls.current.get(id)
    if (scrollRef.current && el) scrollRef.current.scrollTop = el.offsetTop
  }

  // Mount the full grid right after the first frame so opening stays instant (timer covers hidden tabs, where rAF stalls).
  useEffect(() => {
    if (!open) return
    const go = () => startTransition(() => setReady(true))
    const raf = requestAnimationFrame(go)
    const timer = setTimeout(go, 100)
    return () => {
      cancelAnimationFrame(raf)
      clearTimeout(timer)
    }
  }, [open])

  // Switching between search results and browsing: go to a pending category jump, else back to the top.
  useLayoutEffect(() => {
    const target = !searching && pendingJump.current
    pendingJump.current = null
    if (target) scrollToSection(target)
    else if (scrollRef.current) scrollRef.current.scrollTop = 0
  }, [searching])

  const onOpenChange = (next: boolean) => {
    if (next) {
      setRecent(readRecent())
      setQuery('')
      setHovered(null)
      setActive('')
      setReady(false)
    }
    setOpen(next)
  }

  const pick = (code: string) => {
    onChange(code)
    if (code) saveRecent(code)
    setOpen(false)
    setQuery('')
  }

  const jumpTo = (id: string) => {
    setActive(id)
    if (query) setQuery('')
    if (searching) pendingJump.current = id
    else scrollToSection(id)
  }

  // Scroll events already fire at most once per frame; offsetTop reads are cheap with content-visibility.
  const onScroll = () => {
    if (searching) return
    const top = scrollRef.current?.scrollTop ?? 0
    let id = ''
    for (const s of browse) {
      const el = sectionEls.current.get(s.id)
      if (el && el.offsetTop <= top + 4) id = s.id
    }
    if (id) setActive(id)
  }

  const onSearchKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      const first = scrollRef.current?.querySelector<HTMLElement>('[data-code]')
      if (first) {
        e.preventDefault()
        first.focus()
      }
      return
    }
    if (e.key !== 'Enter') return
    e.preventDefault()
    const hits = searchCells(query, customCells)
    const exact = hits[0]?.names.includes(normalize(query).q)
    if (explicitCode && !exact) pick(customCode)
    else if (hits[0]) pick(hits[0].code)
    else if (isEmojiCode(customCode)) pick(customCode)
  }

  return (
    <Popover modal open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Choose emoji"
          className={cn(
            'flex size-10 shrink-0 items-center justify-center rounded-xl border bg-background text-xl transition-all hover:scale-105 hover:bg-muted active:scale-95',
            className,
          )}
        >
          <Emoji code={value} />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[352px] max-w-[calc(100vw-1rem)] gap-0 p-0" align="start">
        <div className="relative p-2">
          <Search className="pointer-events-none absolute top-1/2 left-4.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            ref={inputRef}
            autoFocus
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setHovered(null)
            }}
            onKeyDown={onSearchKeyDown}
            aria-label="Search emoji"
            placeholder="Search or type :custom_emoji:"
            className="h-9 border-0 bg-muted/60 pl-8 shadow-none focus-visible:ring-0"
          />
        </div>

        <div className="flex items-center gap-0.5 border-b px-1.5 pb-1.5" role="toolbar" aria-label="Emoji categories">
          {browse.map((s) => {
            const on = !searching && s.id === activeId
            return (
              <button
                key={s.id}
                type="button"
                title={s.name}
                aria-label={s.name}
                aria-current={on ? 'true' : undefined}
                onClick={() => jumpTo(s.id)}
                className={cn(
                  'relative flex h-7 min-w-0 flex-1 items-center justify-center rounded-md text-[17px] leading-none transition',
                  on ? 'bg-muted text-foreground' : 'text-muted-foreground opacity-55 grayscale hover:bg-muted/60 hover:opacity-100 hover:grayscale-0',
                )}
              >
                {s.icon}
                {on && <span className="absolute inset-x-2 -bottom-1.5 h-0.5 rounded-full bg-primary" />}
              </button>
            )
          })}
        </div>

        <div
          ref={scrollRef}
          onScroll={onScroll}
          onClick={(e) => {
            const code = cellCode(e.target)
            if (code) pick(code)
          }}
          onMouseOver={(e) => {
            const code = cellCode(e.target)
            if (code) setHovered(code)
          }}
          onFocus={(e) => {
            const code = cellCode(e.target)
            if (code) setHovered(code)
          }}
          onKeyDown={(e) => moveFocus(e, inputRef.current)}
          className="relative h-72 overflow-y-auto overscroll-contain px-2 [scrollbar-width:thin]"
        >
          <EmojiSections sections={sections} value={value} budget={ready || searching ? Infinity : FIRST_PAINT_CELLS} register={register} />
          {searching && !results.length && (
            <div className="px-2 py-10 text-center text-sm text-muted-foreground">
              {isEmojiCode(customCode) ? (
                <>
                  No match. Press Enter to use <code className="rounded bg-muted px-1">{customCode}</code> from your workspace.
                </>
              ) : (
                'No emoji found.'
              )}
            </div>
          )}
        </div>

        <div className="flex h-11 items-center gap-2 border-t px-2">
          {hovered ? (
            <>
              <Emoji code={hovered} className="text-2xl" />
              <span className="min-w-0 truncate font-mono text-xs text-muted-foreground">{hovered}</span>
            </>
          ) : (
            <span className="min-w-0 truncate px-1 text-xs text-muted-foreground">
              {explicitCode ? (
                <>
                  Enter uses <code className="rounded bg-muted px-1">{customCode}</code>
                </>
              ) : (
                'Custom workspace emoji work too'
              )}
            </span>
          )}
          <Button variant="ghost" size="xs" className="ml-auto shrink-0" onClick={() => pick('')}>
            No emoji
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
