// Re-export shared auth types for feature-specific use
export type {
  User,
  LoginRequest,
  RegisterRequest,
  AuthResponse,
  RefreshTokenRequest,
  RefreshTokenResponse,
} from '@/shared/types/auth'

// Import User type for local use
import type { User } from '@/shared/types/auth'

// Additional auth-specific types for the feature
export interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
}

export interface LoginFormData {
  email: string
  password: string
}

export interface RegisterFormData {
  email: string
  username: string
  password: string
  confirmPassword: string
  full_name?: string
}

export interface AuthFormErrors {
  email?: string
  username?: string
  password?: string
  confirmPassword?: string
  full_name?: string
  general?: string
}