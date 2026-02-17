'use client'

import { useMemo, useState } from 'react'
import { Filter, History, Search } from 'lucide-react'
import { DashboardLayout } from '@/shared/components/layout/dashboard-layout'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { SearchInterface } from '@/features/search/components/SearchInterface'
import type { SearchFilters } from '@/features/search/types'

export default function SearchPage() {
  const [isAdvanced, setIsAdvanced] = useState(false)
  const [topK, setTopK] = useState('10')
  const [minScore, setMinScore] = useState('0.55')

  const filters = useMemo<SearchFilters>(
    () => ({
      top_k: Number(topK) || 10,
      min_score: Number(minScore) || 0.55,
    }),
    [topK, minScore]
  )

  return (
    <DashboardLayout title="Search">
      <div className="space-y-6 animate-rise-in">
        <section className="mesh-panel surface-border rounded-3xl p-6 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="font-display text-4xl font-semibold leading-tight">Search Documents</h1>
              <p className="mt-2 text-sm text-muted-foreground sm:text-base">
                Run semantic queries and refine quality with advanced filters.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant={isAdvanced ? 'default' : 'outline'}
                size="sm"
                onClick={() => setIsAdvanced(!isAdvanced)}
                className="rounded-full"
              >
                <Filter className="mr-2 h-4 w-4" />
                Advanced
              </Button>
              <Button variant="outline" size="sm" className="rounded-full">
                <History className="mr-2 h-4 w-4" />
                History
              </Button>
            </div>
          </div>
        </section>

        {isAdvanced && (
          <Card className="surface-border border-white/70 bg-white/82">
            <CardHeader>
              <CardTitle className="font-display text-2xl">Advanced Search Options</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                    Top Results
                  </label>
                  <Input
                    value={topK}
                    onChange={(e) => setTopK(e.target.value)}
                    placeholder="10"
                    className="mt-2 h-10 rounded-xl border-white/65 bg-white/82"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                    Minimum Score
                  </label>
                  <Input
                    value={minScore}
                    onChange={(e) => setMinScore(e.target.value)}
                    placeholder="0.55"
                    className="mt-2 h-10 rounded-xl border-white/65 bg-white/82"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="surface-border border-white/70 bg-white/82">
          <CardContent className="p-5 sm:p-6">
            <SearchInterface className="w-full" filters={filters} />
          </CardContent>
        </Card>

        <div className="surface-border flex min-h-[180px] items-center justify-center rounded-2xl border-white/70 bg-white/75 p-6 text-center">
          <div>
            <Search className="mx-auto mb-4 h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Search results and relevance analytics will appear above after you run a query.
            </p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
