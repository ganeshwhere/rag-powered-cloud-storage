'use client'

import { useState } from 'react'
import { Bell, Database, Save, Shield, User } from 'lucide-react'
import { DashboardLayout } from '@/shared/components/layout/dashboard-layout'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Separator } from '@/shared/components/ui/separator'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { cn } from '@/shared/utils/cn'

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('general')

  const tabs = [
    { id: 'general', label: 'General', icon: User },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'storage', label: 'Storage', icon: Database },
  ]

  return (
    <DashboardLayout title="Settings">
      <div className="space-y-6 animate-rise-in">
        <section className="mesh-panel surface-border rounded-3xl p-6 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="font-display text-4xl font-semibold leading-tight">Settings</h1>
              <p className="mt-2 text-sm text-muted-foreground sm:text-base">
                Manage your profile, security, notifications, and storage preferences.
              </p>
            </div>
            <Button className="rounded-full">
              <Save className="mr-2 h-4 w-4" />
              Save Changes
            </Button>
          </div>
        </section>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[220px_1fr]">
          <Card className="surface-border border-white/70 bg-white/82">
            <CardContent className="p-3">
              <nav className="space-y-1">
                {tabs.map((tab) => {
                  const Icon = tab.icon
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={cn(
                        'flex w-full items-center rounded-xl px-3 py-2 text-sm font-medium transition-colors',
                        activeTab === tab.id
                          ? 'bg-primary text-primary-foreground'
                          : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                      )}
                    >
                      <Icon className="mr-3 h-4 w-4" />
                      {tab.label}
                    </button>
                  )
                })}
              </nav>
            </CardContent>
          </Card>

          <Card className="surface-border border-white/70 bg-white/82">
            <CardContent className="p-6">{renderTabContent(activeTab)}</CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}

function renderTabContent(activeTab: string) {
  if (activeTab === 'general') {
    return (
      <div className="space-y-6">
        <div>
          <h3 className="font-display text-2xl font-semibold">Profile Information</h3>
          <p className="text-sm text-muted-foreground">Update your personal information.</p>
        </div>
        <Separator />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="Full Name" placeholder="Enter your full name" />
          <Field label="Email" placeholder="Enter your email" type="email" />
          <Field label="Organization" placeholder="Enter your organization" />
          <Field label="Role" placeholder="Enter your role" />
        </div>
      </div>
    )
  }

  if (activeTab === 'notifications') {
    return (
      <div className="space-y-6">
        <div>
          <h3 className="font-display text-2xl font-semibold">Notification Preferences</h3>
          <p className="text-sm text-muted-foreground">Choose what notifications you want to receive.</p>
        </div>
        <Separator />
        <div className="space-y-4">
          <ToggleRow title="Email Notifications" description="Receive notifications via email" defaultChecked />
          <ToggleRow title="Document Processing" description="Notify when documents are processed" defaultChecked />
          <ToggleRow title="System Updates" description="Notify about system updates" />
        </div>
      </div>
    )
  }

  if (activeTab === 'security') {
    return (
      <div className="space-y-6">
        <div>
          <h3 className="font-display text-2xl font-semibold">Security Settings</h3>
          <p className="text-sm text-muted-foreground">Manage your account security.</p>
        </div>
        <Separator />
        <div className="space-y-4">
          <Field label="Current Password" placeholder="Enter current password" type="password" />
          <Field label="New Password" placeholder="Enter new password" type="password" />
          <Field label="Confirm Password" placeholder="Confirm new password" type="password" />
          <Button variant="outline" className="rounded-full">
            Update Password
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-display text-2xl font-semibold">Storage Management</h3>
        <p className="text-sm text-muted-foreground">Monitor and manage your storage usage.</p>
      </div>
      <Separator />
      <div className="space-y-4">
        <div className="rounded-xl border border-white/70 bg-white/75 p-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-medium">Storage Used</span>
            <span className="text-sm text-muted-foreground">2.4 GB / 10 GB</span>
          </div>
          <div className="h-2 rounded-full bg-muted">
            <div className="h-2 rounded-full bg-primary" style={{ width: '24%' }} />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <StorageMetric title="Documents" value="1,234" subtitle="1.8 GB" />
          <StorageMetric title="Processed Data" value="5,678" subtitle="0.6 GB" />
        </div>
      </div>
    </div>
  )
}

function Field({ label, placeholder, type = 'text' }: { label: string; placeholder: string; type?: string }) {
  return (
    <div>
      <label className="text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">{label}</label>
      <Input type={type} placeholder={placeholder} className="mt-2 h-10 rounded-xl border-white/65 bg-white/82" />
    </div>
  )
}

function ToggleRow({
  title,
  description,
  defaultChecked = false,
}: {
  title: string
  description: string
  defaultChecked?: boolean
}) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-white/70 bg-white/75 p-3">
      <div>
        <p className="font-medium">{title}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <input type="checkbox" className="h-4 w-4 rounded accent-primary" defaultChecked={defaultChecked} />
    </div>
  )
}

function StorageMetric({ title, value, subtitle }: { title: string; value: string; subtitle: string }) {
  return (
    <div className="rounded-xl border border-white/70 bg-white/75 p-4">
      <p className="text-sm font-medium">{title}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
      <p className="text-xs text-muted-foreground">{subtitle}</p>
    </div>
  )
}
