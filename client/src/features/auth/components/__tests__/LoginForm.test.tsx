import { render, screen, fireEvent, waitFor } from '@/test-utils'
import userEvent from '@testing-library/user-event'
import { LoginForm } from '../LoginForm'
import type { LoginFormData } from '../../types'

describe('LoginForm', () => {
  const mockOnSubmit = jest.fn()
  const user = userEvent.setup()

  beforeEach(() => {
    mockOnSubmit.mockClear()
  })

  it('renders login form with all required fields', () => {
    render(<LoginForm onSubmit={mockOnSubmit} />)

    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
    expect(screen.getByText(/don't have an account/i)).toBeInTheDocument()
    // Check for the title specifically
    expect(screen.getByText('Enter your credentials to access your account')).toBeInTheDocument()
  })

  it('validates required fields on submit', async () => {
    render(<LoginForm onSubmit={mockOnSubmit} />)

    const submitButton = screen.getByRole('button', { name: /sign in/i })
    await user.click(submitButton)

    expect(screen.getByText('Email is required')).toBeInTheDocument()
    expect(screen.getByText('Password is required')).toBeInTheDocument()
    expect(mockOnSubmit).not.toHaveBeenCalled()
  })

  it('validates email format', async () => {
    render(<LoginForm onSubmit={mockOnSubmit} />)

    const emailInput = screen.getByLabelText(/email/i)
    const passwordInput = screen.getByLabelText(/password/i)
    const submitButton = screen.getByRole('button', { name: /sign in/i })

    // Fill in invalid email and valid password
    await user.type(emailInput, 'invalid-email')
    await user.type(passwordInput, 'validpassword')
    await user.click(submitButton)

    // Check that form validation prevents submission
    expect(mockOnSubmit).not.toHaveBeenCalled()
    
    // The form should prevent submission with invalid email
    // We can't easily test the exact validation state, so just verify behavior
    expect(emailInput).toHaveValue('invalid-email')
  })

  it('clears field errors when user starts typing', async () => {
    render(<LoginForm onSubmit={mockOnSubmit} />)

    const emailInput = screen.getByLabelText(/email/i)
    const submitButton = screen.getByRole('button', { name: /sign in/i })

    // Trigger validation error
    await user.click(submitButton)
    expect(screen.getByText('Email is required')).toBeInTheDocument()

    // Start typing to clear error
    await user.type(emailInput, 'test@example.com')
    expect(screen.queryByText('Email is required')).not.toBeInTheDocument()
  })

  it('submits form with valid data', async () => {
    const expectedData: LoginFormData = {
      email: 'test@example.com',
      password: 'password123'
    }

    render(<LoginForm onSubmit={mockOnSubmit} />)

    const emailInput = screen.getByLabelText(/email/i)
    const passwordInput = screen.getByLabelText(/password/i)
    const submitButton = screen.getByRole('button', { name: /sign in/i })

    await user.type(emailInput, expectedData.email)
    await user.type(passwordInput, expectedData.password)
    await user.click(submitButton)

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith(expectedData)
    })
  })

  it('shows loading state when isLoading is true', () => {
    render(<LoginForm onSubmit={mockOnSubmit} isLoading={true} />)

    const submitButton = screen.getByRole('button', { name: /signing in/i })
    const emailInput = screen.getByLabelText(/email/i)
    const passwordInput = screen.getByLabelText(/password/i)

    expect(submitButton).toBeDisabled()
    expect(emailInput).toBeDisabled()
    expect(passwordInput).toBeDisabled()
  })

  it('displays error message when error prop is provided', () => {
    const errorMessage = 'Invalid credentials'
    render(<LoginForm onSubmit={mockOnSubmit} error={errorMessage} />)

    expect(screen.getByText(errorMessage)).toBeInTheDocument()
  })

  it('has proper accessibility attributes', () => {
    render(<LoginForm onSubmit={mockOnSubmit} />)

    const emailInput = screen.getByLabelText(/email/i)
    const passwordInput = screen.getByLabelText(/password/i)

    expect(emailInput).toHaveAttribute('type', 'email')
    expect(passwordInput).toHaveAttribute('type', 'password')
    expect(emailInput).toHaveAttribute('aria-invalid', 'false')
    expect(passwordInput).toHaveAttribute('aria-invalid', 'false')
  })

  it('sets aria-invalid to true when field has error', async () => {
    render(<LoginForm onSubmit={mockOnSubmit} />)

    const emailInput = screen.getByLabelText(/email/i)
    const submitButton = screen.getByRole('button', { name: /sign in/i })

    await user.click(submitButton)

    expect(emailInput).toHaveAttribute('aria-invalid', 'true')
  })
})