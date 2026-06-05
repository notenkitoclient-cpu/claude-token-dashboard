"use client"

import { useEffect, useRef, useState } from "react"

interface Metadata {
  content: string
  filePath: string
  bytes: number
  tokens: number
}

interface Props {
  project: string
  onClose: () => void
}

function fmtBytes(n: number): string {
  if (n >= 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${n} B`
}

export default function ClaudeMdModal({ project, onClose }: Props) {
  const [meta, setMeta]       = useState<Metadata | null>(null)
  const [draft, setDraft]     = useState("")
  const [error, setError]     = useState<string | null>(null)
  const [saving, setSaving]   = useState(false)
  const [saved, setSaved]     = useState(false)
  const textareaRef           = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    fetch(`/api/claude-md?project=${encodeURIComponent(project)}`)
      .then(r => r.json())
      .then((data: Metadata & { error?: string }) => {
        if (data.error) { setError(data.error); return }
        setMeta(data)
        setDraft(data.content)
      })
      .catch(e => setError(String(e)))
  }, [project])

  useEffect(() => {
    if (meta) textareaRef.current?.focus()
  }, [meta])

  const isDirty = meta !== null && draft !== meta.content
  const draftBytes = new TextEncoder().encode(draft).length
  const draftTokens = Math.ceil(draftBytes / 4)

  async function handleSave() {
    if (!isDirty) return
    const ok = window.confirm(
      `Save changes to CLAUDE.md?\n\n${meta!.filePath}\n\nThis will overwrite the file on disk.`
    )
    if (!ok) return

    setSaving(true)
    try {
      const res = await fetch(`/api/claude-md?project=${encodeURIComponent(project)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: draft }),
      })
      const data = await res.json() as { ok?: boolean; error?: string; bytes?: number }
      if (!data.ok) { setError(data.error ?? "Save failed"); return }
      setMeta(prev => prev ? { ...prev, content: draft, bytes: data.bytes ?? prev.bytes, tokens: Math.ceil((data.bytes ?? prev.bytes) / 4) } : prev)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (e) {
      setError(String(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="flex flex-col w-full max-w-2xl max-h-[90vh] rounded-xl border border-border bg-card shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between px-5 py-4 border-b border-border shrink-0">
          <div>
            <h2 className="text-sm font-semibold">CLAUDE.md — {project}</h2>
            {meta && (
              <p className="mt-0.5 text-xs text-muted-foreground font-mono truncate max-w-sm" title={meta.filePath}>
                {meta.filePath}
              </p>
            )}
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-lg leading-none ml-4 shrink-0">✕</button>
        </div>

        {/* Warning banner */}
        <div className="flex items-start gap-2 px-5 py-2.5 bg-amber-950/30 border-b border-amber-500/20 text-xs text-amber-400 shrink-0">
          <span>⚠</span>
          <span>This file is re-sent every turn — keep it concise. Large files increase latency and cost.</span>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col px-5 py-4 gap-3 min-h-0">
          {error ? (
            <div className="rounded-lg border border-red-500/30 bg-red-950/20 p-3 text-sm text-red-400">{error}</div>
          ) : !meta ? (
            <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">Loading…</div>
          ) : (
            <>
              {/* Metadata */}
              <div className="flex items-center gap-4 text-xs text-muted-foreground shrink-0">
                <span>Size: <span className={`font-mono font-medium ${draftBytes >= 5120 ? "text-orange-400" : "text-foreground"}`}>{fmtBytes(draftBytes)}</span></span>
                <span>~Tokens: <span className="font-mono font-medium text-foreground">{draftTokens.toLocaleString()}</span></span>
                {isDirty && <span className="text-amber-400">● unsaved changes</span>}
              </div>

              {/* Textarea */}
              <textarea
                ref={textareaRef}
                value={draft}
                onChange={e => setDraft(e.target.value)}
                className="flex-1 min-h-0 w-full resize-none rounded-lg border border-border bg-muted/20 p-3 font-mono text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                spellCheck={false}
              />
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-border shrink-0">
          <button
            onClick={onClose}
            className="rounded-lg border border-border px-4 py-1.5 text-xs font-medium hover:bg-muted/50 transition-colors"
          >
            Close
          </button>
          <button
            onClick={handleSave}
            disabled={!isDirty || saving}
            className="rounded-lg bg-primary px-4 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-40 hover:bg-primary/90 transition-colors"
          >
            {saving ? "Saving…" : saved ? "✓ Saved" : "Save"}
          </button>
        </div>
      </div>
    </div>
  )
}
