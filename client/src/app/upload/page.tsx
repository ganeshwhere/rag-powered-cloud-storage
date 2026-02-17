'use client'

import { UploadDemo } from '@/features/documents/components/upload/UploadDemo'
import { MainLayout } from '@/shared/components/layout/main-layout'
import { ProtectedRoute } from '@/shared/components/ProtectedRoute'

export default function UploadTestPage() {
  return (
    <ProtectedRoute>
      <MainLayout>
        <UploadDemo className="w-full animate-rise-in" />
      </MainLayout>
    </ProtectedRoute>
  )
}
