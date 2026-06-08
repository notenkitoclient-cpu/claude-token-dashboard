"use client"

import { useState } from "react"
import ClaudeMdModal from "@/components/ClaudeMdModal"

export default function ClaudeMdButton({ project }: { project: string }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-sm rounded-md border border-border px-3 py-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors self-start"
      >
        CLAUDE.md
      </button>
      {open && <ClaudeMdModal project={project} onClose={() => setOpen(false)} />}
    </>
  )
}
