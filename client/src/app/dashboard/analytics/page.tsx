'use client'

import { BarChart3, Download, FileText, Search, TrendingUp } from 'lucide-react'
import { DashboardLayout } from '@/shared/components/layout/dashboard-layout'
import { Button } from '@/shared/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { cn } from '@/shared/utils/cn'

export default function AnalyticsPage() {
  const stats = [
    {
      label: 'Total Documents',
      value: '1,234',
      delta: '+12%',
      icon: FileText,
      iconStyle: 'bg-sky-100 text-sky-700',
    },
    {
      label: 'Total Searches',
      value: '5,678',
      delta: '+8%',
      icon: Search,
      iconStyle: 'bg-emerald-100 text-emerald-700',
    },
    {
      label: 'Processing Time',
      value: '2.3s',
      delta: '+0.2s',
      icon: TrendingUp,
      iconStyle: 'bg-amber-100 text-amber-700',
    },
    {
      label: 'Success Rate',
      value: '98.5%',
      delta: '+0.5%',
      icon: BarChart3,
      iconStyle: 'bg-teal-100 text-teal-700',
    },
  ]

  return (
    <DashboardLayout title="Analytics">
      <div className="space-y-6 animate-rise-in">
        <section className="mesh-panel surface-border rounded-3xl p-6 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="font-display text-4xl font-semibold leading-tight">Analytics</h1>
              <p className="mt-2 text-sm text-muted-foreground sm:text-base">
                Monitor usage trends and system performance in one place.
              </p>
            </div>
            <Button variant="outline" className="rounded-full">
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {stats.map((stat) => {
            const Icon = stat.icon

            return (
              <Card key={stat.label} className="surface-border border-white/70 bg-white/82 py-5">
                <CardContent className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                      <p className="mt-1 text-3xl font-semibold tracking-tight">{stat.value}</p>
                    </div>
                    <div className={cn('rounded-2xl p-2.5', stat.iconStyle)}>
                      <Icon className="h-5 w-5" />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    <span className="font-semibold text-foreground">{stat.delta}</span> from last month
                  </p>
                </CardContent>
              </Card>
            )
          })}
        </section>

        <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card className="surface-border border-white/70 bg-white/82">
            <CardHeader>
              <CardTitle className="font-display text-2xl">Document Uploads</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex h-64 items-center justify-center rounded-xl border border-white/70 bg-white/75">
                <p className="text-sm text-muted-foreground">Upload trends chart</p>
              </div>
            </CardContent>
          </Card>

          <Card className="surface-border border-white/70 bg-white/82">
            <CardHeader>
              <CardTitle className="font-display text-2xl">Search Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex h-64 items-center justify-center rounded-xl border border-white/70 bg-white/75">
                <p className="text-sm text-muted-foreground">Search activity chart</p>
              </div>
            </CardContent>
          </Card>
        </section>

        <Card className="surface-border border-white/70 bg-white/82">
          <CardHeader>
            <CardTitle className="font-display text-2xl">System Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex h-52 items-center justify-center rounded-xl border border-white/70 bg-white/75">
              <p className="text-sm text-muted-foreground">Performance metrics dashboard</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
