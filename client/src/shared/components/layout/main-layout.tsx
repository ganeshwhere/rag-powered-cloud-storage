"use client"

import React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Search, FileText, FolderOpen, Upload } from "lucide-react"
import { Button } from "@/shared/components/ui/button"
import { SkipNav } from "@/shared/components/ui/skip-nav"

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
      <SkipNav />
      
      <header className="border-b" role="banner">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link 
              href="/" 
              className="text-2xl font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded"
            >
              RAGPCS
            </Link>
            
            <nav 
              id="navigation" 
              className="flex items-center space-x-4" 
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
                    asChild
                  >
                    <Link 
                      href={item.href} 
                      className="flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded"
                      aria-current={isActive ? 'page' : undefined}
                    >
                      <Icon className="h-4 w-4" aria-hidden="true" />
                      {item.name}
                    </Link>
                  </Button>
                )
              })}
            </nav>
          </div>
        </div>
      </header>
      
      <main 
        id="main-content" 
        className="container mx-auto px-4 py-8 sm:px-6 lg:px-8" 
        role="main"
      >
        {children}
      </main>
    </div>
  )
}