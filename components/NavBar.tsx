"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

const NAV_ITEMS = [
  { href: "/",             label: "Dashboard"    },
  { href: "/activity",     label: "Activity"     },
  { href: "/security",     label: "Security"     },
  { href: "/intelligence", label: "Intelligence" },
]

export default function NavBar() {
  const pathname = usePathname()

  return (
    <nav className="border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-40">
      <div className="mx-auto max-w-screen-xl px-4 flex items-center gap-1 h-10">
        {NAV_ITEMS.map(({ href, label }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={`px-3 py-1 rounded-md text-sm transition-colors ${
                active
                  ? "bg-primary/10 text-foreground font-medium"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
            >
              {label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
