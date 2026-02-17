'use client'

import Link from 'next/link'
import {
  ArrowRight,
  FolderOpen,
  LogIn,
  Search,
  Sparkles,
  Upload,
  UserPlus,
} from 'lucide-react'
import { MainLayout } from '@/shared/components/layout/main-layout'
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui'
import { useAuth } from '@/features/auth/context'
import { SearchInterface } from '@/features/search/components/SearchInterface'
import { APP_CONFIG } from '@/shared/lib/config'

const featureCards = [
  {
    title: 'Upload Documents',
    description: 'Import PDFs, notes, and reports, then process them for semantic search.',
    icon: Upload,
    href: '/upload',
    cta: 'Upload Now',
    variant: 'default' as const,
  },
  {
    title: 'Search Instantly',
    description: 'Ask natural language questions and get grounded answers with source context.',
    icon: Search,
    href: '/search',
    cta: 'Start Searching',
    variant: 'outline' as const,
  },
  {
    title: 'Manage Library',
    description: 'Organize documents by folder and keep your knowledge base easy to navigate.',
    icon: FolderOpen,
    href: '/documents',
    cta: 'Open Library',
    variant: 'secondary' as const,
  },
]

export default function Home() {
  const { isAuthenticated, user, logout } = useAuth()

  const appName = APP_CONFIG.name ?? 'Document RAG'
  const appTagline = APP_CONFIG.tagline ?? 'Fast, accurate answers across your document library.'

  return (
    <MainLayout>
      <div className="space-y-8 animate-rise-in">
        <section className="mesh-panel surface-border rounded-3xl p-6 sm:p-8 lg:p-10">
          <div className="mb-7 flex flex-col gap-4 rounded-2xl border border-white/70 bg-white/75 p-4 backdrop-blur sm:flex-row sm:items-center sm:justify-between">
            {isAuthenticated ? (
              <>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <span>
                    Signed in as{' '}
                    <span className="font-semibold text-foreground">{user?.full_name || user?.username}</span>
                  </span>
                </div>
                <Button variant="outline" size="sm" onClick={() => logout()}>
                  Logout
                </Button>
              </>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">Sign in to upload, organize, and search your documents.</p>
                <div className="flex flex-wrap items-center gap-2">
                  <Button variant="outline" size="sm" asChild>
                    <Link href="/auth/login">
                      <LogIn className="mr-2 h-4 w-4" />
                      Login
                    </Link>
                  </Button>
                  <Button size="sm" asChild>
                    <Link href="/auth/register">
                      <UserPlus className="mr-2 h-4 w-4" />
                      Sign Up
                    </Link>
                  </Button>
                </div>
              </>
            )}
          </div>

          <div className="space-y-3">
            <p className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-primary">
              AI-Powered Workspace
            </p>
            <h1 className="font-display text-4xl font-semibold leading-tight text-foreground sm:text-5xl">
              {appName}
            </h1>
            <p className="max-w-2xl text-base text-muted-foreground sm:text-lg">{appTagline}</p>
          </div>

          {isAuthenticated ? (
            <div className="mt-8 rounded-2xl border border-white/65 bg-white/85 p-5 shadow-lg shadow-primary/5">
              <p className="mb-4 text-sm font-medium text-muted-foreground">Start with a quick search</p>
              <SearchInterface className="w-full" />
            </div>
          ) : (
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button asChild>
                <Link href="/auth/register">
                  Create Account
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/auth/login">Sign In</Link>
              </Button>
            </div>
          )}
        </section>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {featureCards.map((feature) => {
            const Icon = feature.icon

            return (
              <Card
                key={feature.title}
                className="surface-border group gap-4 border-white/65 bg-white/82 py-5 transition-all hover:-translate-y-1 hover:shadow-xl"
              >
                <CardHeader className="gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/12 text-primary transition-colors group-hover:bg-primary/16">
                    <Icon className="h-5 w-5" />
                  </div>
                  <CardTitle className="font-display text-xl">{feature.title}</CardTitle>
                  <CardDescription className="text-sm leading-relaxed">{feature.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  {isAuthenticated ? (
                    <Button variant={feature.variant} className="w-full" asChild>
                      <Link href={feature.href}>{feature.cta}</Link>
                    </Button>
                  ) : (
                    <Button variant={feature.variant} className="w-full" disabled>
                      {feature.cta}
                    </Button>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </section>
      </div>
    </MainLayout>
  )
}
