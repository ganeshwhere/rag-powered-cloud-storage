// Re-export shared folder types for feature-specific use
export type {
  Folder,
  FolderCreateRequest,
  FolderUpdateRequest,
  FolderListResponse,
} from '@/shared/types/folder'

// Import Folder type for use in interfaces
import type { Folder } from '@/shared/types/folder'

// Folder tree structure for hierarchical display
export interface FolderTreeNode {
  id: string
  name: string
  path: string
  parent_id?: string
  children: FolderTreeNode[]
  document_count?: number
  created_at: string
  updated_at: string
}

// Folder breadcrumb item
export interface FolderBreadcrumb {
  id: string
  name: string
  path: string
}

// Folder selection state
export interface FolderSelection {
  selectedFolderId?: string
  selectedFolderPath?: string
  breadcrumbs: FolderBreadcrumb[]
}

// Folder operation types
export type FolderOperation = 'create' | 'rename' | 'delete' | 'move'

// Folder dialog state
export interface FolderDialogState {
  isOpen: boolean
  operation: FolderOperation
  folder?: Folder
  parentId?: string
}

// Folder validation
export interface FolderValidation {
  isValid: boolean
  errors: string[]
}

// Folder constants
export const FOLDER_CONSTRAINTS = {
  MAX_NAME_LENGTH: 255,
  MAX_DEPTH: 10,
  RESERVED_NAMES: ['CON', 'PRN', 'AUX', 'NUL', 'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9', 'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9'],
  INVALID_CHARS: ['/', '\\', ':', '*', '?', '"', '<', '>', '|'],
} as const

// Folder validation helper
export const validateFolderName = (name: string): FolderValidation => {
  const errors: string[] = []

  if (!name.trim()) {
    errors.push('Folder name is required')
  }

  if (name.length > FOLDER_CONSTRAINTS.MAX_NAME_LENGTH) {
    errors.push(`Folder name must be less than ${FOLDER_CONSTRAINTS.MAX_NAME_LENGTH} characters`)
  }

  if (FOLDER_CONSTRAINTS.RESERVED_NAMES.includes(name.toUpperCase() as any)) {
    errors.push('This folder name is reserved and cannot be used')
  }

  const hasInvalidChars = FOLDER_CONSTRAINTS.INVALID_CHARS.some(char => name.includes(char))
  if (hasInvalidChars) {
    errors.push(`Folder name cannot contain: ${FOLDER_CONSTRAINTS.INVALID_CHARS.join(' ')}`)
  }

  if (name.startsWith('.') || name.endsWith('.')) {
    errors.push('Folder name cannot start or end with a period')
  }

  if (name.trim() !== name) {
    errors.push('Folder name cannot start or end with spaces')
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}