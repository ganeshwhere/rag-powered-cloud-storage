import Link from 'next/link'
import {
  ArrowRight,
  CheckCircle,
  Clock,
  FileText,
  Search,
  TrendingUp,
  Upload,
  AlertCircle,
} from 'lucide-react'
import { DashboardLayout } from '@/shared/components/layout/dashboard-layout'
import { Button } from '@/shared/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { cn } from '@/shared/utils/cn'

export default function Page() {
  const stats = [
    {
      title: 'Total Documents',
      value: '1,234',
      change: '+12%',
      trendLabel: 'from last month',
      icon: FileText,
      color: 'text-sky-600',
      chip: 'bg-sky-100 text-sky-700',
    },
    {
      title: 'Searches Today',
      value: '89',
      change: '+23%',
      trendLabel: 'from yesterday',
      icon: Search,
      color: 'text-teal-600',
      chip: 'bg-teal-100 text-teal-700',
    },
    {
      title: 'Processing Queue',
      value: '5',
      change: '-2',
      trendLabel: 'pending jobs',
      icon: Clock,
      color: 'text-amber-600',
      chip: 'bg-amber-100 text-amber-700',
    },
    {
      title: 'Success Rate',
      value: '98.5%',
      change: '+0.5%',
      trendLabel: 'quality score',
      icon: CheckCircle,
      color: 'text-emerald-600',
      chip: 'bg-emerald-100 text-emerald-700',
    },
  ]

  const recentActivity = [
    {
      action: 'Document uploaded',
      detail: 'quarterly-report.pdf',
      time: '2 minutes ago',
      status: 'completed',
    },
    {
      action: 'Search performed',
      detail: '"financial analysis"',
      time: '5 minutes ago',
      status: 'completed',
    },
    {
      action: 'Document processing',
      detail: 'meeting-notes.docx',
      time: '8 minutes ago',
      status: 'processing',
    },
    {
      action: 'Folder created',
      detail: 'Q4 Reports',
      time: '15 minutes ago',
      status: 'completed',
    },
  ]

  const quickActions = [
    {
      title: 'Upload Documents',
      description: 'Add files and start vector processing.',
      icon: Upload,
      href: '/dashboard/documents?upload=true',
      color: 'from-sky-500 to-cyan-500',
    },
    {
      title: 'Search Documents',
      description: 'Find answers with semantic retrieval.',
      icon: Search,
      href: '/dashboard/search',
      color: 'from-teal-500 to-emerald-500',
    },
    {
      title: 'View Analytics',
      description: 'Track usage, latency, and quality.',
      icon: TrendingUp,
      href: '/dashboard/analytics',
      color: 'from-orange-400 to-amber-500',
    },
  ]

  return (
    <DashboardLayout title="Dashboard">
      <div className="space-y-6 animate-rise-in">
        <Card className="surface-border mesh-panel gap-4 border-white/70 py-6">
          <CardHeader className="gap-2">
            <CardTitle className="font-display text-3xl">Welcome back</CardTitle>
            <p className="max-w-2xl text-sm text-muted-foreground sm:text-base">
              Monitor document ingestion, search activity, and system health from one place.
            </p>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center gap-3">
            <Button asChild>
              <Link href="/dashboard/documents?upload=true">Upload Document</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/dashboard/search">Run Search</Link>
            </Button>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {stats.map((stat) => {
            const Icon = stat.icon
            return (
              <Card key={stat.title} className="surface-border border-white/65 bg-white/82 py-5">
                <CardContent className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                      <p className="mt-1 text-3xl font-semibold tracking-tight">{stat.value}</p>
                    </div>
                    <div className={cn('rounded-2xl p-2.5', stat.chip)}>
                      <Icon className={cn('h-5 w-5', stat.color)} />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    <span className="font-semibold text-foreground">{stat.change}</span> {stat.trendLabel}
                  </p>
                </CardContent>
              </Card>
            )
          })}
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Card className="surface-border border-white/70 bg-white/82 lg:col-span-1">
            <CardHeader>
              <CardTitle className="font-display text-xl">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {quickActions.map((action) => {
                const Icon = action.icon
                return (
                  <Link key={action.title} href={action.href}>
                    <div className="group flex items-center gap-3 rounded-xl border border-white/70 bg-white/75 p-3 transition-all hover:-translate-y-0.5 hover:shadow-md">
                      <div className={cn('rounded-lg bg-gradient-to-r p-2.5 text-white shadow-sm', action.color)}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold">{action.title}</p>
                        <p className="truncate text-xs text-muted-foreground">{action.description}</p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-foreground" />
                    </div>
                  </Link>
                )
              })}
            </CardContent>
          </Card>

          <Card className="surface-border border-white/70 bg-white/82 lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="font-display text-xl">Recent Activity</CardTitle>
              <Button variant="outline" size="sm" asChild>
                <Link href="/dashboard/analytics">View All</Link>
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentActivity.map((activity) => (
                  <div
                    key={`${activity.action}-${activity.time}`}
                    className="flex items-center gap-3 rounded-xl border border-white/65 bg-white/75 p-3"
                  >
                    <span
                      className={cn(
                        'h-2.5 w-2.5 rounded-full',
                        activity.status === 'completed' ? 'bg-emerald-500' : 'bg-amber-500'
                      )}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {activity.action} <span className="text-muted-foreground">• {activity.detail}</span>
                      </p>
                      <p className="text-xs text-muted-foreground">{activity.time}</p>
                    </div>
                    {activity.status === 'processing' && (
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-amber-400 border-b-transparent" />
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="surface-border border-white/70 bg-white/82">
          <CardHeader>
            <CardTitle className="font-display text-xl">System Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="rounded-xl border border-white/70 bg-white/75 p-4">
                <div className="mb-2 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-emerald-600" />
                  <p className="text-sm font-semibold">Document Processing</p>
                </div>
                <p className="text-xs text-muted-foreground">All workers online and handling queue normally.</p>
              </div>
              <div className="rounded-xl border border-white/70 bg-white/75 p-4">
                <div className="mb-2 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-emerald-600" />
                  <p className="text-sm font-semibold">Search Engine</p>
                </div>
                <p className="text-xs text-muted-foreground">Latency stable and retrieval quality remains high.</p>
              </div>
              <div className="rounded-xl border border-white/70 bg-white/75 p-4">
                <div className="mb-2 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                  <p className="text-sm font-semibold">Storage</p>
                </div>
                <p className="text-xs text-muted-foreground">75% used. Plan a cleanup before peak uploads.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
