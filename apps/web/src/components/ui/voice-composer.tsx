"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import {
  AnimatePresence,
  LayoutGroup,
  motion,
  useReducedMotion,
} from "motion/react"
import { ArrowUp, Check, FileText, ImagePlus, Loader2, Mic, Plus, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { useAttachments } from "@/hooks/useAttachments"
import { PendingChips } from "@/components/diary/Attachments"

export interface VoiceComposerProps {
  placeholder?: string
  lang?: string
  /** Return a promise so the composer can wait for the save (and show an error if it fails). */
  onSend?: (message: string, fileIds: string[]) => unknown
  /** Show the + button (photos and files). Turn off where files can't be sent. */
  attachments?: boolean
  className?: string
}

type Recognition = {
  continuous: boolean
  interimResults: boolean
  lang: string
  start(): void
  abort(): void
  onresult: ((e: any) => void) | null
  onend: (() => void) | null
}

/** Rolling dotted line with a live microphone waveform. */
function Wave({
  analyser,
  className,
}: {
  analyser: AnalyserNode | null
  className?: string
}) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    const context = canvas?.getContext("2d")

    if (!canvas || !context) return

    const dpr = window.devicePixelRatio || 1

    const fit = () => {
      canvas.width = canvas.clientWidth * dpr
      canvas.height = canvas.clientHeight * dpr
    }

    fit()

    const resizeObserver = new ResizeObserver(fit)
    resizeObserver.observe(canvas)

    const buffer = new Uint8Array(analyser ? analyser.fftSize : 0)
    const history: number[] = []
    const STEP = 45
    const gap = 5 * dpr

    let last = 0
    let raf = 0

    const frame = (time: number) => {
      if (analyser && time - last >= STEP) {
        last = time
        analyser.getByteTimeDomainData(buffer)

        let sum = 0

        for (const value of buffer) {
          const deviation = (value - 128) / 128
          sum += deviation * deviation
        }

        history.push(Math.min(1, Math.sqrt(sum / buffer.length) * 6))

        if (history.length > 400) history.shift()
      }

      const slide = Math.min(1, (time - last) / STEP) * gap

      context.clearRect(0, 0, canvas.width, canvas.height)
      context.fillStyle = getComputedStyle(canvas).color

      for (let i = 0, x = canvas.width - 2 * dpr - slide; x > 0; i++, x -= gap) {
        const value = history[history.length - 1 - i] ?? 0

        if (value > 0.06) {
          const height = Math.max(5 * dpr, value * canvas.height * 0.9)

          context.globalAlpha = 0.9
          context.beginPath()
          context.roundRect(x - dpr, (canvas.height - height) / 2, 2 * dpr, height, dpr)
          context.fill()
        } else {
          context.globalAlpha = 0.35
          context.beginPath()
          context.arc(x, canvas.height / 2, dpr, 0, Math.PI * 2)
          context.fill()
        }
      }

      raf = requestAnimationFrame(frame)
    }

    raf = requestAnimationFrame(frame)

    return () => {
      cancelAnimationFrame(raf)
      resizeObserver.disconnect()
    }
  }, [analyser])

  return <canvas ref={ref} aria-hidden="true" className={cn("w-full", className)} />
}

const round =
  "grid size-8 shrink-0 place-items-center rounded-full transition-colors duration-200"

const inkButton =
  "bg-ink text-paper hover:opacity-85 active:scale-90 disabled:cursor-not-allowed disabled:opacity-40"

const subtleButton =
  "bg-paper-2 text-ink-soft hover:text-ink"

/* ------------------------------------------------- paper plane flight */

type FlightData = {
  id: number
  text: string
  /** Horizontal centre and top edge of the composer, in viewport pixels. */
  cx: number
  top: number
  width: number
}

type Pt = [number, number]
// SVG matrix(a b c d e f)
type Mat = [number, number, number, number, number, number]
type Piece = { pts: Pt[]; m: Mat; shade: number }

