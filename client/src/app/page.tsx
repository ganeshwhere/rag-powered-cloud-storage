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
import { Upload, Search, FolderOpen } from "lucide-react";

export default function Home() {
  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4">RAG Document System</h1>
          <p className="text-lg text-muted-foreground">
            AI-powered document management and intelligent search
          </p>
        </div>

        {/* Search Bar */}
        <div className="mb-8">
          <div className="flex gap-2 max-w-2xl mx-auto">
            <Input 
              placeholder="Search your documents..." 
              className="flex-1"
            />
            <Button>
              <Search className="w-4 h-4" />
              Search
            </Button>
          </div>
        </div>

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
              <Button className="w-full">Upload</Button>
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
              <Button variant="outline" className="w-full">Search</Button>
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
              <Button variant="secondary" className="w-full">Browse</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}