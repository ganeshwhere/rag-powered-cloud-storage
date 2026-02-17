"use client"

import React, { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { FileText, Home, Menu, Search, Upload, X } from "lucide-react"
import { Button } from "@/shared/components/ui/button"
import { SkipNav } from "@/shared/components/ui/skip-nav"
import { APP_CONFIG } from "@/shared/lib/config"
import { cn } from "@/shared/utils/cn"

interface MainLayoutProps {
  children: React.ReactNode
}

export function MainLayout({ children }: MainLayoutProps) {
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const navigation = [
    { name: "Home", href: "/", icon: Home },
    { name: "Documents", href: "/documents", icon: FileText },
    { name: "Search", href: "/search", icon: Search },
    { name: "Upload", href: "/upload", icon: Upload },
  ]

  const appName = APP_CONFIG.name ?? "Doc RAG"

  useEffect(() => {
    setMobileMenuOpen(false)
  }, [pathname])

  return (
    <div className="relative min-h-screen">
      <SkipNav />

      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/75 backdrop-blur-xl" role="banner">
        <div className="app-page-width flex items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="group rounded-full pr-3 focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <span className="font-display text-base font-semibold tracking-tight text-foreground sm:text-lg">
              {appName}
            </span>
          </Link>

          <Button
            variant="outline"
            size="icon-sm"
            className="h-9 w-9 rounded-full md:hidden"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-menu"
            aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
          >
            {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </Button>

          <nav
            id="navigation"
            className="-mx-2 hidden flex-1 items-center justify-end gap-1 overflow-x-auto px-2 md:flex"
            role="navigation"
            aria-label="Main navigation"
          >
            {navigation.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href

              return (
                <Button
                  key={item.name}
                  variant={isActive ? "default" : "ghost"}
                  size="sm"
                  className={cn(
                    "rounded-full px-3 shadow-sm",
                    !isActive && "text-muted-foreground hover:bg-white/75 hover:text-foreground"
                  )}
                  asChild
                >
                  <Link
                    href={item.href}
                    className="flex items-center gap-1.5"
                    aria-current={isActive ? "page" : undefined}
                  >
                    <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>{item.name}</span>
                  </Link>
                </Button>
              )
            })}
          </nav>
        </div>

        {mobileMenuOpen && (
          <div id="mobile-menu" className="app-page-width px-4 pb-3 sm:px-6 md:hidden lg:px-8">
            <nav className="grid gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm" aria-label="Mobile navigation">
              {navigation.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href

                return (
                  <Button
                    key={item.name}
                    variant={isActive ? "default" : "ghost"}
                    size="sm"
                    className={cn(
                      "h-10 w-full justify-start rounded-xl px-3",
                      !isActive && "text-muted-foreground hover:bg-slate-100 hover:text-foreground"
                    )}
                    asChild
                  >
                    <Link href={item.href} className="flex items-center gap-2" aria-current={isActive ? "page" : undefined}>
                      <Icon className="h-4 w-4" aria-hidden="true" />
                      <span>{item.name}</span>
                    </Link>
                  </Button>
                )
              })}
            </nav>
          </div>
        )}
      </header>

      <main id="main-content" className="app-page-width px-4 py-8 sm:px-6 lg:px-8" role="main">
        {children}
      </main>
    </div>
  )
}