const PW = 180 // letter width
const PH = 240 // letter height
const HAND = '"Caveat Variable", "Kalam", "Segoe Print", cursive'

// Timeline in ms: the letter rises, is folded in two steps, tilts, then flies.
const T = {
  rise: 320, // the letter slides up out of the composer
  fold1: 220, // corners fold in (overlaps the end of the rise)
  fold2: 680, // sides fold in
  tilt: 1020, // plane turns to face its direction
  fly: 1120,
  flyLen: 820,
  end: 2000,
}

// <geometry>
const IDENT: Mat = [1, 0, 0, 1, 0, 0]
const clamp01 = (v: number) => Math.min(1, Math.max(0, v))
const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3)
const easeInOut = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2

const mul = (m: Mat, n: Mat): Mat => [
  m[0] * n[0] + m[2] * n[1],
  m[1] * n[0] + m[3] * n[1],
  m[0] * n[2] + m[2] * n[3],
  m[1] * n[2] + m[3] * n[3],
  m[0] * n[4] + m[2] * n[5] + m[4],
  m[1] * n[4] + m[3] * n[5] + m[5],
]
const apply = (m: Mat, p: Pt): Pt => [
  m[0] * p[0] + m[2] * p[1] + m[4],
  m[1] * p[0] + m[3] * p[1] + m[5],
]

/** Folding along a crease (point c, unit normal n pointing at the moving side). */
const foldMat = (c: Pt, n: Pt, g: number): Mat => {
  const k = 1 - Math.cos(Math.PI * g)
  const d = n[0] * c[0] + n[1] * c[1]
  return [
    1 - k * n[0] * n[0],
    -k * n[0] * n[1],
    -k * n[0] * n[1],
    1 - k * n[1] * n[1],
    k * n[0] * d,
    k * n[1] * d,
  ]
}

const area = (poly: Pt[]) => {
  let a = 0
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i]
    const q = poly[(i + 1) % poly.length]
    a += p[0] * q[1] - q[0] * p[1]
  }
  return Math.abs(a) / 2
}

/** Keep the part of a polygon on one side of the crease. */
const clip = (poly: Pt[], c: Pt, n: Pt, keep: 1 | -1): Pt[] => {
  const out: Pt[] = []
  const side = (p: Pt) => keep * (n[0] * (p[0] - c[0]) + n[1] * (p[1] - c[1]))
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i]
    const b = poly[(i + 1) % poly.length]
    const sa = side(a)
    const sb = side(b)
    if (sa >= 0) out.push(a)
    if (sa >= 0 !== sb >= 0) {
      const t = sa / (sa - sb)
      out.push([a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])])
    }
  }
  return out
}

const foldPieces = (pieces: Piece[], c: Pt, n: Pt, g: number): Piece[] => {
  if (g <= 0) return pieces
  const F = foldMat(c, n, g)
  const still: Piece[] = []
  const moved: Piece[] = []
  for (const p of pieces) {
    const a = clip(p.pts, c, n, 1)
    const b = clip(p.pts, c, n, -1)
    if (area(b) > 0.5) still.push({ ...p, pts: b })
    if (area(a) > 0.5)
      moved.push({
        pts: a.map((q) => apply(F, q)),
        m: mul(F, p.m),
        shade: Math.max(p.shade, Math.sin(Math.PI * g)),
      })
  }
  return [...still, ...moved] // folded layers lie on top
}


const NOSE: Pt = [PW / 2, 0]
const R = Math.SQRT1_2
const S = Math.sin(Math.PI / 8)
const C = Math.cos(Math.PI / 8)

