"use client"

import React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Search, FileText, FolderOpen, Upload } from "lucide-react"
import { Button } from "@/shared/components/ui/button"

interface MainLayoutProps {
  children: React.ReactNode
}

export function MainLayout({ children }: MainLayoutProps) {
  const pathname = usePathname()

  const navigation = [
    { name: 'Documents', href: '/documents', icon: FileText },
    { name: 'Search', href: '/search', icon: Search },
    { name: 'Upload', href: '/upload-test', icon: Upload },
  ]

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="text-2xl font-bold">
              RAGPCS
            </Link>
            
            <nav className="flex items-center space-x-4">
              {navigation.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href
                
                return (
                  <Button
                    key={item.name}
                    variant={isActive ? "default" : "ghost"}
                    size="sm"
                    asChild
                  >
                    <Link href={item.href} className="flex items-center gap-2">
                      <Icon className="h-4 w-4" />
                      {item.name}
                    </Link>
                  </Button>
                )
              })}
            </nav>
          </div>
        </div>
      </header>
      <main className="container mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  )
}