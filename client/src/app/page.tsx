'use client'

import Link from 'next/link'
import { MainLayout } from "@/shared/components/layout/main-layout";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle,
  Button,
  Input
} from "@/shared/components/ui";
import { Upload, Search, FolderOpen, LogIn, UserPlus } from "lucide-react";
import { useAuth } from '@/features/auth/context'
import { SearchInterface } from '@/features/search/components/SearchInterface'
import { APP_CONFIG } from "@/shared/lib/config";

export default function Home() {
  const { isAuthenticated, user, logout } = useAuth()
  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto">
        {/* Auth Status Bar */}
        <div className="flex justify-between items-center mb-8 p-4 bg-gray-50 rounded-lg">
          {isAuthenticated ? (
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">
                Welcome back, <span className="font-medium">{user?.full_name || user?.username}</span>
              </span>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => logout()}
              >
                Logout
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">
                Sign in to access your documents
              </span>
              <div className="flex gap-2">
                <Link href="/auth/login">
                  <Button variant="outline" size="sm">
                    <LogIn className="w-4 h-4 mr-2" />
                    Login
                  </Button>
                </Link>
                <Link href="/auth/register">
                  <Button size="sm">
                    <UserPlus className="w-4 h-4 mr-2" />
                    Sign Up
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </div>

        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4">{APP_CONFIG.name}</h1>
          <p className="text-lg text-muted-foreground">
            {APP_CONFIG.tagline}
          </p>
        </div>

        {/* Search Bar */}
        {isAuthenticated && (
          <div className="mb-8">
            <SearchInterface className="max-w-2xl mx-auto" />
          </div>
        )}

        {/* Main Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <Upload className="w-8 h-8 text-primary mb-2" />
              <CardTitle>Upload Documents</CardTitle>
              <CardDescription>
                Upload and process your documents
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isAuthenticated ? (
                <Link href="/upload-test">
                  <Button className="w-full">
                    Upload
                  </Button>
                </Link>
              ) : (
                <Button 
                  className="w-full" 
                  disabled
                >
                  Upload
                </Button>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Search className="w-8 h-8 text-primary mb-2" />
              <CardTitle>Search</CardTitle>
              <CardDescription>
                Find information using natural language
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isAuthenticated ? (
                <Link href="/search">
                  <Button 
                    variant="outline" 
                    className="w-full"
                  >
                    Search
                  </Button>
                </Link>
              ) : (
                <Button 
                  variant="outline" 
                  className="w-full"
                  disabled
                >
                  Search
                </Button>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <FolderOpen className="w-8 h-8 text-primary mb-2" />
              <CardTitle>My Documents</CardTitle>
              <CardDescription>
                Browse and organize your files
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isAuthenticated ? (
                <Link href="/documents">
                  <Button 
                    variant="secondary" 
                    className="w-full"
                  >
                    Browse
                  </Button>
                </Link>
              ) : (
                <Button 
                  variant="secondary" 
                  className="w-full"
                  disabled
                >
                  Browse
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}