/** The folds of a classic paper plane. Steps 1 and 2 run together, then 3 and 4. */
const foldLetter = (g1: number, g2: number): Piece[] => {
  let pieces: Piece[] = [
    { pts: [[0, 0], [PW, 0], [PW, PH], [0, PH]], m: IDENT, shade: 0 },
  ]
  pieces = foldPieces(pieces, NOSE, [-R, -R], g1)
  pieces = foldPieces(pieces, NOSE, [R, -R], g1)
  pieces = foldPieces(pieces, NOSE, [-C, -S], g2)
  pieces = foldPieces(pieces, NOSE, [C, -S], g2)
  return pieces
}

type Path = [Pt, Pt, Pt, Pt]

const bezier = (p: Path, t: number): Pt => {
  const u = 1 - t
  return [
    u * u * u * p[0][0] + 3 * u * u * t * p[1][0] + 3 * u * t * t * p[2][0] + t * t * t * p[3][0],
    u * u * u * p[0][1] + 3 * u * u * t * p[1][1] + 3 * u * t * t * p[2][1] + t * t * t * p[3][1],
  ]
}

/** Rotation (deg) that points the plane's nose along the path. */
const heading = (p: Path, t: number) => {
  const u = 1 - t
  const dx =
    3 * u * u * (p[1][0] - p[0][0]) + 6 * u * t * (p[2][0] - p[1][0]) + 3 * t * t * (p[3][0] - p[2][0])
  const dy =
    3 * u * u * (p[1][1] - p[0][1]) + 6 * u * t * (p[2][1] - p[1][1]) + 3 * t * t * (p[3][1] - p[2][1])
  return (Math.atan2(dy, dx) * 180) / Math.PI + 90
}
// </geometry>


type Geo = { s: number; fs: number; start: Pt; path: Path; h0: number; vw: number; vh: number }

const makeGeo = (d: FlightData): Geo => {
  const vw = window.innerWidth
  const vh = window.innerHeight
  // Shrink the letter if there is little room above the composer.
  const s = Math.max(0.45, Math.min(1, (d.top - 28) / (PH + 14), (d.width * 0.6) / PW))
  const start: Pt = [d.cx, d.top - 14 - (PH * s) / 2]
  const q = Math.min(1, vw / 820)
  const dir = d.cx > vw * 0.6 ? -1 : 1 // fly towards the middle of the screen
  const path: Path = [
    [start[0], start[1]],
    [start[0] - 20 * q * dir, start[1] - 230 * q],
    [start[0] + 300 * q * dir, start[1] - 380 * q],
    [start[0] + 720 * q * dir, start[1] - 260 * q - 120],
  ]
  return { s, fs: s * 0.5, start, path, h0: heading(path, 0), vw, vh }
}

const pose = (e: number, g: Geo) => {
  const rise = (1 - easeOut(clamp01(e / T.rise))) * (PH * g.s + 14)
  const tt = easeInOut(clamp01((e - T.tilt) / (T.fly - T.tilt)))
  const u = clamp01((e - T.fly) / T.flyLen)
  const ue = 0.3 * u + 0.7 * u * u
  let pos: Pt = [g.start[0], g.start[1] + rise]
  let rot = g.h0 * tt
  if (e >= T.fly) {
    pos = bezier(g.path, ue)
    rot = heading(g.path, ue)
  }
  return {
    pos,
    rot,
    sc: lerp(g.s, g.fs, tt),
    sx: lerp(1, 0.62, tt),
    u,
    opacity: e >= T.fly ? 1 - clamp01((u - 0.8) / 0.2) : 1,
  }
}

const wrap = (text: string, max = 21, maxLines = 12) => {
  const out: string[] = []
  for (const para of text.split("\n")) {
    let line = ""
    for (let word of para.split(/\s+/).filter(Boolean)) {
      while (word.length > max) {
        if (line) {
          out.push(line)
          line = ""
        }
        out.push(word.slice(0, max))
        word = word.slice(max)
      }
      if (!line) line = word
      else if ((line + " " + word).length <= max) line += " " + word
      else {
        out.push(line)
        line = word
      }
    }
    out.push(line)
  }
  if (out.length > maxLines) {
    out.length = maxLines
    out[maxLines - 1] = out[maxLines - 1].slice(0, max - 1) + "…"
  }
  return out
}

