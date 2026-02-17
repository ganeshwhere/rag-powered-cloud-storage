'use client'

import { useState, type ReactNode } from 'react'
import { BookOpen, ExternalLink, Mail, MessageCircle, Search } from 'lucide-react'
import { DashboardLayout } from '@/shared/components/layout/dashboard-layout'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'

export default function HelpPage() {
  const [searchQuery, setSearchQuery] = useState('')

  const helpCategories = [
    {
      title: 'Getting Started',
      description: 'Learn the basics of using the document RAG system.',
      articles: [
        'How to upload your first document',
        'Understanding document processing',
        'Basic search techniques',
        'Organizing documents with folders',
      ],
    },
    {
      title: 'Advanced Features',
      description: 'Explore advanced functionality and customization.',
      articles: ['Advanced search operators', 'Batch document processing', 'API integration guide', 'Custom metadata fields'],
    },
    {
      title: 'Troubleshooting',
      description: 'Common issues and practical fixes.',
      articles: ['Document upload failures', 'Search not returning results', 'Performance optimization', 'Error code reference'],
    },
  ]

  const faqs = [
    {
      question: 'What file formats are supported?',
      answer: 'We support PDF, DOCX, TXT, and many other common document formats.',
    },
    {
      question: 'How long does document processing take?',
      answer: 'Most documents are processed within 1-5 minutes depending on size and complexity.',
    },
    {
      question: 'Is my data secure?',
      answer: 'Yes, all documents are encrypted and stored securely with enterprise-grade safeguards.',
    },
    {
      question: 'Can I integrate with external systems?',
      answer: 'Yes, REST APIs are available for integration with existing workflows.',
    },
  ]

  return (
    <DashboardLayout title="Help & Support">
      <div className="space-y-6 animate-rise-in">
        <section className="mesh-panel surface-border rounded-3xl p-6 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="font-display text-4xl font-semibold leading-tight">Help & Support</h1>
              <p className="mt-2 text-sm text-muted-foreground sm:text-base">
                Find answers, guides, and direct support channels.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" className="rounded-full">
                <Mail className="mr-2 h-4 w-4" />
                Contact Support
              </Button>
              <Button className="rounded-full">
                <MessageCircle className="mr-2 h-4 w-4" />
                Live Chat
              </Button>
            </div>
          </div>
        </section>

        <Card className="surface-border border-white/70 bg-white/82">
          <CardContent className="p-5 sm:p-6">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search help articles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-10 rounded-xl border-white/65 bg-white/82 pl-10"
              />
            </div>
          </CardContent>
        </Card>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <SupportCard
            icon={<BookOpen className="h-8 w-8 text-sky-600" />}
            title="Documentation"
            description="Comprehensive guides and API reference."
            action="View Docs"
          />
          <SupportCard
            icon={<MessageCircle className="h-8 w-8 text-emerald-600" />}
            title="Community Forum"
            description="Connect with users and share implementation tips."
            action="Join Forum"
          />
          <SupportCard
            icon={<Mail className="h-8 w-8 text-amber-600" />}
            title="Email Support"
            description="Get direct support from our team."
            action="Send Email"
          />
        </section>

        <section>
          <h2 className="mb-4 font-display text-2xl font-semibold">Browse by Category</h2>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {helpCategories.map((category) => (
              <Card key={category.title} className="surface-border border-white/70 bg-white/82">
                <CardHeader>
                  <CardTitle className="font-display text-xl">{category.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="mb-4 text-sm text-muted-foreground">{category.description}</p>
                  <ul className="space-y-2">
                    {category.articles.map((article) => (
                      <li key={article}>
                        <button className="text-left text-sm font-medium text-primary hover:underline">{article}</button>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section>
          <h2 className="mb-4 font-display text-2xl font-semibold">Frequently Asked Questions</h2>
          <div className="space-y-4">
            {faqs.map((faq) => (
              <Card key={faq.question} className="surface-border border-white/70 bg-white/82">
                <CardContent className="p-5">
                  <h3 className="text-base font-semibold">{faq.question}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{faq.answer}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      </div>
    </DashboardLayout>
  )
}

function SupportCard({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode
  title: string
  description: string
  action: string
}) {
  return (
    <Card className="surface-border border-white/70 bg-white/82 transition-all hover:-translate-y-0.5 hover:shadow-lg">
      <CardContent className="p-6">
        <div className="mb-4">{icon}</div>
        <h3 className="text-base font-semibold">{title}</h3>
        <p className="mt-2 text-sm text-muted-foreground">{description}</p>
        <Button variant="outline" size="sm" className="mt-4 rounded-full">
          {action}
          <ExternalLink className="ml-1 h-3 w-3" />
        </Button>
      </CardContent>
    </Card>
  )
}
