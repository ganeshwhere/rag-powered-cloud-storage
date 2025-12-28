export interface Folder {
  id: string
  user_id: string
  parent_id?: string
  name: string
  path: string
  created_at: string
  updated_at: string
}

export interface FolderCreateRequest {
  name: string
  parent_id?: string
}

export interface FolderUpdateRequest {
  name: string
}

export interface FolderListResponse {
  folders: Folder[]
  total: number
}

export interface FolderContentsResponse {
  folders: Folder[]
  documents: Document[]
}

// Re-export Document type for folder contents
export type { Document } from './document'