const LINE = 16 // spacing of the rules on the letter
const TOP = 34 // first rule

/** What is on the letter: a ruled diary page with a red margin and handwriting. */
function LetterFace({ lines }: { lines: string[] }) {
  const rules = []
  for (let y = TOP; y < PH - 8; y += LINE) rules.push(y)
  return (
    <g>
      {rules.map((y) => (
        <line key={y} x1={0} x2={PW} y1={y} y2={y} style={{ stroke: "var(--rule)" }} strokeWidth={0.8} />
      ))}
      <line x1={27} x2={27} y1={0} y2={PH} style={{ stroke: "var(--margin)" }} strokeWidth={1.1} />
      {lines.map((l, i) => (
        <text
          key={i}
          x={34}
          y={TOP + i * LINE - 3}
          fontSize={15}
          style={{ fill: "var(--ink)", fontFamily: HAND }}
          xmlSpace="preserve"
        >
          {l}
        </text>
      ))}
    </g>
  )
}

/**
 * The sent message is written on a ruled page (same paper as the app) that slides
 * out of the composer, folds into a paper plane and flies off, leaving a dotted
 * rose trail. Drawn as a fixed overlay so nothing can clip it.
 */
function Flight({ data, onDone }: { data: FlightData; onDone: () => void }) {
  const geo = useRef<Geo>(null as unknown as Geo)
  if (!geo.current) geo.current = makeGeo(data)
  const g = geo.current

  const lines = useRef(wrap(data.text)).current
  const [e, setE] = useState(0)
  const trail = useRef<Pt[]>([])

  useEffect(() => {
    let raf = 0
    const t0 = performance.now()
    const tick = (now: number) => {
      const el = now - t0
      const p = pose(el, g)
      if (el >= T.fly && p.u < 1) trail.current.push(p.pos)
      if (p.u >= 1) trail.current.splice(0, 4) // let the trail drain away
      if (trail.current.length > 48) trail.current.shift()
      setE(el)
      if ((el >= T.end && trail.current.length === 0) || el > T.end + 800) {
        onDone()
        return
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const p = pose(e, g)
  const g1 = easeInOut(clamp01((e - T.fold1) / (T.fold2 - T.fold1)))
  const g2 = easeInOut(clamp01((e - T.fold2) / (T.tilt + 100 - T.fold2)))
  const pieces = foldLetter(g1, g2)
  const risingOut = e < T.rise + 40
  const id = `fl${data.id}`
  const trailPts = trail.current
  const trailPath = trailPts.length > 1 ? "M" + trailPts.map((q) => `${q[0].toFixed(1)} ${q[1].toFixed(1)}`).join(" L") : ""

  return (
    <svg
      aria-hidden
      width={g.vw}
      height={g.vh}
      viewBox={`0 0 ${g.vw} ${g.vh}`}
      className="pointer-events-none fixed left-0 top-0 z-[60] overflow-visible"
    >
      <defs>
        <clipPath id={`${id}-rise`}>
          <rect x={0} y={0} width={g.vw} height={data.top} />
        </clipPath>
        <filter id={`${id}-shadow`} x="-40%" y="-40%" width="180%" height="180%">
          <feDropShadow dx={0} dy={5} stdDeviation={6} floodColor="#3c280a" floodOpacity={0.28} />
        </filter>
      </defs>

      {/* dotted rose trail, like a doodle in the margin */}
      {trailPath && (
        <path
          d={trailPath}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2.6}
          strokeDasharray="0.1 8"
          style={{ stroke: "var(--rose)" }}
          opacity={Math.min(0.85, trailPts.length / 20)}
        />
      )}

      {/* the letter / plane. While it rises it is hidden behind the composer. */}
      <g clipPath={risingOut ? `url(#${id}-rise)` : undefined}>
        <g
          opacity={p.opacity}
          filter={`url(#${id}-shadow)`}
          transform={`translate(${p.pos[0]} ${p.pos[1]}) rotate(${p.rot}) scale(${p.sc * p.sx} ${p.sc}) translate(${-PW / 2} ${-PH / 2})`}
        >
          {pieces.map((pc, i) => {
            const pts = pc.pts.map((q) => q.join(",")).join(" ")
            const det = pc.m[0] * pc.m[3] - pc.m[1] * pc.m[2]
            const front = det > 0
            return (
              <g key={i}>
                <clipPath id={`${id}-p${i}`}>
                  <polygon points={pts} />
                </clipPath>
                <polygon
                  points={pts}
                  style={{ fill: front ? "var(--paper)" : "var(--paper-2)", stroke: "var(--edge)" }}
                  strokeWidth={1.2}
                  strokeLinejoin="round"
                />
                {front && (
                  <g clipPath={`url(#${id}-p${i})`}>
                    <g transform={`matrix(${pc.m.join(" ")})`}>
                      <LetterFace lines={lines} />
                    </g>
                  </g>
                )}
                {/* creases get a soft shadow while folding */}
                <polygon points={pts} fill="#3c280a" opacity={pc.shade * 0.16} />
              </g>
            )
          })}
        </g>
      </g>
    </svg>
  )
}

const pill =
  "inline-flex h-8 items-center gap-1.5 rounded-full bg-paper-2 px-3 text-[13px] text-ink-soft transition-colors hover:bg-marigold/40 hover:text-ink"

export default function VoiceComposer({
  placeholder = "Ask anything, or type / for skills",
  lang = "en-US",
  onSend,
  attachments = true,
  className,
}: VoiceComposerProps) {
  const [phase, setPhase] = useState<"idle" | "listening">("idle")

  const [text, setText] = useState("")
  const [heard, setHeard] = useState("")
  const [note, setNote] = useState("")
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [sending, setSending] = useState(false)

  const reduce = useReducedMotion()
  const att = useAttachments()

  // The message that has just been sent and is flying away as a paper plane.
  const [flight, setFlight] = useState<FlightData | null>(null)

  const area = useRef<HTMLTextAreaElement>(null)
  const photoInput = useRef<HTMLInputElement>(null)
  const fileInput = useRef<HTMLInputElement>(null)
  const rec = useRef<Recognition | null>(null)
  const media = useRef<{
    stream: MediaStream
    ctx: AudioContext
  } | null>(null)
  const heardRef = useRef("")
  const cardRef = useRef<HTMLDivElement>(null)

  const stopAudio = useCallback(() => {
    if (rec.current) {
      rec.current.onend = null
      rec.current.abort()
      rec.current = null
    }

    if (media.current) {
      media.current.stream.getTracks().forEach((track) => track.stop())

      media.current.ctx.close().catch(() => {})
      media.current = null
    }

    setAnalyser(null)
  }, [])

  useEffect(() => stopAudio, [stopAudio])

  useEffect(() => {
    const element = area.current

    if (!element) return

    element.style.height = "auto"
    element.style.height = `${element.scrollHeight}px`
  }, [text, phase])

  useEffect(() => {
    if (!note) return

    const timeout = setTimeout(() => setNote(""), 5000)

    return () => clearTimeout(timeout)
  }, [note])

  // Esc closes the little add menu
  useEffect(() => {
    if (!addOpen) return
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setAddOpen(false)
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [addOpen])

  const pick = (list: FileList | File[] | null | undefined) => {
    if (!attachments || !list || !list.length) return
    att.add(list)
    setAddOpen(false)
    requestAnimationFrame(() => area.current?.focus())
  }

  const start = async () => {
    if (phase !== "idle") return

    setNote("")
    setHeard("")
    heardRef.current = ""
    setAddOpen(false)
    setPhase("listening")

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      })

      const ctx = new AudioContext()
      const node = ctx.createAnalyser()

      node.fftSize = 512
      ctx.createMediaStreamSource(stream).connect(node)

      media.current = { stream, ctx }
      setAnalyser(node)
    } catch {
      setPhase("idle")
      setNote("Microphone access is blocked.")
      return
    }

    const SR =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition

    if (SR) {
      const recognition: Recognition = new SR()

      recognition.continuous = true
      recognition.interimResults = true
      recognition.lang = lang

      recognition.onresult = (event) => {
        let transcript = ""

        for (let i = 0; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript
        }

        heardRef.current = transcript.trim()
        setHeard(transcript.trim())
      }

      recognition.onend = () => {
        if (rec.current !== recognition) return

        try {
          recognition.start()
        } catch {}
      }

      try {
        recognition.start()
        rec.current = recognition
      } catch {
        setNote("Could not start voice typing.")
      }
    }
  }

  const cancel = () => {
    stopAudio()
    setPhase("idle")
    setHeard("")
    heardRef.current = ""
  }

  const confirm = () => {
    const said = heardRef.current
    const supported = !!rec.current

    stopAudio()
    setPhase("idle")

    if (said) {
      setText((previous) => (previous ? `${previous.trimEnd()} ${said}` : said))
    } else if (!supported) {
      setNote("Voice typing isn't supported in this browser.")
    }

    requestAnimationFrame(() => area.current?.focus())
  }

  const hasContent = !!text.trim() || att.ids.length > 0
  const canSend = hasContent && !att.busy && !sending

  const send = async () => {
    if (!canSend || phase !== "idle") return

    const value = text.trim()
    const printed = value || att.items.map((i) => i.name).join("\n")

    // Where the composer is, so the letter can rise out of its top edge.
    const box = cardRef.current?.getBoundingClientRect()

    setSending(true)
    setNote("")

    try {
      await onSend?.(value, att.ids)
    } catch (error) {
      // keep everything in the box so nothing is lost
      setNote(error instanceof Error ? error.message : "Couldn't save that one — try again.")
      setSending(false)
      return
    }

    setSending(false)
    setText("")
    att.clear()

    if (box && !reduce) {
      setFlight({
        id: Date.now(),
        text: printed,
        cx: box.left + box.width / 2,
        top: box.top,
        width: box.width,
      })
    }

    requestAnimationFrame(() => area.current?.focus())
  }

  return (
    <div className={cn("mx-auto w-full max-w-xl", className)}>
      <LayoutGroup>
        <motion.div
          ref={cardRef}
          layout
          transition={{
            type: "spring",
            stiffness: 420,
            damping: 36,
          }}
          onDragOver={(event) => {
            if (event.dataTransfer.types.includes("Files")) {
              event.preventDefault()
              setDragging(true)
            }
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault()
            setDragging(false)
            pick(event.dataTransfer.files)
          }}
          className={cn(
            "paper overflow-hidden !rounded-3xl p-3 text-ink transition-shadow",
            dragging && "ring-2 ring-rose/60 ring-offset-2 ring-offset-background",
          )}
        >
          <AnimatePresence mode="wait" initial={false}>
            {phase === "listening" ? (
              <motion.div
                key="listening"
                initial={{
                  opacity: 0,
                  filter: "blur(6px)",
                }}
                animate={{
                  opacity: 1,
                  filter: "blur(0px)",
                }}
                exit={{
                  opacity: 0,
                  filter: "blur(6px)",
                  transition: { duration: 0.12 },
                }}
                className="px-2"
                aria-live="polite"
              >
                <p
                  className={cn(
                    "line-clamp-2 min-h-6 text-[15px]",
                    heard ? "text-ink" : "text-ink-soft",
                  )}
                >
                  {heard || "Listening…"}
                </p>

                <div className="mt-3 flex items-center gap-3">
                  <Wave
                    analyser={analyser}
                    className="h-8 min-w-0 flex-1 text-ink"
                  />

                  <button
                    type="button"
                    onClick={cancel}
                    aria-label="Cancel dictation"
                    className={cn(round, subtleButton)}
                  >
                    <X className="size-4" />
                  </button>

                  <button
                    type="button"
                    onClick={confirm}
                    aria-label="Use dictation"
                    className={cn(round, inkButton)}
                  >
                    <Check className="size-4" />
                  </button>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="idle"
                initial={{
                  opacity: 0,
                  filter: "blur(6px)",
                }}
                animate={{
                  opacity: 1,
                  filter: "blur(0px)",
                }}
                exit={{
                  opacity: 0,
                  filter: "blur(6px)",
                  transition: { duration: 0.12 },
                }}
              >
                <div className="relative">
                  <textarea
                    ref={area}
                    rows={1}
                    value={text}
                    placeholder={placeholder}
                    disabled={sending}
                    onChange={(event) => setText(event.target.value)}
                    onPaste={(event) => {
                      if (event.clipboardData.files.length) {
                        event.preventDefault()
                        pick(event.clipboardData.files)
                      }
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && !event.shiftKey) {
                        event.preventDefault()
                        void send()
                      }
                    }}
                    className="block max-h-40 w-full resize-none bg-transparent px-2 py-1.5 text-[15px] text-ink outline-none placeholder:text-ink-soft"
                  />
                </div>

                <AnimatePresence initial={false}>
                  {att.items.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden px-1"
                    >
                      <PendingChips items={att.items} onRemove={att.remove} className="pt-2" />
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="mt-3 flex items-center gap-2">
                  {attachments && (
                  <button
                    type="button"
                    onClick={() => setAddOpen((open) => !open)}
                    aria-label={addOpen ? "Close add menu" : "Add a photo or file"}
                    aria-expanded={addOpen}
                    className={cn(round, subtleButton)}
                  >
                    <Plus className={cn("size-4 transition-transform duration-200", addOpen && "rotate-45")} />
                  </button>
                  )}

                  <AnimatePresence initial={false}>
                    {addOpen && (
                      <motion.div
                        key="add-menu"
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -8, transition: { duration: 0.1 } }}
                        transition={{ type: "spring", stiffness: 500, damping: 34 }}
                        className="flex items-center gap-1.5"
                      >
                        <button type="button" className={pill} onClick={() => photoInput.current?.click()}>
                          <ImagePlus className="size-3.5" /> Photo
                        </button>
                        <button type="button" className={pill} onClick={() => fileInput.current?.click()}>
                          <FileText className="size-3.5" /> File
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <input
                    ref={photoInput}
                    type="file"
                    accept="image/*"
                    multiple
                    hidden
                    onChange={(event) => {
                      pick(event.target.files)
                      event.target.value = ""
                    }}
                  />
                  <input
                    ref={fileInput}
                    type="file"
                    accept="image/*,application/pdf,text/plain,audio/*,.doc,.docx,.zip"
                    multiple
                    hidden
                    onChange={(event) => {
                      pick(event.target.files)
                      event.target.value = ""
                    }}
                  />

                  <div className="ml-auto flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={start}
                      aria-label="Dictate"
                      className={cn(round, "text-ink-soft hover:bg-paper-2 hover:text-ink")}
                    >
                      <Mic className="size-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => void send()}
                      aria-label="Send"
                      disabled={!canSend}
                      className={cn(round, inkButton)}
                    >
                      {sending || att.busy ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <ArrowUp className="size-4" />
                      )}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </LayoutGroup>

      <p
        role="status"
        className={cn("min-h-5 px-3 pt-1.5 text-xs", note ? "text-destructive" : "text-ink-soft")}
      >
        {note}
      </p>

      {flight &&
        createPortal(
          <Flight
            key={flight.id}
            data={flight}
            onDone={() =>
              setFlight((f) => (f?.id === flight.id ? null : f))
            }
          />,
          document.body,
        )}
    </div>
  )
}
